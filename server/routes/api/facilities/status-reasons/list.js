import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import FacilityStatusReason from '#models/facilityStatusReason.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all facility status reasons.',
        querystring: z.object({
          type: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(FacilityStatusReason.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { type } = request.query;
      const options = {
        orderBy: { description: 'asc' },
      };
      if (type) {
        options.where = {
          OR: [
            { type },
            { type: null },
          ],
        };
      }
      const reasons = await fastify.prisma.facilityStatusReason.findMany(options);

      return reply.send(reasons);
    });
}
