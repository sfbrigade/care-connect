import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify) {
  fastify.patch('/password',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Sets a user password as an administrator.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          password: User.PasswordSchema,
        }),
        response: {
          [StatusCodes.OK]: z.object({ ok: z.boolean() }),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { password } = request.body;

      if (id === User.BATCH_USER_ID) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const data = await fastify.prisma.user.findUnique({ where: { id } });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const user = new User(data);
      await user.setPassword(password);

      await fastify.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            hashedPassword: user.hashedPassword,
            passwordResetToken: null,
            passwordResetExpiresAt: null,
            mfaCode: null,
            mfaToken: null,
            mfaExpiresAt: null,
            mfaAttempts: 0,
            mfaLastSentAt: null,
          },
        });

        await tx.adminSecurityEvent.create({
          data: {
            action: 'USER_PASSWORD_SET',
            actorUserId: request.user.id,
            targetUserId: id,
          },
        });
      });

      return reply.send({ ok: true });
    });
}
