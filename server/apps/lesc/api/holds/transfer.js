import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.post('/:id/transfer',
    {
      schema: {
        description: 'Transfers a bed hold using a QR code token.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          token: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            status: z.string(),
            transferredAt: z.string().datetime(),
            transferredBy: z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string(),
            }).nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { token } = request.body;
      const userId = request.user?.id || null; // Optional - can be null if no user
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
        },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      if (hold.status === 'TRANSFERRED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold has already been transferred' });
      }

      if (hold.transferToken !== token || !hold.transferTokenExpiresAt || hold.transferTokenExpiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Invalid transfer token' });
      }

      const updatedHold = await fastify.prisma.bedHold.update({
        where: { id },
        data: {
          status: 'TRANSFERRED',
          transferredAt: now,
          transferredById: userId,
          transferToken: null, // Invalidate token after use
          transferTokenExpiresAt: null,
        },
        include: {
          transferredBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return reply.send({
        id: updatedHold.id,
        status: updatedHold.status,
        transferredAt: updatedHold.transferredAt.toISOString(),
        transferredBy: updatedHold.transferredBy,
      });
    });
}

