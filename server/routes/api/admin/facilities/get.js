import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single facility details (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
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
            services: z.array(z.object({
              serviceTypeId: z.string().uuid(),
              serviceTypeCode: z.string(),
              serviceTypeName: z.string(),
              availableBeds: z.number().nullable(),
              reservedBeds: z.number().nullable(),
            })),
            contacts: z.array(z.object({
              id: z.string().uuid(),
              name: z.string(),
              role: z.string().nullable(),
              email: z.string().nullable(),
              phone: z.string().nullable(),
              isPrimary: z.boolean(),
            })),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const facility = await fastify.prisma.facility.findUnique({
        where: { id },
        include: {
          services: {
            include: {
              serviceType: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              phone: true,
              isPrimary: true,
            },
          },
        },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      return reply.send({
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
        services: facility.services.map(service => ({
          serviceTypeId: service.serviceType.id,
          serviceTypeCode: service.serviceType.code,
          serviceTypeName: service.serviceType.name,
          availableBeds: service.availableBeds ?? null,
          reservedBeds: service.reservedBeds ?? null,
        })),
        contacts: facility.contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          role: contact.role ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          isPrimary: contact.isPrimary,
        })),
        createdAt: facility.createdAt.toISOString(),
        updatedAt: facility.updatedAt.toISOString(),
      });
    });
}

