import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Title from '#models/title.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new title (admin only).',
        params: z.object({
          organizationId: z.string(),
        }),
        body: z.object({
          id: z.string(),
          name: z.string(),
        }),
        response: {
          [StatusCodes.CREATED]: Title.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { organizationId } = request.params;
      const data = request.body;
      const { id: userId } = request.user;

      // Verify organization exists
      const organization = await fastify.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Organization not found.' });
      }

      const title = await fastify.prisma.title.create({
        data: {
          ...data,
          organizationId,
          createdById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(new Title(title));
    });
}
