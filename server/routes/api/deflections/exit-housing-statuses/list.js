import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitHousingStatus from '#models/deflectionExitHousingStatus.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflection exit housing statuses.',
        response: {
          [StatusCodes.OK]: z.array(DeflectionExitHousingStatus.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const records = await fastify.prisma.deflectionExitHousingStatus.findMany({
        orderBy: { name: 'asc' },
      });

      return reply.send(records);
    });
}
