import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

// TODO: this endpoint going away once status is always updated/cached in BedType

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
      const deflections = await fastify.prisma.deflection.groupBy({
        by: ['facilityId', 'bedTypeId'],
        where,
        _count: {
          _all: true,
        },
      });

      const bedTypes = await fastify.prisma.bedType.findMany({
        where: {
          facilityId,
        },
      });

      const results = bedTypes.map((bedType) => {
        // TODO: change to check on bedType.id once hold model migrated
        const holds = deflections.find((deflection) => deflection.bedTypeId === bedType.id);
        const calculatedAvailable = bedType.capacity - bedType.unavailableOccupied - bedType.unavailableUnoccupied - bedType.occupied - (holds ? holds._count._all : 0);
        return {
          capacity: bedType.capacity,
          unavailableOccupied: bedType.unavailableOccupied,
          unavailableUnoccupied: bedType.unavailableUnoccupied,
          occupied: bedType.occupied,
          holds: holds ? holds._count._all : 0,
          available: calculatedAvailable,
        };
      });

      return reply.send(results);
    });
}
