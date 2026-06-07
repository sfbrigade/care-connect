#!/usr/bin/env node
/**
 * Sends a test push notification to all subscriptions for a given user email,
 * or to the most recently created subscription if no email is given.
 *
 * Usage:
 *   node server/bin/send-test-push.js
 *   node server/bin/send-test-push.js officer@sfpd.gov
 *   node server/bin/send-test-push.js officer@sfpd.gov "Custom title" "Custom body"
 */

import '../config.js';
import prisma from '#prisma/client.js';
import webpush from '#lib/webpush.js';

const [, , email, title = 'Test notification', body = 'Push notifications are working.'] = process.argv;

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in .env');
  process.exit(1);
}

const where = email
  ? { user: { email } }
  : {};

const subscriptions = await prisma.pushSubscription.findMany({
  where,
  include: { user: { select: { email: true } } },
  orderBy: { createdAt: 'desc' },
  take: email ? undefined : 1,
});

if (subscriptions.length === 0) {
  console.error(email
    ? `No push subscriptions found for ${email}`
    : 'No push subscriptions found. Grant notification permission in the app first.'
  );
  process.exit(1);
}

console.log(`Sending to ${subscriptions.length} subscription(s)…`);

const payload = JSON.stringify({
  title,
  body,
  data: { url: '/holds', tag: 'test-push' },
});

for (const sub of subscriptions) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    console.log(`  ✓ ${sub.user.email} (${sub.endpoint.slice(0, 60)}…)`);
  } catch (err) {
    if (err.statusCode === 410) {
      console.log(`  ✗ ${sub.user.email} — subscription expired (410), removing`);
      await prisma.pushSubscription.delete({ where: { id: sub.id } });
    } else {
      console.error(`  ✗ ${sub.user.email} — ${err.message}`);
    }
  }
}

await prisma.$disconnect();
