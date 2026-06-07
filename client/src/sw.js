import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Activate immediately and claim all clients so deploys land quickly
// on long-lived tablet sessions.
self.skipWaiting();
clientsClaim();

// Push and notification handlers are registered first so a precaching error
// can never prevent them from running.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Care Connect';
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.data?.url ?? '/', tag: data.data?.tag },
    tag: data.data?.tag,
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

// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time.
// Fall back to [] in dev mode so a missing injection doesn't crash the SW.
precacheAndRoute(self.__WB_MANIFEST ?? []);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/static-data\//],
  })
);
