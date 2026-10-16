/*
 * Marchmaker service worker.
 *  - Web push notifications.
 *  - A friendly offline page when a page load fails.
 * It deliberately caches nothing else: introductions, messages and account data always come
 * from the network and are never stored by the worker.
 */
const CACHE = 'mm-shell-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)    .then((c) => c.add(OFFLINE_URL)));
  // The new worker waits until the person chooses to update (see the "new version" prompt), so a page is never swapped mid-task.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only top-level page navigations; API calls, images and scripts go straight to the network.
  if (req.mode !== 'navigate') return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Marchmaker', body: 'You have a new update.', url: '/dashboard', tag: undefined };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // fall back to the generic message
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon.svg',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
