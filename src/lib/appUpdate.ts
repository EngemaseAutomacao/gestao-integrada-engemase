// Shared helper to fully clear caches, unregister service workers and hard-reload the app.
export async function applyAppUpdate() {
  try {
    localStorage.removeItem("engemase_notified_version");
    localStorage.removeItem("engemase_app_version");
  } catch {}

  // Tell any waiting SW to skip waiting, then unregister all SWs.
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          } catch {}
          await reg.unregister().catch(() => {});
        })
      );
    } catch (e) {
      console.error("[Update] SW unregister error", e);
    }
  }

  // Clear ALL caches (precache + runtime).
  if ("caches" in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) {
      console.error("[Update] cache cleanup error", e);
    }
  }

  // Hard reload with cache-busting query param.
  window.location.replace(
    window.location.origin + window.location.pathname + "?v=" + Date.now()
  );
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch("/version.json?t=" + Date.now(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}
