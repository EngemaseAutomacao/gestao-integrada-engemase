// ============================================================
// Service Worker with version-aware cache invalidation
// ============================================================

const STATIC_CACHE = 'engemase-static-v8';
const DYNAMIC_CACHE = 'engemase-dynamic-v8';
const MAX_CACHE_SIZE = 50;
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// ---- Version checking ----
let currentVersion = null;

async function checkForUpdates() {
  try {
    const response = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const newVersion = data.version;

    if (currentVersion === null) {
      currentVersion = newVersion;
      console.log('[SW] Initial version:', currentVersion);
      return;
    }

    if (newVersion !== currentVersion) {
      console.log('[SW] Version changed:', currentVersion, '→', newVersion);
      currentVersion = newVersion;
      await purgeAllCaches();
      // Notify all clients to reload
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.postMessage({ type: 'VERSION_UPDATED', version: newVersion }));
    }
  } catch (e) {
    // Offline or network error — ignore
  }
}

async function purgeAllCaches() {
  const names = await caches.keys();
  await Promise.all(names.map(name => caches.delete(name)));
  console.log('[SW] All caches purged for new version');
  // Re-populate static cache
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(urlsToCache).catch(() => {});
}

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
        names.filter(n => !keep.includes(n)).map(n => {
          console.log('[SW] Removing old cache:', n);
          return caches.delete(n);
        })
      ))
      .then(() => self.clients.claim())
      .then(() => checkForUpdates())
  );
});

// ---- Fetch strategies ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip version.json — always network
  if (url.pathname === '/version.json') {
    event.respondWith(fetch(event.request));
    return;
  }

  // API requests: network-first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, clone);
            limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // JS/CSS: network-first (prevents stale bundles)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache first for other static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'error') return response;
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
  );
});

// ---- Periodic version check ----
setInterval(() => {
  checkForUpdates();
}, VERSION_CHECK_INTERVAL);

// Also check on SW update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    checkForUpdates();
  }
});

// ---- Push notifications ----
self.addEventListener('push', (event) => {
  let data = {
    title: 'Notificação',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/mono-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    })
  );
});

// ---- Notification click ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

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

self.addEventListener('notificationclose', () => {});
