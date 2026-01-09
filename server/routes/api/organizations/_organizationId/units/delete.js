import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a unit (admin only).',
        params: z.object({
          organizationId: z.string(),
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
      const { organizationId, id } = request.params;

      try {
        await fastify.prisma.unit.delete({
          where: {
            unitId: {
              id,
              organizationId,
            },
          },
        });

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (error.code === 'P2025') {
          return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Unit not found.' });
        }
        throw error;
      }
    });
}
