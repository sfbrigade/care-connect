import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { notFoundError } from '#lib/httpErrors.js';

export default async function (fastify) {
  fastify.post('/left',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Mark the officer as having left this facility. Clears currentOfficerId on their arrived holds and records a FacilityCheckIn DEPARTURE event.',
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

      await fastify.prisma.$transaction(async (tx) => {
        const facility = await fastify.prisma.facility.findByIdForUpdate(tx, facilityId);
        if (!facility) {
          throw notFoundError(`Facility ${facilityId} not found`);
        }
        const now = new Date();

        // Clear currentOfficerId on this officer's currently-arrived holds.
        // The facility lock serializes us against concurrent close; the WHERE
        // is re-evaluated per row at commit time, so holds whose state changed
        // under us (cancel / transfer / release) are filtered out automatically.
        await tx.deflection.updateMany({
          where: {
            facilityId,
            currentOfficerId: officerId,
            status: 'ACTIVE',
            arrivedAt: { not: null },
          },
          data: { currentOfficerId: null },
        });

        // Record the facility check-in event (for reporting)
        await tx.facilityCheckIn.create({
          data: {
            userId: officerId,
            facilityId,
            timestamp: now,
            eventType: 'DEPARTURE',
          },
        });
      });

      return reply.send({ ok: true });
    });
}
