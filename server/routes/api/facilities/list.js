import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of facilities with detailed metadata.',
        querystring: z.object({
          type: z.string().optional(),
          include: z.string().optional(),
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Facility.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { page = '1', perPage = '25' } = request.query;
      // Filter facilities based on type
      const where = {};
      if (request.query.type) {
        where.type = request.query.type;
      }
      const include = request.query.include?.split(',');

      const options = {
        page,
        perPage,
        where,
        orderBy: { name: 'asc' },
        include: {
          serviceType: !!include?.includes('serviceType'),
          bedTypes: !!include?.includes('bedTypes'),
          amenities: !!include?.includes('amenities'),
          eligibility: !!include?.includes('eligibility'),
          contacts: !!include?.includes('contacts'),
          statusReason: !!include?.includes('statusReason'),
        },
      };

      const { records, total } = await fastify.prisma.facility.paginate(options);
      return reply.setPaginationHeaders(page, perPage, total).send(records);
    });
}
