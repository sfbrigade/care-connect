import { PostHog } from 'posthog-node';

// Note: Posthog uses the same write-only token for both client and server
const apiKey = process.env.VITE_POSTHOG_KEY;
const host = process.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
const gitSha = process.env.VITE_GIT_SHA || null;

let client = null;

if (apiKey) {
  client = new PostHog(apiKey, { host });
}

function withRelease (properties) {
  if (!gitSha) return properties;
  return { ...properties, $git_commit: gitSha, release: gitSha };
}

export function captureEvent (event, properties = {}) {
  if (!client) return;
  client.capture({
    distinctId: 'care-connect-worker',
    event,
    properties: withRelease(properties),
  });
}

export function captureException (error, distinctId = 'care-connect-server', properties = {}) {
  if (!client) return;
  client.captureException(error, distinctId, withRelease(properties));
}

export async function shutdown () {
  if (!client) return;
  await client.shutdown();
}
