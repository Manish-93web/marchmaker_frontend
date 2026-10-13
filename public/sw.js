// Marchmaker Service Worker — Safe Public Asset Caching Only
// Compliance Rule: NEVER cache private introductions, KYC documents, or member identity details.

const CACHE_NAME = "marchmaker-static-v1";
const STATIC_ASSETS = [
  "/",
  "/how-it-works",
  "/trust-and-safety",
  "/pricing",
  "/community-standards",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Install: Cache public pages and shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Purge older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first for API/dynamic, Cache first for safe static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // STRICT PRIVACY RULE: Never intercept or cache API requests or dashboard authenticated routes
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/onboarding")
  ) {
    return; // Pass through directly to network
  }

  // For safe static assets (CSS, JS, images, public pages)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful safe static GET requests
        if (
          event.request.method === "GET" &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".png"))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
