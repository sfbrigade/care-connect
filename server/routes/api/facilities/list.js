import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { Facility } from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with detailed metadata.',
        response: {
          [StatusCodes.OK]: z.array(Facility.ResponseSchema.extend({
            services: z.array(z.object({
              id: z.string().uuid(),
              code: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              availableBeds: z.number().nullable(),
              reservedBeds: z.number().nullable(),
            })).optional(),
            amenities: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
            })).optional(),
            eligibility: z.array(z.object({
              id: z.string().uuid(),
              type: z.string(),
              value: z.string().nullable(),
              notes: z.string().nullable(),
            })).optional(),
            contacts: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
              role: z.string().nullable(),
              phone: z.string().nullable(),
              email: z.string().nullable(),
              isPrimary: z.boolean(),
              notes: z.string().nullable(),
            })).optional(),
          })),
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
          amenities: {
            include: {
              amenity: true,
            },
          },
          eligibility: true,
          contacts: true,
        },
      });

      const responsePayload = facilities.map((facility) => ({
        ...facility,
        services: facility.services.map((service) => ({
          id: service.serviceType.id,
          code: service.serviceType.code,
          name: service.serviceType.name,
          description: service.description ?? service.serviceType.description ?? null,
          availableBeds: service.availableBeds ?? null,
          reservedBeds: service.reservedBeds ?? null,
        })),
        amenities: facility.amenities.map((item) => ({
          id: item.amenity.id,
          name: item.amenity.name,
        })),
        eligibility: facility.eligibility.map((item) => ({
          id: item.id,
          type: item.type,
          value: item.value ?? null,
          notes: item.notes ?? null,
        })),
        contacts: facility.contacts.map((item) => ({
          id: item.id,
          name: item.name,
          role: item.role ?? null,
          phone: true,
          email: true,
          notes: true,
          isPrimary: true,
        })),
      }));

      return reply.send(responsePayload);
    });
}
