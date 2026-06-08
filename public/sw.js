const CACHE_NAME = 'gasto-facil-cache-v1';
const ASSETS = [
  '/',
  '/css/main.css',
  '/manifest.json',
  '/js/pwa-register.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          if (event.request.method === 'GET' && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(() => caches.match('/'));
    })
  );
});
