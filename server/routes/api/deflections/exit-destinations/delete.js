import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a deflection exit destination (admin only).',
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

      const destination = await fastify.prisma.deflectionExitDestination.findUnique({
        where: { id },
      });

      if (!destination) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit destination not found' });
      }

      await fastify.prisma.deflectionExitDestination.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
