import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with detailed metadata.',
        response: {
          [StatusCodes.OK]: z.array(Facility.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      // Filter facilities based on app type
      let whereClause = {};
      const appType = request.appType;

      // Extract LESC service type lookup before the if/else to avoid duplication
      // Only query when needed (lesc or dido app) - skip query for admin/shared routes (appType === null)
      const lescServiceType = (appType === 'lesc' || appType === 'dido')
        ? await fastify.prisma.serviceType.findUnique({
          where: { code: 'LESC' },
          select: { id: true },
        })
        : null;

      if (appType === 'lesc') {
        // LESC app: Only show facilities with LESC service type
        if (lescServiceType) {
          whereClause = {
            services: {
              some: {
                serviceTypeId: lescServiceType.id,
              },
            },
          };
        } else {
          // No LESC service type exists, return empty array
          return reply.send([]);
        }
      } else if (appType === 'dido') {
        // DIDO app: Exclude facilities with LESC service type
        if (lescServiceType) {
          whereClause = {
            services: {
              none: {
                serviceTypeId: lescServiceType.id,
              },
            },
          };
        }
        // If LESC service type doesn't exist, show all facilities (no filter)
      }
      // If appType is null (admin/shared routes), show all facilities (no filter)

      const facilities = await fastify.prisma.facility.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
          services: {
            include: {
              serviceType: true,
            },
          },
          amenities: true,
          eligibility: true,
          contacts: true,
        },
      });
      return reply.send(facilities);
    });
}
