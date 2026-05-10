import crypto from 'node:crypto';
import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';

import User from '#models/user.js';

const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;

export default fp(async function (fastify) {
  // set up secure encrypted cookie-based sessions
  await fastify.register(import('@fastify/secure-session'), {
    key: Buffer.from(process.env.SESSION_SECRET, 'hex'),
    expiry: SESSION_DURATION_SECONDS,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: true,
      secure: process.env.BASE_URL?.startsWith('https'),
      maxAge: SESSION_DURATION_SECONDS,
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
          // Rolling refresh: re-stamp the session's encrypted expiry timestamp
          // on every authenticated request so active users stay logged in
          // indefinitely. Sessions only expire after SESSION_DURATION_SECONDS
          // of inactivity.
          request.session.set('userId', id);
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

  const requireUser = async (request, reply) => {
    if (!request.user) {
      return reply.code(StatusCodes.UNAUTHORIZED).send();
    }
    if (!request.user.isActive) {
      return reply.code(StatusCodes.FORBIDDEN).send();
    }
  };

  const requireAdmin = async (request, reply) => {
    if (!request.user) {
      return reply.code(StatusCodes.UNAUTHORIZED).send();
    }
    if (!request.user.isActive || !request.user.isAdmin) {
      return reply.code(StatusCodes.FORBIDDEN).send();
    }
  };

  const requireRole = (...allowedRoles) => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.code(StatusCodes.UNAUTHORIZED).send();
      }
      if (!request.user.isActive) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      if (request.user.isAdmin) return;
      const userRoles = request.user.roles ?? [];
      if (!allowedRoles.some(r => userRoles.includes(r))) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
    };
  };

  // Bearer token check for external integrations (not tied to a user session).
  // Returns a Fastify hook that 401s unless the request's Authorization header
  // matches the configured env var via timing-safe comparison.
  const makeApiKeyGuard = (envVarName) => async (request, reply) => {
    const configured = process.env[envVarName];
    if (!configured) {
      return reply.code(StatusCodes.UNAUTHORIZED).send();
    }
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return reply.code(StatusCodes.UNAUTHORIZED).send();
    }
    const provided = Buffer.from(header.slice('Bearer '.length));
    const expected = Buffer.from(configured);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return reply.code(StatusCodes.UNAUTHORIZED).send();
    }
  };

  const requireCapacityApiKey = makeApiKeyGuard('CAPACITY_API_KEY');
  const requireArrestsApiKey = makeApiKeyGuard('ARRESTS_API_KEY');

  fastify.decorate('requireUser', requireUser);
  fastify.decorate('requireAdmin', requireAdmin);
  fastify.decorate('requireCapacityApiKey', requireCapacityApiKey);
  fastify.decorate('requireArrestsApiKey', requireArrestsApiKey);
  fastify.decorate('requireRole', requireRole);
  fastify.decorate('requireField', requireRole(User.Role.FIELD));
  fastify.decorate('requireCustody', requireRole(User.Role.CUSTODY));
  fastify.decorate('requireCare', requireRole(User.Role.CARE));
  fastify.decorate('requireLawEnforcement', requireRole(User.Role.FIELD, User.Role.CUSTODY));
  fastify.decorate('requireFacilityAdmin', requireRole(User.Role.FACILITY_ADMIN));
});
