import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete a facility status reason (admin only).',
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

      const reason = await fastify.prisma.facilityStatusReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility status reason not found' });
      }

      await fastify.prisma.facilityStatusReason.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
