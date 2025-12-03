export default async function (fastify, opts) {
  fastify.register(import('./availability.js'), { prefix: '/availability' });
  // Register holds routes - index.js defines GET /, register others directly
  fastify.register(import('./holds/index.js'), { prefix: '/holds' });
  fastify.register(import('./holds/create.js'), { prefix: '/holds' });
  fastify.register(import('./holds/extend.js'), { prefix: '/holds' });
  fastify.register(import('./holds/cancel.js'), { prefix: '/holds' });
  fastify.register(import('./intake/index.js'), { prefix: '/intake' });
  // Register checkin routes directly (index.js only registers create.js)
  fastify.register(import('./checkin/create.js'), { prefix: '/checkin' });
}
