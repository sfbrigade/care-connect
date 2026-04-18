import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of incidents.',
        querystring: z.object({
          facilityId: z.string().uuid().optional(),
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Incident.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { page = '1', perPage = '25' } = request.query;
      const where = {};

      if (request.query.facilityId) {
        where.facilityId = request.query.facilityId;
      }

      const options = {
        page,
        perPage,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: true,
          createdBy: true,
          createdByOrganization: true,
          createdByTitle: true,
          createdByUnit: true,
          updatedBy: true,
        },
      };

      const { records, total } = await fastify.prisma.incident.paginate(options);
      records.forEach(record => {
        record.createdBy = new User(record.createdBy);
        record.updatedBy = new User(record.updatedBy);
      });
      return reply.setPaginationHeaders(page, perPage, total).send(records);
    });
}
