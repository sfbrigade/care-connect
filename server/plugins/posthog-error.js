import fp from 'fastify-plugin';
import { captureException, shutdown } from '#lib/posthog.js';

const SHUTDOWN_TIMEOUT_MS = 2000;

let processHandlersRegistered = false;

function flushAndExit () {
  // Hard cap: if PostHog's flush hangs on the network, exit anyway.
  const forceExit = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  shutdown().catch(() => {}).finally(() => {
    clearTimeout(forceExit);
    process.exit(1);
  });
}

async function posthogErrorPlugin (fastify) {
  fastify.addHook('onError', async (request, reply, error) => {
    try {
      const statusCode = error.statusCode ?? 500;
      if (statusCode < 500) return;

      const distinctId = request.user?.id ?? 'care-connect-server';
      captureException(error, distinctId, {
        method: request.method,
        route: request.routeOptions?.url ?? request.url,
        statusCode,
        facility: request.facility?.subdomain ?? null,
        userId: request.user?.id ?? null,
        userRoles: request.user?.roles ?? null,
        isAdmin: request.user?.isAdmin ?? null,
        requestId: request.id,
      });
    } catch (e) {
      fastify.log.error({ err: e }, 'posthog capture failed');
    }
  });

  if (!processHandlersRegistered) {
    processHandlersRegistered = true;
    process.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      captureException(err, 'care-connect-server', { source: 'unhandledRejection' });
      flushAndExit();
    });
    process.on('uncaughtException', (err) => {
      captureException(err, 'care-connect-server', { source: 'uncaughtException' });
      flushAndExit();
    });
  }
}

export default fp(posthogErrorPlugin);
