import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

import BedHold from '#models/bedHold.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'List active holds, optionally filtered by facility.',
        querystring: z.object({
          facilityId: z.string().uuid().optional(),
          include: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(BedHold.ResponseSchema),
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

      const include = request.query.include?.split(',') ?? [];

      const holds = await fastify.prisma.bedHold.findMany({
        where,
        include: {
          facility: include.includes('facility'),
          serviceType: include.includes('serviceType'),
          client: include.includes('client'),
          createdBy: include.includes('createdBy'),
          incident: include.includes('incident'),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      holds.forEach(hold => {
        if (hold.createdBy) {
          hold.createdBy = new User(hold.createdBy);
        }
      });

      return reply.send(holds);
    });
}
