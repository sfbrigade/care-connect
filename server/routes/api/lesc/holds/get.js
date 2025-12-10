import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { autoExpireHolds } from '#lib/lesc/holds.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get hold by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            facilityId: z.string().uuid(),
            facilityName: z.string(),
            serviceTypeId: z.string().uuid(),
            serviceTypeCode: z.string(),
            serviceTypeName: z.string(),
            bedsRequested: z.number(),
            expiresAt: z.string(),
            status: z.string(),
            createdAt: z.string(),
            notes: z.string().nullable(),
            client: z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string().nullable(),
              dateOfBirth: z.string().nullable(),
              sex: z.string().nullable(),
              race: z.string().nullable(),
              personallyIdentifiable: z.string().nullable(),
            }).nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const now = new Date();

      await autoExpireHolds(fastify.prisma, now);

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
        include: {
          facility: {
            select: {
              name: true,
            },
          },
          serviceType: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              sex: true,
              race: true,
              personallyIdentifiable: true,
            },
          },
        },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold can view it
      if (hold.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only view your own holds' });
      }

      return reply.send({
        id: hold.id,
        facilityId: hold.facilityId,
        facilityName: hold.facility.name,
        serviceTypeId: hold.serviceType.id,
        serviceTypeCode: hold.serviceType.code,
        serviceTypeName: hold.serviceType.name,
        bedsRequested: hold.bedsRequested,
        expiresAt: hold.expiresAt.toISOString(),
        status: hold.status,
        createdAt: hold.createdAt.toISOString(),
        notes: hold.notes,
        client: hold.client
          ? {
              id: hold.client.id,
              firstName: hold.client.firstName,
              lastName: hold.client.lastName,
              dateOfBirth: hold.client.dateOfBirth?.toISOString() ?? null,
              sex: hold.client.sex,
              race: hold.client.race,
              personallyIdentifiable: hold.client.personallyIdentifiable,
            }
          : null,
      });
    });
}
