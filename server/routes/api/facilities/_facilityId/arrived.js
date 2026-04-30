import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { notFoundError } from '#lib/httpErrors.js';

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
              arrivedAt: true,
              subjectStatus: true,
            },
          });

          if (candidateHolds.length === 0) {
            throw badRequestError('No active holds to mark as arrived');
          }

          const holdIds = [];
          const holdsNeedingArrivalUpdate = [];

          for (const hold of candidateHolds.sort((a, b) => a.id - b.id)) {
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
