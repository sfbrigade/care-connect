import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const CACHE_TTL_MS = 30_000;

const OccupantSchema = z.object({
  admittedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
  exitedAt: z.string().datetime().nullable(),
});

const OCCUPANTS_LOOKBACK_HOURS = 24;

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

async function computeCapacity (fastify, request) {
  const { facility } = request;

  // Bed totals: capacity, what's unavailable, and the inTransit count come
  // straight from the denormalized bedType counters. occupied is computed
  // separately below — see comment on the count query.
  const totals = facility.bedTypes.reduce((acc, bt) => ({
    total: acc.total + bt.capacity,
    unavailable: acc.unavailable + bt.unavailableUnoccupied + bt.unavailableOccupied,
    inTransit: acc.inTransit + bt.inTransit,
  }), { total: 0, unavailable: 0, inTransit: 0 });

  // "Occupied" = people at the facility who are no longer in transit. We
  // compute this from deflection rows rather than summing bedType.occupied
  // because that counter only tracks IN_CHAIR subjects and is decremented
  // when status moves to RELEASED (see deflections/release.js) — meaning
  // released-but-not-yet-exited people would be undercounted, even though
  // they're physically still in the facility.
  //
  // Boundary:
  //   - transferredAt is set: SFSO has handed custody to care staff. This
  //     matches the inTransit counter's exit point (deflections/transfer.js
  //     decrements bedType.inTransit at the same moment), so anyone the
  //     system calls "in transit" is excluded.
  //   - exitedAt is null: the subject hasn't physically left the facility
  //     (deflections/exit.js sets exitedAt when they leave).
  //
  // In subjectStatus terms this covers AWAITING_INTAKE through RELEASED.
  const occupied = await fastify.prisma.deflection.count({
    where: {
      facilityId: facility.id,
      transferredAt: { not: null },
      exitedAt: null,
    },
  });

  // Occupants list: anyone whose care-staff intake (admittedAt) started
  // within the lookback window, regardless of subsequent status. Some will
  // still be IN_CHAIR (releasedAt + exitedAt null), some released but still
  // onsite (releasedAt set, exitedAt null), some already departed (both set).
  const cutoff = new Date(Date.now() - OCCUPANTS_LOOKBACK_HOURS * 60 * 60 * 1000);
  const occupants = await fastify.prisma.deflection.findMany({
    where: {
      facilityId: facility.id,
      admittedAt: { gte: cutoff },
    },
    select: {
      admittedAt: true,
      releasedAt: true,
      exitedAt: true,
    },
    orderBy: { admittedAt: 'asc' },
  });

  return {
    facility: facility.name,
    generatedAt: new Date().toISOString(),
    beds: {
      total: totals.total,
      operational: totals.total - totals.unavailable,
      occupied,
      inTransit: totals.inTransit,
    },
    occupants: occupants.map(d => ({
      admittedAt: d.admittedAt ? d.admittedAt.toISOString() : null,
      releasedAt: d.releasedAt ? d.releasedAt.toISOString() : null,
      exitedAt: d.exitedAt ? d.exitedAt.toISOString() : null,
    })),
  };
}

async function getCapacity (fastify, request) {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  if (inflight) return inflight;
  inflight = computeCapacity(fastify, request)
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
      onRequest: [fastify.requireFacility, fastify.requireCapacityApiKey],
      schema: {
        description: 'Aggregate capacity and occupant data for external dashboard consumption.',
        response: {
          [StatusCodes.OK]: CapacityResponseSchema,
          [StatusCodes.BAD_REQUEST]: z.null(),
          [StatusCodes.UNAUTHORIZED]: z.null(),
          [StatusCodes.SERVICE_UNAVAILABLE]: z.object({ error: z.string() }),
        },
      },
    },
    async function (request, reply) {
      try {
        const data = await getCapacity(fastify, request);
        reply.header('Cache-Control', 'public, max-age=30');
        return reply.send(data);
      } catch (err) {
        fastify.log.error({ err }, 'capacity endpoint failed');
        return reply.code(StatusCodes.SERVICE_UNAVAILABLE).send({ error: 'capacity unavailable' });
      }
    });
}
