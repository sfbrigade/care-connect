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
          id: z.string().min(1),
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

      let hold;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        hold = await fastify.prisma.bedHold.findUnique({
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
      } else {
        // Search for holds where UUID starts with the 3-character code (case-insensitive)
        // Get all active holds and filter in JavaScript for case-insensitive matching
        const allActiveHolds = await fastify.prisma.bedHold.findMany({
          where: {
            status: {
              in: ['ACTIVE', 'EXTENDED'],
            },
            expiresAt: {
              gt: now,
            },
          },
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
        // Filter holds where the first 3 characters match (case-insensitive)
        const matchingHolds = allActiveHolds.filter(h =>
          h.id.toLowerCase().startsWith(id.toLowerCase())
        );

        if (matchingHolds.length > 1) {
          return reply.code(StatusCodes.BAD_REQUEST).send({
            error: `Multiple holds found with ID code "${id.toUpperCase()}". Please use the full hold ID instead.`
          });
        }

        hold = matchingHolds[0];
      }

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold, or facility staff, can view it
      // TODO: restore access check when we have a way to identify facility staff
      // if (hold.createdById !== request.user.id && !request.user.isAdmin) {
      //   return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only view your own holds' });
      // }

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
