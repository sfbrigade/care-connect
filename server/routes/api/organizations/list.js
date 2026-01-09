import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Organization from '#models/organization.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a paginated list of organizations.',
        querystring: z.object({
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Organization.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { page = '1', perPage = '25' } = request.query;
      const options = {
        page,
        perPage,
        orderBy: { name: 'asc' },
      };
      const { records, total } = await fastify.prisma.organization.paginate(options);
      return reply.setPaginationHeaders(page, perPage, total).send(records.map((data) => new Organization(data)));
    });
}
