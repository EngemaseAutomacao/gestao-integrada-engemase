import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_VERSION } from "@/version";

const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
const NOTIFIED_VERSION_KEY = "engemase_notified_version";

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const notifiedRef = useRef(false);

  const showUpdateNotification = useCallback((newVersion: string) => {
    // Only notify once per version
    const alreadyNotified = localStorage.getItem(NOTIFIED_VERSION_KEY);
    if (alreadyNotified === newVersion || notifiedRef.current) return;
    notifiedRef.current = true;
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
      console.log(`[Update] Verificando versão... (atual: ${APP_VERSION})`);
      const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      console.log(`[Update] Versão no servidor: ${data.version}`);
      if (data.version && data.version !== APP_VERSION) {
        console.log(`[Update] Nova versão disponível: ${data.version}`);
        setUpdateAvailable(true);
        showUpdateNotification(data.version);
      }
    } catch (e) {
      console.error("[Update] Erro ao verificar versão:", e);
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
    // Clear all caches
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    // Unregister service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    // Force reload from server
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] flex justify-center animate-in slide-in-from-top-4 duration-500">
      <div className="bg-amber-500 text-white rounded-lg shadow-2xl px-4 py-4 flex items-center gap-4 max-w-lg w-full border-2 border-white/20 ring-4 ring-amber-500/20">
        <div className="bg-white/20 p-2 rounded-full shrink-0">
          <AlertCircle className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black leading-tight">Nova versão do sistema!</p>
          <p className="text-xs font-medium opacity-95">Clique no botão ao lado para atualizar agora.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpdate}
            className="bg-white text-amber-600 text-sm font-black px-5 py-2 rounded-md hover:bg-amber-50 transition-all shrink-0 shadow-lg active:scale-95 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            ATUALIZAR
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
