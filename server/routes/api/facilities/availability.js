import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

// TODO: this endpoint going away once status is always updated/cached in BedStatus

export default async function (fastify, opts) {
  fastify.get('/:id/availability',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns bed availability for a facility.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.array(z.object({
            capacity: z.number(),
            unavailableOccupied: z.number(),
            unavailableUnoccupied: z.number(),
            occupied: z.number(),
            holds: z.number(),
            available: z.number(),
          })),
        },
      },
    },
    async function (request, reply) {
      const { id: facilityId } = request.params;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      const where = {
        facilityId,
        status: {
          in: ['ACTIVE', 'EXTENDED'],
        },
        expiresAt: {
          gt: now,
        },
      };
      const holds = await fastify.prisma.bedHold.groupBy({
        by: ['facilityId', 'serviceTypeId'],
        where,
        _sum: {
          bedsRequested: true,
        },
      });

      const bedStatuses = await fastify.prisma.bedStatus.findMany({
        where: {
          facilityId,
        },
      });

      const results = bedStatuses.map((bedStatus) => {
        // TODO: change to check on bedStatus.id once hold model migrated
        const hold = holds.find((hold) => hold.facilityId === bedStatus.facilityId);
        const calculatedAvailable = bedStatus.capacity - bedStatus.unavailableOccupied - bedStatus.unavailableUnoccupied - bedStatus.occupied - (hold ? hold._sum.bedsRequested : 0);
        return {
          capacity: bedStatus.capacity,
          unavailableOccupied: bedStatus.unavailableOccupied,
          unavailableUnoccupied: bedStatus.unavailableUnoccupied,
          occupied: bedStatus.occupied,
          holds: hold ? hold._sum.bedsRequested : 0,
          available: calculatedAvailable,
        };
      });

      return reply.send(results);
    });
}
