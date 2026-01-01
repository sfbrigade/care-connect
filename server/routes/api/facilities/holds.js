import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

import BedHold from '#models/bedHold.js';

export default async function (fastify, opts) {
  fastify.get('/:id/holds',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'List all active holds for a facility.',
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z.object({
          all: z.coerce.boolean().optional(),
          include: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(BedHold.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { id: facilityId } = request.params;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      const where = {
        facilityId,
        status: {
          in: ['ACTIVE', 'EXTENDED'],
        },
        expiresAt: {
          gt: now,
        },
      };
      if (!request.query.all || !request.user.isAdmin) {
        where.createdById = request.user.id;
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

      return reply.send(holds);
    });
}
