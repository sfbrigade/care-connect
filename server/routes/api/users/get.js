import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get(
    '/:id',
    {
      schema: {
        descriptions: 'Returns a User object by id.',
        params: z.object({
          id: z.string().uuid()
        }),
        response: {
          [StatusCodes.OK]: User.ResponseSchema,
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
      onRequest: fastify.requireUser
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = await fastify.prisma.user.findUnique({
        where: { id },
      });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      if (data.id !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      reply.send(new User(data));
    }
  );
}
