/* GRID-X Partner service worker — low-connectivity support (Section 8).
 * Navigations use network-first with a cache fallback so a partner can still
 * open jobs they have already visited while offline. */
const CACHE = 'gridx-partner-v1';
const OFFLINE_FALLBACK = '/partner';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_FALLBACK])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/partner') && !url.pathname.startsWith('/_next')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match(OFFLINE_FALLBACK);
        return fallback ?? Response.error();
      }),
  );
});
