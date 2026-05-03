export default async function (fastify, opts) {
  fastify.post('/error',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Throws a canary error to verify PostHog Error Tracking captures Fastify exceptions (admin only).',
      },
    },
    async function (request, reply) {
      throw new Error('Canary: API exception');
    });
}
