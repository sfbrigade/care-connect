export default async function (fastify, opts) {
  await fastify.register(import('./create.js'));
}
