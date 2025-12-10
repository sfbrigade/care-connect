import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import crypto from 'node:crypto';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.post('/:holdId',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Check in a subject with a hold. Marks the hold as TRANSFERRED to free the bed.',
        params: z.object({
          holdId: z.string().uuid(),
        }),
        body: z.object({
          intakeId: z.string().uuid().optional(),
        }).passthrough().optional(),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            holdId: z.string().uuid(),
            message: z.string(),
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { holdId } = request.params;
      const userId = request.user.id;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      // Find the hold
      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({
          error: 'Hold not found. The hold ID may be incorrect or the hold may have been deleted.'
        });
      }

      // Check if hold has expired
      if (hold.expiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: `Hold has expired. The hold expired on ${hold.expiresAt.toISOString()}. Expired holds cannot be used for check-in.`
        });
      }

      // Check if hold is in a valid state for check-in
      if (!['ACTIVE', 'EXTENDED'].includes(hold.status)) {
        const statusMessages = {
          EXPIRED: 'Hold has expired and cannot be used for check-in.',
          CANCELLED: 'Hold has been cancelled and cannot be used for check-in.',
          TRANSFERRED: 'Hold has already been transferred and cannot be used for check-in again.',
        };
        const message = statusMessages[hold.status] || `Hold is in ${hold.status} status and cannot be used for check-in.`;
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: message });
      }

      // Mark the hold as TRANSFERRED to free the bed
      await fastify.prisma.bedHold.update({
        where: { id: holdId },
        data: {
          status: 'TRANSFERRED',
          transferredAt: now,
          transferredById: userId,
          transferToken: null, // Clear any transfer token
          transferTokenExpiresAt: null,
        },
      });

      // Create check-in record (placeholder implementation - would link hold to intake record)
      const checkinId = crypto.randomUUID();

      return reply.code(StatusCodes.CREATED).send({
        id: checkinId,
        holdId,
        message: 'Check-in successful. Hold has been transferred and bed is now available.',
      });
    }
  );
}
