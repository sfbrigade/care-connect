import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create a new facility (admin only).',
        body: z.object({
          name: z.string().min(1),
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
          isActive: z.boolean().optional().default(true),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            name: z.string(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      const facility = await fastify.prisma.facility.create({
        data: {
          name: data.name,
          description: data.description || null,
          phone: data.phone || null,
          email: (data.email === '' || data.email === null) ? null : data.email,
          website: (data.website === '' || data.website === null) ? null : data.website,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          neighborhood: data.neighborhood || null,
          latitude: data.latitude != null ? data.latitude : null,
          longitude: data.longitude != null ? data.longitude : null,
          isActive: data.isActive ?? true,
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        id: facility.id,
        name: facility.name,
        createdAt: facility.createdAt.toISOString(),
      });
    });
}
