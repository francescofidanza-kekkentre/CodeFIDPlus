const CACHE_NAME = 'codefid-plus-v6';

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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 1. Never cache external APIs or dynamic Antigravity bridge calls
  if (
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('api.anthropic.com') ||
    url.pathname.includes('/api/antigravity') ||
    url.pathname.includes('/api/claude')
  ) {
    return;
  }

  // 2. Cache-First for immutable Vite hashed assets (/assets/*-[hash].js|css)
  // index.html remains Strict Network-First, so new deploys always reference new hashes.
  if (
    url.origin === self.location.origin &&
    /\/assets\/.+-[a-zA-Z0-9_-]{6,}\.(js|css)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Strict Network-First Strategy for HTML and non-hashed resources:
  // ALWAYS fetch fresh from the network (no-store) so the user gets the latest UI updates.
  // Fall back to cache ONLY when offline.
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
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
