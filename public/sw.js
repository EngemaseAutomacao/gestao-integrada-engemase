// ============================================================
// Service Worker - Engemase
// ============================================================

const STATIC_CACHE = 'engemase-static-v1';
const DYNAMIC_CACHE = 'engemase-dynamic-v1';
const MAX_CACHE_SIZE = 50;

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// ---- Cache size limiter ----
async function limitCacheSize(name, size) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > size) {
    await cache.delete(keys[0]);
    await limitCacheSize(name, size);
  }
}

// ---- Install ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate ----
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => !keep.includes(n)).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ---- Fetch strategies ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Do not cache supabase API calls except public storage
  if (url.hostname.includes('supabase.co')) {
    const isPublicStorage = url.pathname.startsWith('/storage/v1/object/public/');
    if (!isPublicStorage) {
      event.respondWith(fetch(event.request).catch(() => new Response(null, { status: 503 })));
      return;
    }
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'error') return response;
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, clone);
            limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE);
          });
          return response;
        });
      })
  );
});

// ---- Background Sync ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          for (const client of clientList) {
            client.postMessage({ type: 'TRIGGER_SYNC' });
          }
        })
    );
  }
});

// ---- Push notifications ----
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notificação', {
        body: data.body || '',
        icon: data.icon || '/icon-192.png',
        badge: '/mono-192.png',
        data: data.data || {}
      })
    );
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Engemase', { body: text })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
      })
  );
});
