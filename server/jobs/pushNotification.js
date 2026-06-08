import prisma from '#prisma/client.js';
import webpush from '#lib/webpush.js';

/**
 * Send a push notification to all subscribed devices for one or more users.
 *
 * @param {object} data
 * @param {string|string[]} data.userIds - One or more user IDs to notify
 * @param {string} data.title - Notification title
 * @param {string} data.body - Notification body text
 * @param {string} [data.url] - Deep link opened when the notification is tapped
 * @param {string} [data.tag] - Replaces earlier notifications with the same tag
 */
export default async function pushNotification ({ userIds, title, body, url, tag }) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: ids } },
  });

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, data: { url, tag } });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410) {
          // Subscription has expired or been revoked — remove the stale record.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          throw err;
        }
      }
    })
  );
}
