import crypto from 'node:crypto';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';
import mailer from '#lib/mailer.js';

function generateMfaCode () {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export default async function (fastify, opts) {
  fastify.post('/resend-code',
    {
      schema: {
        description: 'Resend MFA verification code.',
        body: z.object({
          token: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            mfaToken: z.string().uuid(),
            email: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { token } = request.body;

      const data = await fastify.prisma.user.findUnique({
        where: { mfaToken: token },
      });

      if (!data || !data.mfaCode) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Invalid verification token' });
      }

      const user = new User(data);

      // Check resend cooldown (30 seconds, but first resend after login is immediate)
      if (user.mfaLastSentAt) {
        const secondsSinceLastSend = (Date.now() - new Date(user.mfaLastSentAt).getTime()) / 1000;
        if (secondsSinceLastSend < 30) {
          return reply.code(StatusCodes.TOO_MANY_REQUESTS).send({ error: 'Please wait before requesting a new code.' });
        }
      }

      // Generate new code and token
      const mfaCode = generateMfaCode();
      const mfaToken = crypto.randomUUID();
      const mfaExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaCode,
          mfaToken,
          mfaExpiresAt,
          mfaAttempts: 0,
          mfaLastSentAt: new Date(),
        },
      });

      // Send verification email
      await mailer.send({
        message: {
          to: user.fullNameAndEmail,
        },
        template: 'verification-code',
        locals: {
          firstName: user.firstName,
          code: mfaCode,
        },
      });

      return reply.send({
        mfaToken,
        email: user.email,
      });
    });
}
