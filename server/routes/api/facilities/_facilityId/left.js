import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

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
        await fastify.prisma.facility.findByIdForUpdate(tx, facilityId);
        const now = new Date();

        // Snapshot the officer's still-eligible arrived holds under the facility lock.
        const eligibleHoldIds = (await tx.deflection.findMany({
          where: {
            facilityId,
            currentOfficerId: officerId,
            status: 'ACTIVE',
            arrivedAt: { not: null },
          },
          select: { id: true },
        })).map((hold) => hold.id);

        // Clear currentOfficerId only for holds that are still eligible at commit time.
        await tx.deflection.updateMany({
          where: {
            id: { in: eligibleHoldIds },
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
