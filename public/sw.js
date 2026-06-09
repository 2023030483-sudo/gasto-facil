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
