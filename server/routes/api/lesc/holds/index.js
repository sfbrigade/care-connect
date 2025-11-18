import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
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
          })),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.query;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await fastify.prisma.bedHold.updateMany({
        where: {
          status: {
            in: ['ACTIVE', 'EXTENDED'],
          },
          expiresAt: {
            lte: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      const where = {
        status: {
          in: ['ACTIVE', 'EXTENDED'],
        },
        expiresAt: {
          gt: now,
        },
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
      })));
    });

  await fastify.register(import('./create.js'));
  await fastify.register(import('./extend.js'));
  await fastify.register(import('./cancel.js'));
}

