import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { firstInitialLastName, streetCityState } from '#lib/forms/shared/formUtils.js';

const TIMEZONE = 'America/Los_Angeles';
const FACILITY_NAME = 'RESET';

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

const ArrestSchema = z.object({
  arrestedAt: z.string().datetime(),
  address: z.string(),
  caseNumber: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sex: z.string().nullable(),
  race: z.string().nullable(),
  arrivedAt: z.string().datetime().nullable(),
  transferredAt: z.string().datetime().nullable(),
  arrestingOfficerName: z.string().nullable(),
  arrestingOfficerBadge: z.string().nullable(),
  chargeType: z.string().nullable(),
  drugType: z.string().nullable(),
  sfNumber: z.string().nullable(),
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
          createdByBadgeNumber: true,
          createdBy: { select: { firstName: true, lastName: true } },
          deflections: {
            where: { cancelledAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              arrivedAt: true,
              transferredAt: true,
              chargeType: true,
              drugType: true,
              subject: {
                select: {
                  firstName: true,
                  lastName: true,
                  dateOfBirth: true,
                  sex: true,
                  race: true,
                  localId: true,
                },
              },
            },
          },
        },
        orderBy: { arrestedAt: 'asc' },
      });

      return incidents.map((i) => {
        const deflection = i.deflections[0] ?? null;
        const subject = deflection?.subject ?? null;
        return {
          arrestedAt: i.arrestedAt.toISOString(),
          address: streetCityState(i),
          caseNumber: i.caseNumber ?? null,
          firstName: subject?.firstName ?? null,
          lastName: subject?.lastName ?? null,
          dateOfBirth: subject?.dateOfBirth
            ? subject.dateOfBirth.toISOString().slice(0, 10)
            : null,
          sex: subject?.sex ?? null,
          race: subject?.race ?? null,
          arrivedAt: deflection?.arrivedAt?.toISOString() ?? null,
          transferredAt: deflection?.transferredAt?.toISOString() ?? null,
          arrestingOfficerName: firstInitialLastName(i.createdBy) || null,
          arrestingOfficerBadge: i.createdByBadgeNumber ?? null,
          chargeType: deflection?.chargeType ?? null,
          drugType: deflection?.drugType ?? null,
          sfNumber: subject?.localId ?? null,
        };
      });
    }
  );
}
