import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Unit from '#models/unit.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a paginated list of units for an organization.',
        params: z.object({
          organizationId: z.string(),
        }),
        querystring: z.object({
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Unit.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { organizationId } = request.params;
      const { page = '1', perPage = '25' } = request.query;

      const options = {
        page,
        perPage,
        where: {
          organizationId,
        },
        orderBy: { name: 'asc' },
      };

      const { records, total } = await fastify.prisma.unit.paginate(options);
      return reply.setPaginationHeaders(page, perPage, total).send(records.map((data) => new Unit(data)));
    });
}
