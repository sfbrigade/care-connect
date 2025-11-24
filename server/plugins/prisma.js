import fp from 'fastify-plugin';

import prisma from '#prisma/client.js';

const prismaPlugin = fp(async (fastify) => {
  try {
    await prisma.$connect();
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to database');
    throw error;
  }

  // Make Prisma Client available through the fastify server instance: server.prisma
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (fastify) => {
    await fastify.prisma.$disconnect();
  });
});

export default prismaPlugin;
