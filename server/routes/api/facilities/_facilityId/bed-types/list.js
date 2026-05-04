import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';
import Deflection from '#models/deflection.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of bed types for a specific facility.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(BedType.ResponseSchema),
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

      const { records, total } = await fastify.prisma.bedType.paginate(options);
      const inTransitCounts = await fastify.prisma.deflection.groupBy({
        by: ['bedTypeId'],
        where: {
          facilityId,
          bedTypeId: { in: records.map(record => record.id) },
          status: Deflection.HoldStatus.ACTIVE,
          subjectStatus: Deflection.SubjectStatus.DETAINED,
        },
        _count: { _all: true },
      });
      const inTransitByBedTypeId = new Map(
        inTransitCounts.map(row => [row.bedTypeId, row._count._all])
      );
      const hydratedRecords = records.map(record => ({
        ...record,
        inTransit: inTransitByBedTypeId.get(record.id) ?? 0,
      }));

      return reply.setPaginationHeaders(page, perPage, total).send(hydratedRecords);
    });
}
