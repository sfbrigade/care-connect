import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a deflection exit housing status (admin only).',
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

      const status = await fastify.prisma.deflectionExitHousingStatus.findUnique({
        where: { id },
      });

      if (!status) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit housing status not found' });
      }

      await fastify.prisma.deflectionExitHousingStatus.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
