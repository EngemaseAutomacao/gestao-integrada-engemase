import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { APP_VERSION } from "./version.ts";

// Run version check as plain JS BEFORE React mounts
// This avoids the duplicate-React hook crash
(function checkVersionBeforeMount() {
  const VERSION_KEY = "engemase_app_version";
  const stored = localStorage.getItem(VERSION_KEY);
  const isEditorPreview = window.location.hostname.endsWith("lovableproject.com");

  const unregisterAllServiceWorkers = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    }
  };

  const clearAllCaches = () => {
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
    }
  };

  // In editor preview, always disable SW/cache to avoid stale Vite chunks and duplicate React runtime
  if (isEditorPreview) {
    clearAllCaches();
    unregisterAllServiceWorkers();
    window.addEventListener(
      "load",
      () => {
        unregisterAllServiceWorkers();
        setTimeout(unregisterAllServiceWorkers, 500);
      },
      { once: true }
    );
  }

  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } else if (stored !== APP_VERSION) {
    console.log(`[Version] Update: ${stored} → ${APP_VERSION}`);
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    clearAllCaches();
    unregisterAllServiceWorkers();

    window.location.reload();
    return; // don't mount React if we're going to reload
  }

  // Outside editor preview, keep SW auto-update behavior for PWA
  if (!isEditorPreview && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.update().catch(() => {});
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[SW] New version activated, reloading...");
      window.location.reload();
    });
  }
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

