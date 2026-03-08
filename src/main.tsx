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

  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } else if (stored !== APP_VERSION) {
    console.log(`[Version] Update: ${stored} → ${APP_VERSION}`);
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
    }

    window.location.reload();
    return; // don't mount React if we're going to reload
  }

  // Force SW update check on every page load
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.update().catch(() => {});
    });

    // Listen for new SW and auto-activate it
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

