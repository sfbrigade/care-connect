import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.post('/:id/transfer',
    {
      preHandler: fastify.requireUser,
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
      const userId = request.user.id;
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
        return reply.code(StatusCodes.NOT_FOUND).send({
          error: 'Hold not found. The hold ID may be incorrect or the hold may have been deleted.'
        });
      }

      // Only the user who created the hold can transfer it
      if (hold.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({
          error: 'You can only transfer your own holds. This hold was created by another user.'
        });
      }

      // Check if hold has expired
      if (hold.expiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: `Hold has expired. The hold expired on ${hold.expiresAt.toISOString()}. Expired holds cannot be transferred.`
        });
      }

      if (hold.status === 'TRANSFERRED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Hold has already been transferred and cannot be transferred again.'
        });
      }

      if (hold.status === 'CANCELLED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Hold has been cancelled and cannot be transferred.'
        });
      }

      if (hold.status === 'EXPIRED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Hold has expired and cannot be transferred.'
        });
      }

      if (!hold.transferToken) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'No transfer token found for this hold. Please generate a new QR code.'
        });
      }

      if (hold.transferToken !== token) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Invalid transfer token. The token does not match this hold. Please scan the QR code again or generate a new one.'
        });
      }

      if (!hold.transferTokenExpiresAt) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Transfer token has no expiration date. Please generate a new QR code.'
        });
      }

      if (hold.transferTokenExpiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: `Transfer token has expired. The token expired on ${hold.transferTokenExpiresAt.toISOString()}. Please generate a new QR code.`
        });
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
