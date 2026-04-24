import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

const MeResponseSchema = User.ResponseSchema.extend({
  hasActiveFieldWork: z.boolean(),
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
        const hasActiveFieldWork = (request.user.isField && request.user.isCustody)
          ? await request.user.hasActiveFieldWork(fastify.prisma)
          : false;
        return reply.send({
          ...request.user.toJSON(),
          pictureUrl: request.user.pictureUrl,
          hasActiveFieldWork,
        });
      }
      return reply.status(StatusCodes.NO_CONTENT).send();
    });
}
