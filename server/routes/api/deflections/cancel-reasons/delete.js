import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a deflection cancel reason (admin only).',
        params: z.object({
          id: z.string(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const reason = await fastify.prisma.deflectionCancelReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection cancel reason not found' });
      }

      await fastify.prisma.deflectionCancelReason.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
