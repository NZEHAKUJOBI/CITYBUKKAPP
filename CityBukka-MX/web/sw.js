/* Chop City Bukka – service worker.
 *
 * CACHE_VERSION is replaced with a content hash by tool/build_pwa.dart, so every
 * new build gets a fresh cache and old ones are deleted on activate.
 */
const CACHE_VERSION = '__CACHE_VERSION__';
const APP_CACHE = `citybukka-app-${CACHE_VERSION}`;
const IMAGE_CACHE = 'citybukka-images-v1';
const FONT_CACHE = 'citybukka-fonts-v1';
const MAX_IMAGE_ENTRIES = 80;

// Minimal app shell. Everything else (main.dart.js, CanvasKit, assets) is
// cached as the page loads it – see the 'warm-cache' message below.
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'flutter_bootstrap.js',
  'favicon.png',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, IMAGE_CACHE, FONT_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// The page posts the URLs it loaded before this worker was controlling it
// (main.dart.js, CanvasKit wasm, fonts, …) so the first visit works offline too.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'warm-cache' || !Array.isArray(data.urls)) return;
  event.waitUntil(Promise.all(data.urls.map(async (url) => {
    try {
      const u = new URL(url);
      if (u.origin !== self.location.origin) return;
      const cache = await caches.open(APP_CACHE);
      if (await cache.match(u.href)) return;
      const res = await fetch(u.href);
      if (res.ok) await cache.put(u.href, res);
    } catch (_) { /* best effort */ }
  })));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page navigations: network first so new deployments show up, cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, APP_CACHE));
    return;
  }

  // Food photos (Unsplash) – cache first, bounded.
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(cacheFirst(req, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
    return;
  }

  // Fallback fonts Flutter fetches at runtime (Roboto, emoji, …).
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put('index.html', res.clone());
    return res;
  } catch (_) {
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return (await network) || Response.error();
}

async function cacheFirst(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    // Opaque (no-cors) responses have status 0 but are still usable.
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      if (maxEntries) trimCache(cache, maxEntries);
    }
    return res;
  } catch (_) {
    return Response.error();
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}
