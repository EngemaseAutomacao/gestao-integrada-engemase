import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config — Engemase
 * Run with: `bunx playwright test`
 * Prereqs: dev server on http://localhost:8080 (default Vite) and a
 * valid `.env` with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
 * Optionally set E2E_USERNAME / E2E_PASSWORD for authenticated flows.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
