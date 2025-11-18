export default async function (fastify, opts) {
  await fastify.register(import('./availability.js'), { prefix: '/availability' });
  // holds/index.js is automatically loaded by Fastify autoload
}

