import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitDestination from '#models/deflectionExitDestination.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get a deflection exit destination by ID.',
        params: z.object({
          id: z.string(),
        }),
        response: {
          [StatusCodes.OK]: DeflectionExitDestination.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const destination = await fastify.prisma.deflectionExitDestination.findUnique({
        where: { id },
      });

      if (!destination) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit destination not found' });
      }

      return reply.send(destination);
    });
}
