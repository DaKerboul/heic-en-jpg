/* SW minimaliste : runtime cache-first same-origin (shell + WASM + assets).
   La conversion elle-même ne fait aucun réseau : l'app reste utilisable hors-ligne après 1re visite. */
const CACHE = 'convertisseur-local-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/').catch(() => undefined)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Ne met en cache que le même origine (jamais d'images utilisateur : ce sont des blob: locaux).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy).catch(() => undefined));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
