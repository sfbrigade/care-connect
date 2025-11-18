import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id/extend',
    {
      schema: {
        description: 'Extend a hold by 30 minutes.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            expiresAt: z.string(),
            status: z.string(),
            extendedAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      if (hold.status !== 'ACTIVE' && hold.status !== 'EXTENDED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold cannot be extended' });
      }

      const now = new Date();
      if (hold.expiresAt <= now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold has already expired' });
      }

      // Extend by 30 minutes from current expiration time
      const newExpiresAt = new Date(hold.expiresAt.getTime() + 30 * 60 * 1000);

      const updated = await fastify.prisma.bedHold.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
          status: 'EXTENDED',
          extendedAt: now,
        },
      });

      return reply.send({
        id: updated.id,
        expiresAt: updated.expiresAt.toISOString(),
        status: updated.status,
        extendedAt: updated.extendedAt.toISOString(),
      });
    });
}

