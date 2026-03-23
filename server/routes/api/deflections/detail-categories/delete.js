import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a detail category (admin only).',
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

      const { id: userId } = request.user;
      const reason = await fastify.prisma.deflectionDetailCategory.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Detail category not found' });
      }

      await fastify.prisma.deflectionDetailCategory.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        }
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
