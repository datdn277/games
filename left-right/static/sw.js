const prefix = `little-explorer:${self.registration.scope}:`;
const cacheName = prefix + "77762d7115e5";
const files = ["assets/index-BOAObAfI.css","assets/index-DP0XOAbU.js","assets/three-C7CGJ_1z.js","index.html","mimo.svg","fonts/nunito-latin.woff2","fonts/nunito-vietnamese.woff2"];
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
