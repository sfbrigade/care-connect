export default async function (fastify, opts) {
  await fastify.register(import('./availability.js'), { prefix: '/availability' });
  // holds/index.js, intake/index.js, and checkin/index.js are automatically loaded by Fastify autoload
}
