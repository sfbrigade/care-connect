export default async function (fastify, opts) {
  fastify.register(import('./get.js'));
  fastify.register(import('./patch.js'));
}
