import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock posthog-node BEFORE importing the module under test so the real
// PostHog constructor never runs. The default spy lets us inspect client calls.
const captureExceptionSpy = mock.fn();
const captureSpy = mock.fn();
const shutdownSpy = mock.fn(async () => {});

mock.module('posthog-node', {
  namedExports: {
    PostHog: class MockPostHog {
      constructor (apiKey, options) {
        this.apiKey = apiKey;
        this.options = options;
      }

      captureException (error, distinctId, properties) {
        captureExceptionSpy(error, distinctId, properties);
      }

      capture (payload) {
        captureSpy(payload);
      }

      async shutdown () {
        shutdownSpy();
      }
    },
  },
});

test('captureException — no-op when VITE_POSTHOG_KEY unset', async () => {
  // Clear key before import
  const prev = process.env.VITE_POSTHOG_KEY;
  delete process.env.VITE_POSTHOG_KEY;
  captureExceptionSpy.mock.resetCalls();

  // Dynamic import so module-level client init runs with current env
  const { captureException } = await import(`../../lib/posthog.js?no-key=${Date.now()}`);
  captureException(new Error('boom'));
  assert.equal(captureExceptionSpy.mock.calls.length, 0);

  if (prev !== undefined) process.env.VITE_POSTHOG_KEY = prev;
});

test('captureException — forwards error, distinctId, and properties to client', async () => {
  process.env.VITE_POSTHOG_KEY = 'test-key';
  captureExceptionSpy.mock.resetCalls();

  const { captureException } = await import(`../../lib/posthog.js?with-key=${Date.now()}`);
  const err = new Error('boom');
  captureException(err, 'user-123', { method: 'POST', route: '/x' });

  assert.equal(captureExceptionSpy.mock.calls.length, 1);
  const [errArg, distinctId, properties] = captureExceptionSpy.mock.calls[0].arguments;
  assert.equal(errArg, err);
  assert.equal(distinctId, 'user-123');
  assert.deepEqual(properties, { method: 'POST', route: '/x' });
});

test('captureException — falls back to default distinctId when none provided', async () => {
  process.env.VITE_POSTHOG_KEY = 'test-key';
  captureExceptionSpy.mock.resetCalls();

  const { captureException } = await import(`../../lib/posthog.js?default-id=${Date.now()}`);
  captureException(new Error('x'));

  const [, distinctId] = captureExceptionSpy.mock.calls[0].arguments;
  assert.equal(distinctId, 'care-connect-server');
});
