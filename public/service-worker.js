const CACHE_NAME = 'gasto-facil-cache-v13-notificaciones-menu';

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
  '/js/presupuesto.js',
  '/js/presupuesto-utils.js',
  '/js/presupuesto-alertas.js',
  '/js/supabase.js',
  '/404.html',
  '/escanear/',
  '/escanear/confirmar/',
  '/gastos/',
  '/gastos/nuevo/',
  '/resumen/',
  '/presupuesto/',
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
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetPath = event.notification.data?.url || '/presupuesto/';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windowClients) {
      if ('focus' in client) {
        if ('navigate' in client && client.url !== targetUrl) {
          await client.navigate(targetUrl);
        }
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});