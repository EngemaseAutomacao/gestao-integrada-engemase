import { useEffect, useCallback } from "react";
import { APP_VERSION } from "@/version";

const VERSION_KEY = "engemase_app_version";
const CHECK_INTERVAL = 60 * 1000; // check every 60s

export function useVersionCheck() {
  const checkVersion = useCallback(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (!storedVersion) {
      // First visit – just store it
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      return;
    }

    if (storedVersion !== APP_VERSION) {
      console.log(`[Version] Update detected: ${storedVersion} → ${APP_VERSION}`);
      localStorage.setItem(VERSION_KEY, APP_VERSION);

      // Clear service worker caches so stale assets are gone
      if ("caches" in window) {
        caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
      }

      // Unregister old service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) =>
          regs.forEach((r) => r.unregister())
        );
      }

      // Hard reload to get fresh assets
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    checkVersion();

    // Also re-check periodically (catches when user leaves tab open across deploys)
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Re-check when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkVersion]);
}
