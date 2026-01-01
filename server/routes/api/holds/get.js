import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { autoExpireHolds } from '#lib/lesc/holds.js';
import BedHold from '#models/bedHold.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get hold by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z.object({
          include: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: BedHold.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const now = new Date();

      await autoExpireHolds(fastify.prisma, now);

      const include = request.query.include?.split(',') ?? [];

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
        include: {
          facility: include.includes('facility'),
          serviceType: include.includes('serviceType'),
          client: include.includes('client'),
          incident: include.includes('incident'),
          createdBy: include.includes('createdBy'),
          cancelledBy: include.includes('cancelledBy'),
          transferredBy: include.includes('transferredBy'),
        },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold can view it
      if (hold.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only view your own holds' });
      }

      if (hold.createdBy) {
        hold.createdBy = new User(hold.createdBy);
      }
      if (hold.cancelledBy) {
        hold.cancelledBy = new User(hold.cancelledBy);
      }
      if (hold.transferredBy) {
        hold.transferredBy = new User(hold.transferredBy);
      }

      return reply.send(hold);
    });
}
