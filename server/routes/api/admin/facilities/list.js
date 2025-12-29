import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all facilities (admin only).',
        response: {
          [StatusCodes.OK]: z.array(Facility.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const facilities = await fastify.prisma.facility.findMany({
        orderBy: { name: 'asc' },
      });
      return reply.send(facilities);
    }
  );
}
