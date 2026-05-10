import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

const captureException = mock.fn();
const shutdown = mock.fn(async () => {});

mock.module('#lib/posthog.js', {
  namedExports: {
    captureException,
    captureEvent: () => {},
    shutdown,
  },
});

const { default: posthogErrorPlugin } = await import('../../plugins/posthog-error.js');

beforeEach(() => {
  captureException.mock.resetCalls();
  shutdown.mock.resetCalls();
});

test('posthog-error plugin — captures 5xx errors', async (t) => {
  const app = Fastify();
  await app.register(posthogErrorPlugin);
  app.get('/boom', async () => {
    throw new Error('something broke');
  });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/boom' });

  assert.equal(res.statusCode, 500);
  assert.equal(captureException.mock.calls.length, 1);

  const [errArg] = captureException.mock.calls[0].arguments;
  assert.ok(errArg instanceof Error);
  assert.equal(errArg.message, 'something broke');
});

test('posthog-error plugin — does NOT capture 4xx errors', async (t) => {
  const app = Fastify();
  await app.register(posthogErrorPlugin);
  app.get('/bad', async () => {
    const err = new Error('bad request');
    err.statusCode = 400;
    throw err;
  });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/bad' });

  assert.equal(res.statusCode, 400);
  assert.equal(captureException.mock.calls.length, 0);
});

test('posthog-error plugin — attaches request context payload', async (t) => {
  const app = Fastify();
  // Simulate what auth + facility plugins do in prod
  app.addHook('preHandler', async (request) => {
    request.user = { id: 'user-abc', roles: ['FIELD'], isAdmin: false };
    request.facility = { subdomain: 'lesc' };
  });
  await app.register(posthogErrorPlugin);
  app.post('/api/things/:id/break', async () => {
    throw new Error('nope');
  });
  t.after(() => app.close());

  const res = await app.inject({
    method: 'POST',
    url: '/api/things/42/break',
    headers: { host: 'lesc.example.com' },
  });

  assert.equal(res.statusCode, 500);
  assert.equal(captureException.mock.calls.length, 1);

  const [, distinctId, properties] = captureException.mock.calls[0].arguments;
  assert.equal(distinctId, 'user-abc');
  assert.equal(properties.method, 'POST');
  assert.equal(properties.route, '/api/things/:id/break');
  assert.equal(properties.statusCode, 500);
  assert.equal(properties.facility, 'lesc');
  assert.equal(properties.userId, 'user-abc');
  assert.deepEqual(properties.userRoles, ['FIELD']);
  assert.equal(properties.isAdmin, false);
  assert.ok(properties.requestId, 'requestId should be present');
});

test('posthog-error plugin — unauthenticated request uses default distinctId', async (t) => {
  const app = Fastify();
  await app.register(posthogErrorPlugin);
  app.get('/api/public/boom', async () => {
    throw new Error('nope');
  });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/api/public/boom' });

  assert.equal(res.statusCode, 500);
  const [, distinctId, properties] = captureException.mock.calls[0].arguments;
  assert.equal(distinctId, 'care-connect-server');
  assert.equal(properties.userId, null);
  assert.equal(properties.userRoles, null);
  assert.equal(properties.isAdmin, null);
  assert.equal(properties.facility, null);
});

test('posthog-error plugin — registers process listeners at most once', async (t) => {
  const beforeUR = process.listeners('unhandledRejection').length;
  const beforeUE = process.listeners('uncaughtException').length;

  const app1 = Fastify();
  await app1.register(posthogErrorPlugin);
  const app2 = Fastify();
  await app2.register(posthogErrorPlugin);
  t.after(async () => {
    await app1.close();
    await app2.close();
  });

  const afterUR = process.listeners('unhandledRejection').length;
  const afterUE = process.listeners('uncaughtException').length;

  // Delta is 0 (already registered by an earlier test) or 1 (first time).
  // Key invariant: two plugin registrations must NOT add two listeners.
  const deltaUR = afterUR - beforeUR;
  const deltaUE = afterUE - beforeUE;
  assert.ok(deltaUR === 0 || deltaUR === 1, `unhandledRejection delta should be 0 or 1, got ${deltaUR}`);
  assert.ok(deltaUE === 0 || deltaUE === 1, `uncaughtException delta should be 0 or 1, got ${deltaUE}`);
});

test('posthog-error plugin — unhandledRejection handler captures, flushes, and exits', async (t) => {
  const app = Fastify();
  await app.register(posthogErrorPlugin);
  t.after(() => app.close());

  t.mock.method(process, 'exit', () => {});

  // Grab the most recently registered unhandledRejection listener (ours).
  const listeners = process.listeners('unhandledRejection');
  const ourListener = listeners[listeners.length - 1];

  ourListener(new Error('rejected'));
  // Let shutdown().finally(exit) chain settle.
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(captureException.mock.calls.length, 1);
  const [errArg, distinctId, properties] = captureException.mock.calls[0].arguments;
  assert.ok(errArg instanceof Error);
  assert.equal(distinctId, 'care-connect-server');
  assert.equal(properties.source, 'unhandledRejection');
  assert.equal(shutdown.mock.calls.length, 1);
  assert.equal(process.exit.mock.calls.length, 1);
  assert.deepEqual(process.exit.mock.calls[0].arguments, [1]);
});

test('posthog-error plugin — uncaughtException handler captures, flushes, and exits', async (t) => {
  const app = Fastify();
  await app.register(posthogErrorPlugin);
  t.after(() => app.close());

  t.mock.method(process, 'exit', () => {});

  const listeners = process.listeners('uncaughtException');
  const ourListener = listeners[listeners.length - 1];

  ourListener(new Error('fatal'));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(captureException.mock.calls.length, 1);
  const [, , properties] = captureException.mock.calls[0].arguments;
  assert.equal(properties.source, 'uncaughtException');
  assert.equal(shutdown.mock.calls.length, 1);
  assert.equal(process.exit.mock.calls.length, 1);
  assert.deepEqual(process.exit.mock.calls[0].arguments, [1]);
});

test('posthog-error plugin — capture failure does not break 500 response', async (t) => {
  // Make captureException throw exactly once for this test
  captureException.mock.mockImplementationOnce(() => {
    throw new Error('posthog client exploded');
  });

  const app = Fastify();
  await app.register(posthogErrorPlugin);
  app.get('/boom', async () => {
    throw new Error('the actual error');
  });
  t.after(() => app.close());

  const res = await app.inject({ method: 'GET', url: '/boom' });

  assert.equal(res.statusCode, 500);
  assert.ok(res.body.length > 0, 'should return a response body even if capture throws');
  assert.equal(captureException.mock.calls.length, 1, 'capture was still attempted');
});
