const version = __CACHE_NAME__;
const files = __GAME_FILES__;
const scope = self.registration.scope;
const cachePrefix = `magic-fingers:${scope}:`;
const cacheName = cachePrefix + version;
const entry = new URL('index.html', scope).href;
const assetURLs = new Set(files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName)
    .then(cache => cache.addAll([...assetURLs].map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && (url.pathname === new URL(entry).pathname || url.pathname === new URL(scope).pathname)) {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(entry)) || fetch(request)));
  } else if (assetURLs.has(request.url)) {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
