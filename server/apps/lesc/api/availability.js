import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '../lib/holds.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns LESC facilities with current bed availability.',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            facilityId: z.string().uuid(),
            facilityName: z.string(),
            serviceTypeId: z.string().uuid(),
            serviceTypeCode: z.string(),
            serviceTypeName: z.string(),
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
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      // Find LESC facilities (identified by ServiceType code "LESC")
      const lescServiceType = await fastify.prisma.serviceType.findUnique({
        where: {
          code: 'LESC',
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      if (!lescServiceType) {
        return reply.send([]);
      }

      const serviceTypeIds = [lescServiceType.id];

      // Get facilities with LESC services
      const facilities = await fastify.prisma.facility.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              serviceTypeId: {
                in: serviceTypeIds,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          services: {
            where: {
              serviceTypeId: {
                in: serviceTypeIds,
              },
            },
            select: {
              serviceTypeId: true,
              availableBeds: true,
              reservedBeds: true,
              serviceType: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Get active holds for these facilities
      const activeHolds = await fastify.prisma.bedHold.groupBy({
        by: ['facilityId', 'serviceTypeId'],
        where: {
          facilityId: {
            in: facilities.map(f => f.id),
          },
          serviceTypeId: {
            in: serviceTypeIds,
          },
          status: {
            in: ['ACTIVE', 'EXTENDED'],
          },
          expiresAt: {
            gt: now,
          },
        },
        _sum: {
          bedsRequested: true,
        },
      });

      // Create a map of holds by facility and service type
      const holdsMap = new Map();
      activeHolds.forEach(hold => {
        const key = `${hold.facilityId}-${hold.serviceTypeId}`;
        holdsMap.set(key, hold._sum.bedsRequested || 0);
      });

      // Build response
      const response = [];
      facilities.forEach(facility => {
        facility.services.forEach(service => {
          const key = `${facility.id}-${service.serviceTypeId}`;
          const activeHoldsCount = holdsMap.get(key) || 0;
          // availableBeds in the database represents total capacity
          const totalBeds = service.availableBeds || 0;
          const reservedBeds = service.reservedBeds || 0;
          // Calculated available = total - reserved - holds
          const calculatedAvailable = Math.max(0, totalBeds - reservedBeds - activeHoldsCount);

          response.push({
            facilityId: facility.id,
            facilityName: facility.name,
            serviceTypeId: service.serviceType.id,
            serviceTypeCode: service.serviceType.code,
            serviceTypeName: service.serviceType.name,
            totalBeds: totalBeds > 0 ? totalBeds : null,
            availableBeds: calculatedAvailable, // Show calculated available instead of raw availableBeds
            reservedBeds,
            activeHolds: activeHoldsCount,
            calculatedAvailable,
          });
        });
      });

      return reply.send(response);
    });
}
