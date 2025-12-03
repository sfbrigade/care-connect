import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.get('/:id/transfer-status',
    {
      schema: {
        description: 'Gets the transfer status of a bed hold.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            isTransferred: z.boolean(),
            transferredAt: z.string().datetime().nullable(),
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
      const now = new Date();

      await autoExpireHolds(fastify.prisma, now);

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
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

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      return reply.send({
        id: hold.id,
        isTransferred: hold.status === 'TRANSFERRED',
        transferredAt: hold.transferredAt?.toISOString() || null,
        transferredBy: hold.transferredBy,
      });
    });
}

