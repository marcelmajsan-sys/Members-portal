/* Service worker članskog portala — minimalan, siguran po defaultu:
   - statički Next asseti (/_next/static, slike): cache-first (immutable)
   - navigacije: network-first s fallbackom na zadnju keširanu verziju (offline)
   - API pozivi (api.ecommerce.hr, /api/): uvijek mreža, bez keširanja */

const VERSION = 'v2';
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;

self.addEventListener('install', (event) => {
  // Pre-cache početne stranice da offline fallback (cache.match('/')) ima što pogoditi.
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add('/'))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API i sve s drugih domena — uvijek mreža
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Statika: hashirani Next asseti — cache-first (immutable);
  // ostalo (logo, ikone) — stale-while-revalidate (odmah iz cachea, osvježi u pozadini)
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    const immutable = url.pathname.startsWith('/_next/static/');
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit && immutable) return hit;
          const network = fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          });
          if (hit) {
            network.catch(() => {});
            return hit;
          }
          return network;
        }),
      ),
    );
    return;
  }

  // Navigacije — network-first, offline fallback na zadnju keširanu verziju
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.open(PAGE_CACHE).then((cache) => cache.match(req).then((hit) => hit || cache.match('/')))),
    );
  }
});
