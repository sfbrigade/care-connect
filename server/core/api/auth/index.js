export default async function (fastify, opts) {
  // Load auth routes (login.js, logout.js, register.js)
  // The prefix /api/auth is added by the parent index.js
  // Don't pass opts (which has prefix) - the prefix is already applied by parent
  await fastify.register(import('./login.js'), {});
  await fastify.register(import('./logout.js'), {});
  await fastify.register(import('./register.js'), {});
}
