import { StatusCodes } from 'http-status-codes';

import { QUEUE_CANARY } from '#lib/jobQueue/queueNames.js';

export default async function (fastify, opts) {
  fastify.post('/job',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Enqueues a canary pg-boss job that throws, to verify PostHog captures worker exceptions (admin only).',
      },
    },
    async function (request, reply) {
      await fastify.backgroundJobs.send(QUEUE_CANARY, {});
      return reply.code(StatusCodes.ACCEPTED).send({ enqueued: true });
    });
}
