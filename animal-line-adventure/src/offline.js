const scope = self.registration.scope;
const prefix = `animal-line-adventure:${scope}:`;
const cacheName = prefix + __VERSION__;
const files = new Set(__FILES__.map((file) => new URL(file, scope).href));
const index = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...files])));
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
    && (url.pathname === new URL(index).pathname || url.pathname === new URL(scope).pathname);
  if (gamePage || files.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(async (cache) =>
      (await cache.match(gamePage ? index : request)) ?? fetch(request),
    ));
  }
});
