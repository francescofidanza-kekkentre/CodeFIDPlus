const CACHE_NAME = 'codefid-plus-v2';

// Force immediate activation without waiting for existing tabs to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Never cache external APIs or dynamic Antigravity bridge calls
  if (
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.pathname.includes('/api/antigravity')
  ) {
    return;
  }

  // 2. Strict Network-First Strategy:
  // ALWAYS fetch fresh from the network (no-cache) so the user gets the latest UI updates.
  // Fall back to cache ONLY when offline.
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Offline fallback
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Modalità offline attiva', { status: 503 });
      })
  );
});
