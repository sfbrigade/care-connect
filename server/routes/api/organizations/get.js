import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Organization from '#models/organization.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single organization details',
        params: z.object({
          id: z.string(),
        }),
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

      const organization = await fastify.prisma.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Organization not found.' });
      }

      return reply.send(organization);
    });
}
