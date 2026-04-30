import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { streetCityState } from '#lib/forms/shared/formUtils.js';

const TIMEZONE = 'America/Los_Angeles';
const FACILITY_NAME = 'RESET';

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

const ArrestSchema = z.object({
  timestamp: z.string().datetime(),
  address: z.string(),
  caseNumber: z.string().nullable(),
});

const ArrestsResponseSchema = z.array(ArrestSchema);

export default async function (fastify) {
  fastify.get(
    '/arrests',
    {
      onRequest: [fastify.requireArrestsApiKey],
      schema: {
        description:
          'List arrests at the RESET facility for the given day (interpreted in Pacific time). ' +
          'Excludes incidents whose deflections are all cancelled.',
        querystring: QuerySchema,
        response: {
          [StatusCodes.OK]: ArrestsResponseSchema,
          [StatusCodes.UNAUTHORIZED]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { date } = request.query;
      const startDT = DateTime.fromISO(date, { zone: TIMEZONE });
      if (!startDT.isValid) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'invalid date' });
      }
      const start = startDT.startOf('day').toJSDate();
      const end = startDT.plus({ days: 1 }).startOf('day').toJSDate();

      const incidents = await fastify.prisma.incident.findMany({
        where: {
          arrestedAt: { gte: start, lt: end },
          facility: { name: FACILITY_NAME },
          deflections: { some: { cancelledAt: null } },
        },
        select: {
          arrestedAt: true,
          addressLine1: true,
          city: true,
          state: true,
          caseNumber: true,
        },
        orderBy: { arrestedAt: 'asc' },
      });

      return incidents.map((i) => ({
        timestamp: i.arrestedAt.toISOString(),
        address: streetCityState(i),
        caseNumber: i.caseNumber ?? null,
      }));
    }
  );
}
