import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Requests a password reset email.',
        body: z.object({
          email: z.string().email(),
        }),
        response: {
          [StatusCodes.OK]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { email } = request.body;
      const data = await fastify.prisma.user.findUnique({ where: { email } });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      const user = new User(data);
      user.generatePasswordResetToken();
      const { id, passwordResetToken } = data;
      await fastify.prisma.user.update({
        where: { id },
        data: {
          passwordResetToken,
          passwordResetExpiresAt: new Date(
            new Date().getTime() + 30 * 60000
          ).toISOString(),
        },
      });
      await user.sendPasswordResetEmail();
      return reply.send();
    });
}
