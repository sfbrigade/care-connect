import { StatusCodes } from 'http-status-codes';

import DeflectionExitDestination from '#models/deflectionExitDestination.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new deflection exit destination (admin only).',
        body: DeflectionExitDestination.CreateSchema,
        response: {
          [StatusCodes.CREATED]: DeflectionExitDestination.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;

      const destination = await fastify.prisma.deflectionExitDestination.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(destination);
    });
}
