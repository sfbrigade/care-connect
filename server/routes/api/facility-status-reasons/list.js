import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import FacilityStatusReason from '#models/facilityStatusReason.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all facility status reasons.',
        response: {
          [StatusCodes.OK]: z.array(FacilityStatusReason.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const reasons = await fastify.prisma.facilityStatusReason.findMany({
        orderBy: { description: 'asc' },
      });

      return reply.send(reasons);
    });
}
