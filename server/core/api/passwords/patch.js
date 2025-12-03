import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.patch(
    '/:token',
    {
      schema: {
        description: 'Sets a new password for the User associated with the token.',
        params: z.object({
          token: z.string(),
        }),
        body: z.object({
          password: User.PasswordSchema,
        }),
        response: {
          [StatusCodes.OK]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.GONE]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: fastify.ValidationErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { token: passwordResetToken } = request.params;
      const { password } = request.body;
      try {
        const data = await fastify.prisma.user.findUniqueOrThrow({
          where: { passwordResetToken },
        });
        const user = new User(data);
        if (!user.isPasswordResetTokenValid) {
          return reply.code(StatusCodes.GONE).send();
        }
        await user.setPassword(password);
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: null,
            passwordResetExpiresAt: null,
            hashedPassword: user.hashedPassword,
          },
        });
        return reply.send();
      } catch (error) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
    }
  );
}
