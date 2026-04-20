import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify) {
  fastify.patch('/reopen/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Reopens a deflection detail category',
        params: z.object({
          id: z.string()
        }),
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const updated = await fastify.prisma.DeflectionDetailCategory.update({
        where: { id },
        data: {
          deletedById: null,
          deletedAt: null
        },
      });
      if (!updated) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection detail category not found' });
      }

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
