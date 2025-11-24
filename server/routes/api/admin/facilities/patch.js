import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      schema: {
        description: 'Update a facility (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
          website: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
          addressLine1: z.string().optional().nullable(),
          addressLine2: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          postalCode: z.string().optional().nullable(),
          neighborhood: z.string().optional().nullable(),
          latitude: z.number().optional().nullable(),
          longitude: z.number().optional().nullable(),
          isActive: z.boolean().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            name: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const facility = await fastify.prisma.facility.findUnique({
        where: { id },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = (data.email === '' || data.email === null) ? null : data.email;
      if (data.website !== undefined) updateData.website = (data.website === '' || data.website === null) ? null : data.website;
      if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
      if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
      if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const updated = await fastify.prisma.facility.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt.toISOString(),
      });
    });
}
