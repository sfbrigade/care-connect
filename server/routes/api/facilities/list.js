import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with detailed metadata.',
        querystring: z.object({
          type: z.string().optional(),
          include: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Facility.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      // Filter facilities based on type
      const where = {};
      if (request.query.type) {
        where.type = request.query.type;
      }
      const include = request.query.include?.split(',');

      const facilities = await fastify.prisma.facility.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          services: include?.includes('services')
            ? {
                include: {
                  serviceType: true,
                },
              }
            : false,
          amenities: !!include?.includes('amenities'),
          eligibility: !!include?.includes('eligibility'),
          contacts: !!include?.includes('contacts'),
        },
      });
      return reply.send(facilities);
    });
}
