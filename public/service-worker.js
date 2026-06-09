const CACHE_NAME = 'gasto-facil-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/manifest.json',
  '/js/pwa-register.js',
  '/js/index.js',
  '/js/common.js',
  '/js/config.js',
  '/js/escanear.js',
  '/js/gastos.js',
  '/js/nuevo-gasto.js',
  '/js/confirmar-gasto.js',
  '/js/resumen.js',
  '/js/supabase.js',
  '/404.html',
  '/escanear/',
  '/escanear/confirmar/',
  '/gastos/',
  '/gastos/nuevo/',
  '/resumen/',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
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
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});
