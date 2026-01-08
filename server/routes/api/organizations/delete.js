import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Delete an organization (admin only).',
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

      // Check if organization exists
      const organization = await fastify.prisma.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        return reply.code(StatusCodes.NOT_FOUND).send({
          error: 'Organization not found.',
        });
      }

      // Delete the organization
      await fastify.prisma.organization.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
