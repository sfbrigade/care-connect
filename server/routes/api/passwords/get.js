import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get(
    '/:token',
    {
      schema: {
        description: 'Returns a status code whether the specified password reset token is valid or not.',
        params: z.object({
          token: z.string(),
        }),
        response: {
          [StatusCodes.OK]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.GONE]: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.params;

      let data;
      try {
        data = await fastify.prisma.user.findUniqueOrThrow({
          where: { passwordResetToken: token },
        });
      } catch {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const user = new User(data);
      if (!user.isPasswordResetTokenValid) {
        return reply.code(StatusCodes.GONE).send();
      }

      reply.send();
    }
  );
}
