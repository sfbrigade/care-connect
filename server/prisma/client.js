import { Prisma, PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

import Deflection from '#models/deflection.js';
import { PII_FIELDS } from '#models/subject.js';
import User from '#models/user.js';

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
        await prisma.user.findOrCreateBatchUser();
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
    subject: {
      async anonymize (now = new Date()) {
        const hours = parseFloat(process.env.ANONYMIZE_CUTOFF_HOURS) || 72;
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const eligible = await prisma.$queryRaw`
          SELECT s."id"
          FROM "Subject" s
          WHERE s."anonymizedAt" IS NULL
            AND EXISTS (
              SELECT 1 FROM "Deflection" d WHERE d."subjectId" = s."id"
            )
            AND NOT EXISTS (
              SELECT 1 FROM "Deflection" d
              WHERE d."subjectId" = s."id"
                AND d."status" = 'ACTIVE'::"HoldStatusEnum"
            )
            AND (
              SELECT MAX(d."updatedAt")
              FROM "Deflection" d
              WHERE d."subjectId" = s."id"
            ) <= ${cutoff}
        `;
        if (eligible.length === 0) return;
        const ids = eligible.map((row) => row.id);
        const nulledPii = Object.fromEntries(PII_FIELDS.map((field) => [field, null]));
        await prisma.subject.updateMany({
          where: { id: { in: ids } },
          data: { ...nulledPii, anonymizedAt: now },
        });
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
