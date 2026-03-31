import crypto from 'node:crypto';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';
import mailer from '#lib/mailer.js';

function generateMfaCode () {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export default async function (fastify, opts) {
  fastify.post('/login',
    {
      schema: {
        description: 'Creates an authenticated session with email and password.',
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          [StatusCodes.OK]: z.union([
            User.ResponseSchema,
            z.object({
              mfaRequired: z.literal(true),
              mfaToken: z.string().uuid(),
              email: z.string(),
            }),
          ]),
          [StatusCodes.UNPROCESSABLE_ENTITY]: fastify.ValidationErrorSchema,
        },
      },
      attachValidation: true,
    },
    async function (request, reply) {
      const { email, password } = request.body;

      // If user already has a valid session, skip MFA
      if (request.user) {
        return reply.send(request.user);
      }

      const data = await fastify.prisma.user.findUnique({
        where: { email },
        include: {
          organization: true,
          title: true,
          unit: true,
        },
      });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      const user = new User(data);
      const result = await user.comparePassword(password);
      if (!result) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send();
      }
      if (!user.isActive) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      // Generate MFA code and token
      const mfaCode = generateMfaCode();
      const mfaToken = crypto.randomUUID();
      const mfaExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaCode,
          mfaToken,
          mfaExpiresAt,
          mfaAttempts: 0,
          mfaLastSentAt: null,
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
        mfaRequired: true,
        mfaToken,
        email: user.email,
      });
    });
}
