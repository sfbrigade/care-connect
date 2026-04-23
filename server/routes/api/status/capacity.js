import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const CACHE_TTL_MS = 30_000;
const FACILITY_SUBDOMAIN = 'reset';

const OccupantSchema = z.object({
  occupiedSince: z.string().datetime().nullable(),
  substance: z.string().nullable(),
});

const CapacityResponseSchema = z.object({
  facility: z.string(),
  generatedAt: z.string().datetime(),
  beds: z.object({
    total: z.number().int(),
    operational: z.number().int(),
    occupied: z.number().int(),
    inTransit: z.number().int(),
  }),
  occupants: z.array(OccupantSchema),
});

let cache = null;
let inflight = null;

async function computeCapacity (fastify) {
  const facility = await fastify.prisma.facility.findUnique({
    where: { subdomain: FACILITY_SUBDOMAIN },
    include: { bedTypes: true },
  });
  if (!facility) {
    throw new Error('RESET facility not configured');
  }

  const totals = facility.bedTypes.reduce((acc, bt) => ({
    total: acc.total + bt.capacity,
    unavailable: acc.unavailable + bt.unavailableUnoccupied + bt.unavailableOccupied,
    occupied: acc.occupied + bt.occupied,
    inTransit: acc.inTransit + bt.inTransit,
  }), { total: 0, unavailable: 0, occupied: 0, inTransit: 0 });

  const occupiedRows = await fastify.prisma.deflection.findMany({
    where: {
      facilityId: facility.id,
      status: 'ACTIVE',
      subjectStatus: 'IN_CHAIR',
    },
    select: { admittedAt: true, drugType: true },
    orderBy: { admittedAt: 'asc' },
  });

  return {
    facility: 'RESET',
    generatedAt: new Date().toISOString(),
    beds: {
      total: totals.total,
      operational: totals.total - totals.unavailable,
      occupied: totals.occupied,
      inTransit: totals.inTransit,
    },
    occupants: occupiedRows.map(d => ({
      occupiedSince: d.admittedAt ? d.admittedAt.toISOString() : null,
      substance: d.drugType ?? null,
    })),
  };
}

async function getCapacity (fastify) {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  if (inflight) return inflight;
  inflight = computeCapacity(fastify)
    .then(data => {
      cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export default async function (fastify) {
  fastify.get('/capacity',
    {
      onRequest: fastify.requireCapacityApiKey,
      schema: {
        description: 'Aggregate capacity and occupant data for external dashboard consumption.',
        response: {
          [StatusCodes.OK]: CapacityResponseSchema,
          [StatusCodes.UNAUTHORIZED]: z.null(),
          [StatusCodes.SERVICE_UNAVAILABLE]: z.object({ error: z.string() }),
        },
      },
    },
    async function (request, reply) {
      try {
        const data = await getCapacity(fastify);
        reply.header('Cache-Control', 'public, max-age=30');
        return reply.send(data);
      } catch (err) {
        fastify.log.error({ err }, 'capacity endpoint failed');
        return reply.code(StatusCodes.SERVICE_UNAVAILABLE).send({ error: 'capacity unavailable' });
      }
    });
}
