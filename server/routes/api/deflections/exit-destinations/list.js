import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitDestination from '#models/deflectionExitDestination.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflection exit destinations.',
        response: {
          [StatusCodes.OK]: z.array(DeflectionExitDestination.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const records = await fastify.prisma.deflectionExitDestination.findMany({
        orderBy: { name: 'asc' },
      });

      return reply.send(records);
    });
}
