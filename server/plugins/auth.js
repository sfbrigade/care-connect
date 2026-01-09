import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';

import User from '#models/user.js';

export default fp(async function (fastify) {
  // set up secure encrypted cookie-based sessions
  await fastify.register(import('@fastify/secure-session'), {
    key: Buffer.from(process.env.SESSION_SECRET, 'hex'),
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: true,
      secure: process.env.BASE_URL?.startsWith('https'),
    },
  });
  // add a user object reference to the request instance
  fastify.decorateRequest('user', null);
  // add a hook to check for a signed in user on every request
  fastify.addHook('onRequest', async (request) => {
    // first check cookie-based session
    const id = request.session.get('userId');
    if (id) {
      try {
        const data = await fastify.prisma.user.findUnique({
          where: { id },
          include: {
            organization: true,
            title: true,
            unit: true,
          },
        });
        if (data) {
          request.user = new User(data);
        } else {
          // session data is invalid, delete
          request.session.delete();
        }
      } catch (error) {
        // If database is in recovery mode, skip user lookup for this request
        // This is a transient error that will resolve once PostgreSQL finishes recovery
        if (error.message?.includes('recovery mode')) {
          fastify.log.warn({ err: error }, 'Database in recovery mode, skipping user lookup');
          return;
        }
        // Re-throw other errors
        throw error;
      }
    }
  });

  const requireUser = (isAdmin) => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.code(StatusCodes.UNAUTHORIZED).send();
      }
      if (!request.user.isActive) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      if (isAdmin && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
    };
  };

  // onRequest handler to be used to ensure a user is logged in
  fastify.decorate('requireUser', requireUser(false));
  fastify.decorate('requireAdmin', requireUser(true));
});
