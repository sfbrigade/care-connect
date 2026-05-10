import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/verify-code',
    {
      schema: {
        description: 'Verify MFA code to complete login.',
        body: z.object({
          token: z.string().uuid(),
          code: z.string().length(6),
        }),
        response: {
          [StatusCodes.OK]: User.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { token, code } = request.body;

      const data = await fastify.prisma.user.findUnique({
        where: { mfaToken: token },
        include: {
          organization: true,
          title: true,
          unit: true,
        },
      });

      if (!data || !data.mfaCode) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Invalid verification token' });
      }

      const user = new User(data);

      if (!user.isActive) {
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            mfaCode: null,
            mfaToken: null,
            mfaExpiresAt: null,
            mfaAttempts: 0,
            mfaLastSentAt: null,
          },
        });
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      // Check if too many attempts
      if (user.mfaAttempts >= 5) {
        return reply.code(StatusCodes.TOO_MANY_REQUESTS).send({ error: 'Too many attempts. Please wait and try again.' });
      }

      // Check if expired
      if (new Date() > new Date(user.mfaExpiresAt)) {
        return reply.code(StatusCodes.GONE).send({ error: 'That code has expired. Request a new one.' });
      }

      // Check code
      if (code !== user.mfaCode) {
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { mfaAttempts: { increment: 1 } },
        });
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'That code is incorrect. Try again.' });
      }

      // Success — clear MFA fields and create session
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaCode: null,
          mfaToken: null,
          mfaExpiresAt: null,
          mfaAttempts: 0,
          mfaLastSentAt: null,
        },
      });

      request.session.set('userId', user.id);
      return reply.send(user);
    });
}
