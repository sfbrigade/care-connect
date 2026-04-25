import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const PRE_TRANSFER_STATUSES = ['DETAINED', 'ONSITE_AWAITING_TRANSFER'];

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

      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();

        // Find all active pre-transfer holds this officer controls at this facility
        const holds = await tx.deflection.findMany({
          where: {
            facilityId,
            currentOfficerId: officerId,
            status: 'ACTIVE',
            subjectStatus: { in: PRE_TRANSFER_STATUSES },
          },
          select: { id: true },
        });

        if (holds.length === 0) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'No active holds to mark as arrived' });
        }

        const holdIds = holds.map(h => h.id);

        // Set arrivedAt on all these holds
        await tx.deflection.updateMany({
          where: { id: { in: holdIds } },
          data: { arrivedAt: now, subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
        });

        // Create audit trail entries
        await tx.deflectionUpdate.createMany({
          data: holdIds.map(deflectionId => ({
            deflectionId,
            subjectStatus: 'ONSITE_AWAITING_TRANSFER',
            updatedById: officerId,
          })),
        });

        // Record the facility check-in event
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

      return reply.send({ ok: true });
    });
}
