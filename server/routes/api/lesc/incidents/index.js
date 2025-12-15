export default async function (fastify, opts) {
  fastify.register(import('./create.js'));
  // get.js and list.js will be registered in Phase 2.2 and 2.3
}

