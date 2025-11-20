import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with detailed metadata.',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().nullable(),
            phone: z.string().nullable(),
            neighborhood: z.string().nullable(),
            nstDistrict: z.string().nullable(),
            address: z.object({
              line1: z.string().nullable(),
              line2: z.string().nullable(),
              city: z.string().nullable(),
              state: z.string().nullable(),
              postalCode: z.string().nullable(),
            }),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
            services: z.array(z.object({
              id: z.string().uuid(),
              code: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              availableBeds: z.number().nullable(),
              reservedBeds: z.number().nullable(),
            })),
            amenities: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
            })),
            eligibility: z.array(z.object({
              id: z.string().uuid(),
              type: z.string(),
              value: z.string().nullable(),
              notes: z.string().nullable(),
            })),
            contacts: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
              role: z.string().nullable(),
              phone: z.string().nullable(),
              email: z.string().nullable(),
              isPrimary: z.boolean(),
              notes: z.string().nullable(),
            })),
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
          neighborhood: true,
          nstDistrict: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          updatedAt: true,
          services: {
            select: {
              availableBeds: true,
              reservedBeds: true,
              description: true,
              serviceType: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
          amenities: {
            select: {
              amenity: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          eligibility: {
            select: {
              id: true,
              type: true,
              value: true,
              notes: true,
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              role: true,
              phone: true,
              email: true,
              notes: true,
              isPrimary: true,
            },
          },
        },
      });

      const responsePayload = facilities.map((facility) => ({
        id: facility.id,
        name: facility.name,
        description: facility.description ?? null,
        phone: facility.phone ?? null,
        neighborhood: facility.neighborhood ?? null,
        nstDistrict: facility.nstDistrict ?? null,
        address: {
          line1: facility.addressLine1 ?? null,
          line2: facility.addressLine2 ?? null,
          city: facility.city ?? null,
          state: facility.state ?? null,
          postalCode: facility.postalCode ?? null,
        },
        latitude: facility.latitude != null ? Number(facility.latitude) : null,
        longitude: facility.longitude != null ? Number(facility.longitude) : null,
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
        contacts: facility.contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          role: contact.role ?? null,
          phone: contact.phone ?? null,
          email: contact.email ?? null,
          isPrimary: contact.isPrimary,
          notes: contact.notes ?? null,
        })),
        updatedAt: facility.updatedAt.toISOString(),
      }));

      return reply.send(responsePayload);
    });
}
