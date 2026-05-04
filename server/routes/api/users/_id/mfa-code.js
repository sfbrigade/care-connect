import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify) {
  fastify.get('/mfa-code',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Returns an active MFA code for an administrator to communicate manually.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            code: z.string().length(6),
            expiresAt: z.coerce.date(),
            attemptsRemaining: z.number(),
            lastSentAt: z.coerce.date().nullable(),
          }),
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      if (id === User.BATCH_USER_ID) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const data = await fastify.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          mfaCode: true,
          mfaExpiresAt: true,
          mfaAttempts: true,
          mfaLastSentAt: true,
        },
      });

      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!data.mfaCode || !data.mfaExpiresAt || new Date() > new Date(data.mfaExpiresAt)) {
        return reply.code(StatusCodes.NO_CONTENT).send();
      }

      const attemptsRemaining = Math.max(0, 5 - data.mfaAttempts);

      await fastify.prisma.adminSecurityEvent.create({
        data: {
          action: 'USER_MFA_CODE_VIEWED',
          actorUserId: request.user.id,
          targetUserId: id,
          metadata: {
            expiresAt: data.mfaExpiresAt.toISOString(),
            attemptsRemaining,
          },
        },
      });

      reply.header('Cache-Control', 'no-store');
      reply.header('Pragma', 'no-cache');

      return reply.send({
        code: data.mfaCode,
        expiresAt: data.mfaExpiresAt,
        attemptsRemaining,
        lastSentAt: data.mfaLastSentAt,
      });
    });
}
