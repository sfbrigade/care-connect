export default async function (fastify, opts) {
  fastify.register(import('./create.js'));
  fastify.register(import('./get.js'));
  fastify.register(import('./list.js'));
  fastify.register(import('./update.js'));
  fastify.register(import('./find-by-cad.js'));
}
