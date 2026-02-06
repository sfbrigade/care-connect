import fp from 'fastify-plugin';

export default fp(async (fastify, opts) => {
  const interval = setInterval(async () => {
    try {
      if (fastify.prisma) {
        await fastify.prisma.deflection.expire();
      }
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to process deflection expirations');
    }
  }, 60 * 1000); // Check every minute

  fastify.addHook('onClose', (instance, done) => {
    clearInterval(interval);
    done();
  });
});
