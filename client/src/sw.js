import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, navigateFallback } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Activate immediately and claim all clients so deploys land quickly
// on long-lived tablet sessions.
self.skipWaiting();
clientsClaim();

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(navigateFallback({ fallbackURL: '/index.html' }), {
    denylist: [/^\/api\//, /^\/static-data\//],
  })
);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Care Connect';
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.data?.url ?? '/', tag: data.data?.tag },
    tag: data.data?.tag,
    // Keep notification visible until the user acts on it (desktop only).
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => 'focus' in c);
        if (existing) {
          existing.navigate(url);
          return existing.focus();
        }
        return clients.openWindow(url);
      })
  );
});
