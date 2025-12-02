export default async function (fastify, opts) {
  // Load auth routes (login.js, logout.js, register.js)
  // The prefix /api/auth is added by the parent index.js
  fastify.register(import('./login.js'), opts);
  fastify.register(import('./logout.js'), opts);
  fastify.register(import('./register.js'), opts);
}
