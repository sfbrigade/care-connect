import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

let client = null;

if (apiKey) {
  client = new PostHog(apiKey, { host });
}

export function captureEvent (event, properties = {}) {
  if (!client) return;
  client.capture({
    distinctId: 'care-connect-worker',
    event,
    properties,
  });
}

export async function shutdown () {
  if (!client) return;
  await client.shutdown();
}
