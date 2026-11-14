const prefix = `little-explorer:${self.registration.scope}:`;
const cacheName = prefix + __VERSION__;
const files = __FILES__;
const urls = new Set(files.map((file) => new URL(file, self.registration.scope).href));
const index = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...urls])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const gamePage = request.mode === 'navigate'
    && (url.pathname === new URL(index).pathname || url.pathname === new URL(self.registration.scope).pathname);
  if (gamePage || urls.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(async (cache) =>
      (await cache.match(gamePage ? index : request)) ?? fetch(request),
    ));
  }
});
