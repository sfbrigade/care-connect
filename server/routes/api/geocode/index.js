export default async function (fastify, opts) {
  fastify.register(import('./reverse.js'));
}
