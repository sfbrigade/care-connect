import { Prisma, PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

function getIncidentAutoCloseThresholdMinutes () {
  const defaultMinutes = 30;

  if (process.env.NODE_ENV === 'production') {
    return defaultMinutes;
  }

  const override = Number.parseInt(process.env.DEV_INCIDENT_AUTO_CLOSE_MINUTES ?? '', 10);
  return Number.isFinite(override) && override >= 0 ? override : defaultMinutes;
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
}).$extends({
  name: 'paginate',
  model: {
    bedType: {
      async findByIdForUpdate (tx, id) {
        let result;
        if (Array.isArray(id)) {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ANY(${id}::uuid[]) FOR UPDATE`;
          return result;
        } else {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ${id}::uuid FOR UPDATE`;
          return result.length > 0 ? result[0] : null;
        }
      }
    },
    deflection: {
      async expire (now = new Date()) {
        try {
          await prisma.user.findOrCreateBatchUser();
        } catch {
          // noop- can throw error if multiple processes calling at the same time
        }
        const bedTypeIds = (await prisma.deflection.findMany({
          distinct: ['bedTypeId'],
          select: {
            bedTypeId: true,
          },
          where: {
            status: Deflection.HoldStatus.ACTIVE,
            subjectStatus: Deflection.SubjectStatus.DETAINED,
            expiresAt: {
              lte: now,
            },
          },
        })).map((deflection) => deflection.bedTypeId);
        return Promise.all(bedTypeIds.map((bedTypeId) => {
          return prisma.$transaction(async (tx) => {
            const bedType = await tx.bedType.findByIdForUpdate(tx, bedTypeId);
            const deflections = await tx.deflection.findMany({
              where: {
                bedTypeId,
                status: Deflection.HoldStatus.ACTIVE,
                subjectStatus: Deflection.SubjectStatus.DETAINED,
                expiresAt: {
                  lte: now,
                },
              },
            });
            const deflectionUpdates = deflections.map((deflection) => ({
              deflectionId: deflection.id,
              status: Deflection.HoldStatus.EXPIRED,
              updatedById: User.BATCH_USER_ID,
              updatedAt: now,
            }));
            await tx.deflectionUpdate.createMany({
              data: deflectionUpdates,
            });
            await tx.deflection.updateMany({
              where: {
                id: {
                  in: deflections.map((deflection) => deflection.id),
                },
              },
              data: {
                status: Deflection.HoldStatus.EXPIRED,
                updatedAt: now,
              },
            });

            // If the incident has no more active deflections, and the user has not arrived, mark it as completed
            const incidentIds = [...new Set(deflections.map((deflection) => deflection.incidentId))];
            for (const incidentId of incidentIds) {
              // prisma does not support lte on enums, so we use a raw query
              const [{ activeDeflections }] = await tx.$queryRaw`SELECT COUNT(*) as "activeDeflections" FROM "Deflection" WHERE "incidentId" = ${incidentId} AND "status" = ${Deflection.HoldStatus.ACTIVE}::"HoldStatusEnum" AND "subjectStatus" <= ${Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER}::"SubjectStatusEnum"`;
              // if the user has not arrived yet, close the incident if there no more deflections
              if (activeDeflections === BigInt(0)) {
                await tx.incident.updateMany({
                  where: {
                    id: incidentId,
                    arrivedAt: null
                  },
                  data: {
                    completedAt: now,
                    updatedById: User.BATCH_USER_ID,
                    updatedAt: now,
                  },
                });
              }
            }

            // Auto-expired deflections are always DETAINED (in transit)
            const bedTypeUpdate = await tx.bedTypeUpdate.create({
              data: {
                bedTypeId: bedType.id,
                facilityId: bedType.facilityId,
                capacity: bedType.capacity,
                unavailableUnoccupied: bedType.unavailableUnoccupied,
                unavailableOccupied: bedType.unavailableOccupied,
                occupied: bedType.occupied,
                holds: bedType.holds - deflections.length,
                inTransit: Math.max(0, bedType.inTransit - deflections.length),
                available: bedType.available + deflections.length,
                updateMethod: 'API',
                updatedById: User.BATCH_USER_ID,
              },
            });
            await tx.bedType.update({
              where: {
                id: bedType.id,
              },
              data: {
                capacity: bedTypeUpdate.capacity,
                unavailableUnoccupied: bedTypeUpdate.unavailableUnoccupied,
                unavailableOccupied: bedTypeUpdate.unavailableOccupied,
                occupied: bedTypeUpdate.occupied,
                holds: bedTypeUpdate.holds,
                inTransit: bedTypeUpdate.inTransit,
                available: bedTypeUpdate.available,
                updateMethod: bedTypeUpdate.updateMethod,
                updatedById: bedTypeUpdate.updatedById,
              },
            });
          });
        }));
      }
    },
    incident: {
      async autoCloseAfterFinalHold (now = new Date()) {
        await prisma.user.findOrCreateBatchUser();

        const thresholdMinutes = getIncidentAutoCloseThresholdMinutes();
        const cutoffTime = new Date(now.getTime() - (thresholdMinutes * 60 * 1000));
        const candidateIncidents = await prisma.incident.findMany({
          where: {
            arrivedAt: { not: null },
            leftAt: null,
            completedAt: null,
            deflections: {
              some: {
                OR: [
                  { transferredAt: { lte: cutoffTime } },
                  { cancelledAt: { lte: cutoffTime } },
                ],
              },
            },
          },
          select: {
            id: true,
            facilityId: true,
          },
        });

        return Promise.all(candidateIncidents.map(({ id, facilityId }) => prisma.$transaction(async (tx) => {
          const lockedIncidents = await tx.$queryRaw`
            SELECT "id", "facilityId", "leftAt", "completedAt"
            FROM "Incident"
            WHERE "id" = ${id} AND "facilityId" = ${facilityId}::uuid
            FOR UPDATE
          `;
          const incident = lockedIncidents[0];

          if (!incident || incident.leftAt || incident.completedAt) {
            return null;
          }

          const remainingActiveHolds = await tx.deflection.count({
            where: {
              incidentId: id,
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: { in: [Deflection.SubjectStatus.DETAINED, Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER] },
            },
          });

          if (remainingActiveHolds > 0) {
            return null;
          }

          const deflections = await tx.deflection.findMany({
            where: { incidentId: id },
            select: {
              transferredAt: true,
              cancelledAt: true,
            },
          });

          let lastTransferredAt = null;
          let lastCancelledAt = null;
          for (const deflection of deflections) {
            if (deflection.transferredAt && (!lastTransferredAt || deflection.transferredAt > lastTransferredAt)) {
              lastTransferredAt = deflection.transferredAt;
            }
            if (deflection.cancelledAt && (!lastCancelledAt || deflection.cancelledAt > lastCancelledAt)) {
              lastCancelledAt = deflection.cancelledAt;
            }
          }

          const lastFinalizedAt = [lastTransferredAt, lastCancelledAt]
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime())[0];

          if (!lastFinalizedAt || lastFinalizedAt > cutoffTime) {
            return null;
          }

          // Prefer the final hold's custody-transfer time for "I've left".
          // If the final transition was a cancellation with no transfer timestamp,
          // fall back to that cancellation time so the incident can still close.
          const leftAt = lastTransferredAt && (!lastCancelledAt || lastTransferredAt >= lastCancelledAt)
            ? lastTransferredAt
            : lastCancelledAt;

          await tx.incidentOfficer.updateMany({
            where: {
              incidentId: id,
              facilityId,
              leftAt: null,
            },
            data: { leftAt },
          });

          await tx.incident.update({
            where: { id },
            data: {
              leftAt,
              completedAt: now,
              updatedAt: now,
              updatedById: User.BATCH_USER_ID,
            },
          });

          return { id, facilityId, leftAt };
        })));
      }
    },
    user: {
      async findOrCreateBatchUser () {
        let data = await prisma.user.findUnique({
          where: { id: User.BATCH_USER_ID },
        });
        if (!data) {
          data = {
            id: User.BATCH_USER_ID,
            firstName: 'Batch',
            lastName: 'User',
            email: 'batch.user@careconnectsf.org',
            isAdmin: false,
          };
          const user = new User(data);
          await user.setPassword(uuid());
          data = await prisma.user.create({
            data,
          });
        }
        return data;
      }
    },
    $allModels: {
      async paginate ({ page, perPage, include, ...options }) {
        const take = parseInt(perPage, 10);
        const skip = (parseInt(page, 10) - 1) * take;
        const context = Prisma.getExtensionContext(this);
        const total = await context.count(options);
        const records = await context.findMany({
          ...options,
          include,
          skip,
          take
        });
        return { records, total };
      }
    }
  }
});

export default prisma;
