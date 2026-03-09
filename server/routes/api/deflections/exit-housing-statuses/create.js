import { StatusCodes } from 'http-status-codes';

import DeflectionExitHousingStatus from '#models/deflectionExitHousingStatus.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new deflection exit housing status (admin only).',
        body: DeflectionExitHousingStatus.CreateSchema,
        response: {
          [StatusCodes.CREATED]: DeflectionExitHousingStatus.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;

      const status = await fastify.prisma.deflectionExitHousingStatus.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(status);
    });
}
