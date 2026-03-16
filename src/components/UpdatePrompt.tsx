import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_VERSION } from "@/version";

const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== APP_VERSION) {
        console.log(`[Update] Nova versão disponível: ${data.version} (atual: ${APP_VERSION})`);
        setUpdateAvailable(true);
      }
    } catch {
      // offline or error — ignore
    }
  }, []);

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
