import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedStatus from '#models/bedStatus.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of bed statuses for a specific facility.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(BedStatus.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;
      const { page = '1', perPage = '25' } = request.query;

      const options = {
        page,
        perPage,
        where: {
          facilityId,
        },
        orderBy: { createdAt: 'desc' },
      };

      const { records, total } = await fastify.prisma.bedStatus.paginate(options);
      return reply.setPaginationHeaders(page, perPage, total).send(records);
    });
}
