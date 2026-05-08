import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service Worker registration for PWA features
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service Worker registered");
        
        // Listen for messages from SW (e.g. for offline sync)
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "TRIGGER_SYNC") {
            window.dispatchEvent(new CustomEvent("sw-trigger-sync"));
          }
        });
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
