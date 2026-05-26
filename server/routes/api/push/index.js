import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const subscriptionBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export default async function (fastify, opts) {
  fastify.post('/subscribe',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Register or re-associate a push subscription with the current user.',
        body: subscriptionBody,
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { endpoint, keys: { p256dh, auth } } = request.body;

      await fastify.prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: request.user.id, endpoint, p256dh, auth },
        update: { userId: request.user.id, p256dh, auth },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });

  fastify.delete('/subscribe',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Remove a push subscription for the current user.',
        body: z.object({
          endpoint: z.string().url(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      await fastify.prisma.pushSubscription.deleteMany({
        where: { endpoint: request.body.endpoint, userId: request.user.id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
