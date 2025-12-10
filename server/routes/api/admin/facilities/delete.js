import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Delete a facility (admin only).',
        params: z.object({
          id: z.string().uuid(),
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

      // Check if facility exists
      const facility = await fastify.prisma.facility.findUnique({
        where: { id },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({
          error: 'Facility not found.',
        });
      }

      // Delete the facility
      await fastify.prisma.facility.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
