import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List active holds, optionally filtered by facility.',
        querystring: z.object({
          facilityId: z.string().uuid().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(z.object({
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
            createdBy: z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string(),
            }).nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.query;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      const where = {
        status: {
          in: ['ACTIVE', 'EXTENDED'],
        },
        expiresAt: {
          gt: now,
        },
        createdById: request.user.id,
      };

      if (facilityId) {
        where.facilityId = facilityId;
      }

      const holds = await fastify.prisma.bedHold.findMany({
        where,
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
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(holds.map(hold => ({
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
        createdBy: hold.createdBy
          ? {
              id: hold.createdBy.id,
              firstName: hold.createdBy.firstName,
              lastName: hold.createdBy.lastName,
            }
          : null,
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
      })));
    });
}
