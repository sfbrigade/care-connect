import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

const MeResponseSchema = User.ResponseSchema.extend({
  hasActiveHolds: z.boolean(),
});

export default async function (fastify, opts) {
  fastify.get('/me',
    {
      schema: {
        description: 'Returns the currently logged in User object, if any.',
        response: {
          [StatusCodes.OK]: MeResponseSchema,
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      if (request.user?.isActive) {
        const hasActiveHolds = (request.user.isField && request.user.isCustody)
          ? await request.user.hasActiveHolds(fastify.prisma)
          : false;
        return reply.send({
          ...request.user.toJSON(),
          pictureUrl: request.user.pictureUrl,
          hasActiveHolds,
        });
      }
      return reply.status(StatusCodes.NO_CONTENT).send();
    });
}
