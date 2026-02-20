import { useEffect } from "react";
import { APP_VERSION } from "@/version";

const VERSION_KEY = "engemase_app_version";
const CHECK_INTERVAL = 60 * 1000; // check every 60s

function checkVersion() {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (!storedVersion) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    return;
  }

  if (storedVersion !== APP_VERSION) {
    console.log(`[Version] Update detected: ${storedVersion} → ${APP_VERSION}`);
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) =>
        regs.forEach((r) => r.unregister())
      );
    }

    window.location.reload();
  }
}

export function useVersionCheck() {
  useEffect(() => {
    checkVersion();

    const interval = setInterval(checkVersion, CHECK_INTERVAL);

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
  }, []);
}

