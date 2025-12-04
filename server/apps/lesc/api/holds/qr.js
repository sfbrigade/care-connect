import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import crypto from 'node:crypto';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.get('/:id/qr',
    {
      schema: {
        description: 'Generates or refreshes a QR code transfer token for a bed hold.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            token: z.string().uuid(),
            qrUrl: z.string().url(),
            expiresAt: z.string().datetime(),
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
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      if (!['ACTIVE', 'EXTENDED'].includes(hold.status)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold is not in a transferable status' });
      }

      if (hold.expiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold has expired' });
      }

      // Generate new token and expiration
      const newToken = crypto.randomUUID();
      const newExpiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

      const updatedHold = await fastify.prisma.bedHold.update({
        where: { id },
        data: {
          transferToken: newToken,
          transferTokenExpiresAt: newExpiresAt,
        },
      });

      const protocol = request.headers['x-forwarded-proto'] || request.protocol;
      const host = request.headers.host || 'localhost:3000';
      const qrUrl = `${protocol}://${host}/lesc/transfer/${updatedHold.id}?token=${newToken}`;

      return reply.send({
        token: updatedHold.transferToken,
        qrUrl,
        expiresAt: updatedHold.transferTokenExpiresAt.toISOString(),
      });
    });
}
