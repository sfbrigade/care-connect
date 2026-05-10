import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { notFoundError } from '#lib/httpErrors.js';
import { isIncidentDetailsComplete, isDeflectionDetailsComplete } from '#lib/incidentPermissions.js';

const PRE_TRANSFER_STATUSES = ['DETAINED', 'ONSITE_AWAITING_TRANSFER'];

function badRequestError (message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.BAD_REQUEST;
  return error;
}

export default async function (fastify) {
  fastify.post('/arrived',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Mark the officer as arrived at this facility. Sets arrivedAt on their active holds and records a FacilityCheckIn ARRIVAL event.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({ ok: z.boolean() }),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;
      const officerId = request.user.id;

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const facility = await fastify.prisma.facility.findByIdForUpdate(tx, facilityId);
          if (!facility) {
            throw notFoundError(`Facility ${facilityId} not found`);
          }
          const now = new Date();
          let transitionedFromDetainedCount = 0;

          // Snapshot candidate pre-transfer holds for this officer under the facility lock.
          const candidateHolds = await tx.deflection.findMany({
            where: {
              facilityId,
              currentOfficerId: officerId,
              status: 'ACTIVE',
              subjectStatus: { in: PRE_TRANSFER_STATUSES },
            },
            select: {
              id: true,
              bedTypeId: true,
              arrivedAt: true,
              subjectStatus: true,
              incident: true,
              subject: true,
              narcoticsSubstance: true,
              narcoticsParaphernalia: true,
              drugUseEvidence: true,
              drugType: true,
              behavior: true,
              behaviorNarrative: true,
              chargeType: true,
              property: true,
              certifiedAt: true,
            },
          });

          if (candidateHolds.length === 0) {
            throw badRequestError('No active holds to mark as arrived');
          }

          const holdIds = [];
          const holdsNeedingArrivalUpdate = [];

          for (const hold of candidateHolds.sort((a, b) => a.id - b.id)) {
            if (!isIncidentDetailsComplete(hold.incident) || !isDeflectionDetailsComplete(hold)) {
              throw badRequestError('Required details must be complete before arrival');
            }

            const updated = await tx.deflection.updateMany({
              where: {
                id: hold.id,
                facilityId,
                currentOfficerId: officerId,
                status: 'ACTIVE',
                subjectStatus: hold.subjectStatus,
                arrivedAt: hold.arrivedAt,
              },
              data: {
                arrivedAt: hold.arrivedAt ?? now,
                subjectStatus: 'ONSITE_AWAITING_TRANSFER',
              },
            });

            if (updated.count === 1) {
              holdIds.push(hold.id);
              if (hold.subjectStatus === 'DETAINED') {
                transitionedFromDetainedCount++;
              }
              if (hold.subjectStatus !== 'ONSITE_AWAITING_TRANSFER' || hold.arrivedAt === null) {
                holdsNeedingArrivalUpdate.push(hold);
              }
            }
          }

          if (holdIds.length === 0) {
            throw badRequestError('No active holds to mark as arrived');
          }

          if (holdsNeedingArrivalUpdate.length > 0) {
            await tx.deflectionUpdate.createMany({
              data: holdsNeedingArrivalUpdate.map(({ id: deflectionId }) => ({
                deflectionId,
                subjectStatus: 'ONSITE_AWAITING_TRANSFER',
                updatedById: officerId,
                updatedAt: now,
              })),
            });
          }

          if (transitionedFromDetainedCount > 0) {
            const decrementCounts = new Map();

            for (const hold of candidateHolds) {
              if (holdIds.includes(hold.id) && hold.subjectStatus === 'DETAINED') {
                const current = decrementCounts.get(hold.bedTypeId) ?? 0;
                decrementCounts.set(hold.bedTypeId, current + 1);
              }
            }

            for (const [bedTypeId, decrementCount] of decrementCounts) {
              const bedType = await tx.bedType.findByIdForUpdate(tx, bedTypeId);
              if (!bedType) continue;

              const updatedData = {
                capacity: bedType.capacity,
                unavailableUnoccupied: bedType.unavailableUnoccupied,
                unavailableOccupied: bedType.unavailableOccupied,
                occupied: bedType.occupied,
                holds: bedType.holds,
                inTransit: Math.max(0, bedType.inTransit - decrementCount),
                available: bedType.available,
                updateMethod: 'API',
                updatedById: officerId,
              };

              await tx.bedTypeUpdate.create({
                data: {
                  ...updatedData,
                  bedTypeId,
                  facilityId,
                },
              });
              await tx.bedType.update({
                where: { id: bedTypeId },
                data: updatedData,
              });
            }
          }

          // Record the facility check-in event for the holds that were still eligible at commit time.
          await tx.facilityCheckIn.create({
            data: {
              userId: officerId,
              facilityId,
              timestamp: now,
              eventType: 'ARRIVAL',
              arrivedWithDeflectionIds: holdIds,
            },
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.BAD_REQUEST) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: error.message });
        }
        throw error;
      }

      return reply.send({ ok: true });
    });
}
