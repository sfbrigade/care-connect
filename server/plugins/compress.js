import fp from 'fastify-plugin';
import fastifyCompress from '@fastify/compress';

export default fp(async (fastify) => {
  await fastify.register(fastifyCompress, {
    encodings: ['br', 'gzip'],
    threshold: 1024,
  });
});
