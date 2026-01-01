import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

import ServiceType from '#models/serviceType.js';

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
            serviceTypeId: z.string().uuid(),
            serviceType: ServiceType.ResponseSchema,
            totalBeds: z.number().nullable(),
            availableBeds: z.number().nullable(),
            reservedBeds: z.number().nullable(),
            activeHolds: z.number(),
            calculatedAvailable: z.number(),
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

      const facilityServices = await fastify.prisma.facilityService.findMany({
        where: {
          facilityId,
        },
        include: {
          serviceType: true,
        },
      });

      const results = facilityServices.map((facilityService) => {
        const hold = holds.find((hold) => hold.serviceTypeId === facilityService.serviceTypeId);
        const calculatedAvailable = facilityService.availableBeds - (hold ? hold._sum.bedsRequested : 0);
        return {
          serviceTypeId: facilityService.serviceTypeId,
          serviceType: facilityService.serviceType,
          totalBeds: facilityService.availableBeds ?? 0,
          availableBeds: calculatedAvailable,
          reservedBeds: facilityService.reservedBeds ?? 0,
          activeHolds: hold ? hold._sum.bedsRequested : 0,
          calculatedAvailable,
        };
      });

      return reply.send(results);
    });
}
