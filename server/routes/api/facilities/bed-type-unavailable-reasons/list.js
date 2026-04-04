import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedTypeUnavailableReason from '#models/bedTypeUnavailableReason.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all bed type unavailable reasons.',
        response: {
          [StatusCodes.OK]: z.array(BedTypeUnavailableReason.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const reasons = await fastify.prisma.bedTypeUnavailableReason.findMany({
        orderBy: { description: 'asc' },
      });

      return reply.send(reasons);
    });
}
