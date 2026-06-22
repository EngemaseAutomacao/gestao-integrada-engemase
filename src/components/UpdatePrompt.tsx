import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_VERSION } from "@/version";

const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
const NOTIFIED_VERSION_KEY = "engemase_notified_version";

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const notifiedRef = useRef<string | null>(null);

  const showUpdateNotification = useCallback((newVersion: string) => {
    // Only notify once per version
    const alreadyNotified = localStorage.getItem(NOTIFIED_VERSION_KEY);
    if (alreadyNotified === newVersion || notifiedRef.current === newVersion) return;
    notifiedRef.current = newVersion;
    localStorage.setItem(NOTIFIED_VERSION_KEY, newVersion);

    // Try Service Worker notification (works in background too)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as any).showNotification("Nova Atualização Disponível! 🚀", {
          body: `Versão ${newVersion} está disponível. Atualize para obter as últimas melhorias.`,
          icon: "/icon-192.png",
          badge: "/mono-192.png",
          tag: "system-update",
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: "update", title: "Atualizar Agora" },
            { action: "close", title: "Depois" }
          ]
        });
      }).catch(() => {});
    } else if ("Notification" in window && Notification.permission === "granted") {
      // Fallback to regular notification
      new Notification("Nova Atualização Disponível! 🚀", {
        body: `Versão ${newVersion} está disponível. Atualize para obter as últimas melhorias.`,
        icon: "/icon-192.png",
        tag: "system-update",
      });
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== APP_VERSION) {
        console.log(`[Update] Nova versão disponível: ${data.version} (atual: ${APP_VERSION})`);
        setUpdateAvailable(true);
        setDismissed(false); // Reset dismissal when a NEW version is found (though checked against APP_VERSION)
        showUpdateNotification(data.version);
      }
    } catch {
      // offline or error — ignore
    }
  }, [showUpdateNotification]);

  useEffect(() => {
    // Check immediately after mount
    const timeout = setTimeout(checkForUpdate, 5000);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    // Listen for SW version messages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "VERSION_UPDATED") {
        setUpdateAvailable(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [checkForUpdate]);

  const handleUpdate = async () => {
    localStorage.removeItem(NOTIFIED_VERSION_KEY);
    localStorage.removeItem("engemase_app_version");

    // 1. Desregistrar TODOS os service workers para garantir que o HTML
    //    venha direto da rede no próximo carregamento.
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (reg) => {
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
            await reg.unregister().catch(() => {});
          })
        );
      } catch (e) {
        console.error("[Update] SW unregister error", e);
      }
    }

    // 2. Limpar TODOS os caches (precache do Workbox + runtime).
    //    O novo SW será registrado no próximo load e refará o precache.
    if ("caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch (e) {
        console.error("[Update] cache cleanup error", e);
      }
    }

    // 3. Hard reload com bypass de HTTP cache.
    window.location.replace(
      window.location.origin + window.location.pathname + "?v=" + Date.now()
    );
  };

  // If we are in local development, we don't want to show the prompt constantly 
  // since the version in version.json and APP_VERSION are usually the same
  // But if you are testing the build locally, it might show up.
  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-md w-full">
        <RefreshCw className="w-5 h-5 shrink-0 animate-spin" style={{ animationDuration: "3s" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Nova versão disponível!</p>
          <p className="text-xs opacity-80">Atualize para obter as últimas melhorias.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-primary-foreground text-primary text-sm font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity shrink-0"
        >
          Atualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
