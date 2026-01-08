import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Organization from '#models/organization.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update an organization (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: Organization.UpdateSchema,
        response: {
          [StatusCodes.OK]: Organization.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const organization = await fastify.prisma.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Organization not found' });
      }

      const updated = await fastify.prisma.organization.update({
        where: { id },
        data,
      });

      return reply.send(updated);
    });
}
