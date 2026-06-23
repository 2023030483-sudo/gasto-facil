const CACHE_NAME = 'gasto-facil-cache-v5-login-funcional';
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

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(event.request.destination)) {
    event.respondWith(cacheFirstWithUpdate(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request))
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request) || caches.match('/index.html') || caches.match('/');
  }
}

async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkResponse = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cachedResponse || networkResponse;
}



const CACHE_NAME = 'gasto-facil-cache-v8-logout';

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
  '/icons/icon-512.png',
  '/icons/logotipo.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;

  // Las funciones y las rutas de API siempre deben consultarse en red.
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/.netlify/functions/')
  ) {
    return;
  }

  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document'
  ) {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  // El código y los estilos se consultan primero en red para que los cambios
  // nuevos aparezcan inmediatamente después de publicar en Netlify.
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(cacheFirstWithUpdate(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;
    if (fallbackPath) return cache.match(fallbackPath);

    throw error;
  }
}

async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async response => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cachedResponse || networkResponsePromise;
}