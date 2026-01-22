import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionCancelReason from '#models/deflectionCancelReason.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflection cancel reasons.',
        response: {
          [StatusCodes.OK]: z.array(DeflectionCancelReason.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const records = await fastify.prisma.deflectionCancelReason.findMany({
        orderBy: { name: 'asc' },
      });

      return reply.send(records);
    });
}
