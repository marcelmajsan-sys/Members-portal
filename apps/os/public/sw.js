/* Service worker admin panela — minimalan, siguran po defaultu:
   - statički Next asseti (/admin/_next/static, slike): cache-first (immutable)
   - navigacije: network-first s fallbackom na zadnju keširanu verziju (offline)
   - API pozivi (druga domena, /api/): uvijek mreža, bez keširanja
   Scope je /admin/ (SW se servira s /admin/sw.js). */

const VERSION = 'v2';
const STATIC_CACHE = `os-static-${VERSION}`;
const PAGE_CACHE = `os-pages-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Precache početne stranice — offline fallback za navigacije inače nema što poslužiti
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add('/admin')).catch(() => {}),
  );
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

  // Hashirani Next asseti — immutable, čisti cache-first
  if (url.pathname.startsWith('/admin/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Ostale slike/ikone (nemaju hash u imenu) — stale-while-revalidate,
  // da zamjena npr. logo.png pod istim imenom ne ostane zauvijek stara
  if (/\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const refresh = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || refresh;
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
        .catch(() => caches.open(PAGE_CACHE).then((cache) => cache.match(req).then((hit) => hit || cache.match('/admin')))),
    );
  }
});
