import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_VERSION } from "@/version";

const CHECK_INTERVAL = 30 * 1000; // 30 seconds for faster detection during testing
const NOTIFIED_VERSION_KEY = "engemase_notified_version";

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const notifiedRef = useRef<string | null>(null);

  const showUpdateNotification = useCallback((newVersion: string) => {
    // Only notify once per version
    const alreadyNotified = localStorage.getItem(NOTIFIED_VERSION_KEY);
    if (alreadyNotified === newVersion || notifiedRef.current === newVersion) {
      console.log(`[Update] Notificação para ${newVersion} já exibida.`);
      return;
    }
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
      // Don't show in Lovable preview/editor to avoid duplicate UI issues
      // Remove blocking to allow testing in preview
      const isEditorPreview = window.location.hostname === "lovable.app" || window.location.hostname.includes("id-preview");
      if (isEditorPreview) return;

      console.log(`[Update] Iniciando verificação... Bundle: ${APP_VERSION}, URL: ${window.location.hostname}`);
      const res = await fetch("/version.json?v=" + APP_VERSION + "&t=" + Date.now(), { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      console.log(`[Update] Versão no servidor: ${data.version}`);
      if (data.version && data.version !== APP_VERSION) {
        console.log(`[Update] Nova versão detectada: ${data.version} (atual: ${APP_VERSION})`);
        setUpdateAvailable(true);
        showUpdateNotification(data.version);
      } else {
        setUpdateAvailable(false);
      }
    } catch (e) {
      console.error("[Update] Erro ao verificar versão:", e);
    }
  }, [showUpdateNotification]);

  useEffect(() => {
    // Check immediately after mount
    const timeout = setTimeout(checkForUpdate, 2000);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    // Listen for SW version messages
    const handleSWMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      const version = event.data?.version;
      
      if ((type === "VERSION_UPDATED" || type === "VERSION_CHECK") && version) {
        if (version !== APP_VERSION) {
          console.log(`[Update] SW reportou versão diferente: ${version} (atual: ${APP_VERSION})`);
          setUpdateAvailable(true);
          showUpdateNotification(version);
        }
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
    console.log("[Update] Aplicando atualização...");
    
    // Clear all caches
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }

    // Force Service Worker to activate if it exists
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait a bit for SW to take control
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Unregister service workers to be double sure
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    
    // Clear notified version to allow re-showing if needed
    localStorage.removeItem(NOTIFIED_VERSION_KEY);
    
    // Force reload from server
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-[9999] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 max-w-md w-full border border-primary-foreground/20">
        <RefreshCw className="w-5 h-5 shrink-0 animate-spin" style={{ animationDuration: "3s" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Nova versão disponível!</p>
          <p className="text-xs opacity-90">Atualize para aplicar as melhorias.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            className="bg-white text-primary text-sm font-bold px-4 py-1.5 rounded-md hover:bg-white/90 transition-colors shrink-0 shadow-sm"
          >
            Atualizar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
