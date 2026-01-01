import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Cancel a bed hold.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const userId = request.user.id;

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold can cancel it
      if (hold.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only cancel your own holds' });
      }

      if (hold.status === 'CANCELLED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold is already cancelled' });
      }

      const now = new Date();

      // Update hold status
      await fastify.prisma.bedHold.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledById: userId,
        },
      });

      // Note: Holds do NOT affect reservedBeds - they only reduce available beds
      // reservedBeds represents beds actually reserved for admissions, not temporary holds

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
