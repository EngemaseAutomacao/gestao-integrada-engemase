/// <reference lib="webworker" />
// ============================================================
// Service Worker (gerado via vite-plugin-pwa / injectManifest)
// Preserva integralmente o comportamento do public/sw.js original:
//  - Version polling (/version.json) + banner via postMessage
//  - Background Sync ('sync-pending') -> TRIGGER_SYNC nos clients
//  - Periodic Sync ('engemase-periodic-sync')
//  - Push agrupado por tag
//  - Notification click/close
// Adiciona: precache automático e versionado do Workbox.
// ============================================================
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ---- Precache automático (substituído no build) ----
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const STATIC_CACHE = "engemase-static-v10";
const DYNAMIC_CACHE = "engemase-dynamic-v10";
const MAX_CACHE_SIZE = 50;
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 min

const urlsToCache = ["/", "/index.html", "/manifest.json", "/icon.png"];

// ---- Version checking ----
let currentVersion: string | null = null;

async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const newVersion = data.version as string;

    if (currentVersion === null) {
      currentVersion = newVersion;
      console.log("[SW] Initial version:", currentVersion);
      return;
    }

    if (newVersion !== currentVersion) {
      console.log("[SW] Version changed:", currentVersion, "→", newVersion);
      currentVersion = newVersion;
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) =>
        client.postMessage({ type: "VERSION_UPDATED", version: newVersion })
      );
    }
  } catch {
    /* offline ou erro de rede — ignorar */
  }
}

async function limitCacheSize(name: string, size: number): Promise<void> {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > size) {
    await cache.delete(keys[0]);
    await limitCacheSize(name, size);
  }
}

// ---- Install ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate ----
self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !keep.includes(n) && !n.startsWith("workbox-"))
            .map((n) => {
              console.log("[SW] Removing old cache:", n);
              return caches.delete(n);
            })
        )
      )
      .then(() => self.clients.claim())
      .then(() => checkForUpdates())
  );
});

// ---- Fetch strategies (mantidas idênticas ao SW custom anterior) ----
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname === "/version.json") {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML navigations — NetworkFirst (nunca servir HTML antigo do cache).
  // Garante que o banner "Atualizar" + reload pegue o index.html novo,
  // sem precisar limpar cache manualmente.
  if (
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(
          () =>
            (caches.match(event.request) as Promise<Response | undefined>).then(
              (cached) => cached || (caches.match("/") as Promise<Response>)
            ) as Promise<Response>
        )
    );
    return;
  }

  if (url.hostname.includes("supabase.co")) {
    const isPublicStorage = url.pathname.startsWith("/storage/v1/object/public/");
    if (!isPublicStorage) {
      event.respondWith(
        fetch(event.request).catch(() => new Response(null, { status: 503 }))
      );
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
            limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE);
          });
          return response;
        })
        .catch(() => caches.match(event.request) as Promise<Response>)
    );
    return;
  }

  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) as Promise<Response>)
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "error") return response;
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// ---- Periodic version check ----
setInterval(() => {
  checkForUpdates();
}, VERSION_CHECK_INTERVAL);

// ---- Message handling ----
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CHECK_VERSION") {
    checkForUpdates();
  }
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---- Background Sync (offline_queue) ----
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-pending") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({ type: "TRIGGER_SYNC" });
          }
        })
    );
  }
});

// ---- Periodic Background Sync ----
self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "engemase-periodic-sync") {
    event.waitUntil(
      (async () => {
        await checkForUpdates();
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clientList) {
          client.postMessage({ type: "TRIGGER_SYNC" });
        }
      })()
    );
  }
});

// ---- Push notifications (com agrupamento) ----
self.addEventListener("push", (event) => {
  // NÃO retornar sem showNotification: se o SW termina o handler sem
  // mostrar notificação, o navegador exibe a notificação genérica padrão
  // (ícone do Chrome + nome do app). Sempre mostramos algo.
  let data: any = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && typeof payload === "object") data = payload;
    } catch {
      const text = event.data.text();
      if (text && text.trim() !== "") {
        data = { title: "Notificação", body: text };
      }
    }
  }

  const title =
    (data.title && String(data.title).trim()) || "Engemase";
  const body =
    (data.body && String(data.body).trim()) || "Você tem novas atualizações.";

  // Agrupar por tipo (vindo em data.data.type) — fallback para grupo único
  // por usuário, evitando a explosão de N notificações quando o dispositivo
  // recebe muitos pushes acumulados.
  const innerData = (data.data || {}) as Record<string, unknown>;
  const groupKey =
    data.group ||
    (innerData.type as string) ||
    data.tag ||
    "engemase-default";
  const tag = `group:${groupKey}`;

  event.waitUntil(
    (async () => {
      let displayTitle = title;
      let displayBody = body;

      try {
        const existing = await self.registration.getNotifications({ tag });
        if (existing.length > 0) {
          const prev = existing[0];
          const prevCount = ((prev.data as any)?.groupCount as number) || 1;
          const newCount = prevCount + 1;
          displayTitle = data.groupTitle || title;
          displayBody = `Você tem ${newCount} novas notificações`;
          innerData.groupCount = newCount;
          innerData.groupKey = groupKey;
        } else {
          innerData.groupCount = 1;
          innerData.groupKey = groupKey;
        }
      } catch (e) {
        console.warn("[SW] Falha ao agrupar notificação:", e);
      }

      await self.registration.showNotification(displayTitle, {
        body: displayBody,
        icon: data.icon || "/icon-192.png",
        badge: "/mono-192.png",
        tag,
        data: innerData,
        requireInteraction: false,
        // renotify=false: substitui a notificação existente do mesmo grupo
        // SEM tocar som/vibrar novamente. Evita "spam" ao abrir o app.
        // @ts-expect-error - propriedades não-padrão suportadas em Chromium
        renotify: false,
        silent: false,
        actions: [
          { action: "open", title: "Abrir" },
          { action: "close", title: "Fechar" },
        ],
      });
    })()
  );
});


// ---- Notification click ----
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow("/");
      })
  );
});

self.addEventListener("notificationclose", () => {});

export {};
