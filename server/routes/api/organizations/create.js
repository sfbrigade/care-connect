import { StatusCodes } from 'http-status-codes';

import Organization from '#models/organization.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new organization (admin only).',
        body: Organization.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Organization.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id } = request.user;

      const organization = await fastify.prisma.organization.create({
        data: {
          ...data,
          createdById: id,
        },
      });

      return reply.code(StatusCodes.CREATED).send(organization);
    });
}
