import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all facilities (admin only).',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().nullable(),
            phone: z.string().nullable(),
            email: z.string().nullable(),
            website: z.string().nullable(),
            addressLine1: z.string().nullable(),
            addressLine2: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postalCode: z.string().nullable(),
            neighborhood: z.string().nullable(),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
            isActive: z.boolean(),
            createdAt: z.string(),
            updatedAt: z.string(),
          })),
        },
      },
    },
    async function (request, reply) {
      const facilities = await fastify.prisma.facility.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          phone: true,
          email: true,
          website: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          neighborhood: true,
          latitude: true,
          longitude: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send(facilities.map(facility => ({
        id: facility.id,
        name: facility.name,
        description: facility.description ?? null,
        phone: facility.phone ?? null,
        email: facility.email ?? null,
        website: facility.website ?? null,
        addressLine1: facility.addressLine1 ?? null,
        addressLine2: facility.addressLine2 ?? null,
        city: facility.city ?? null,
        state: facility.state ?? null,
        postalCode: facility.postalCode ?? null,
        neighborhood: facility.neighborhood ?? null,
        latitude: facility.latitude != null ? Number(facility.latitude) : null,
        longitude: facility.longitude != null ? Number(facility.longitude) : null,
        isActive: facility.isActive,
        createdAt: facility.createdAt.toISOString(),
        updatedAt: facility.updatedAt.toISOString(),
      })));
    });

  fastify.register(import('./get.js'));
  fastify.register(import('./create.js'));
  fastify.register(import('./patch.js'));
  fastify.register(import('./delete.js'));
  fastify.register(import('./update-beds.js'));
  fastify.register(import('./add-service.js'));
  fastify.register(import('./remove-service.js'));
}
