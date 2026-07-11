import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Load apps/web/.env.local into process.env for the Playwright *Node*
 * process. Next.js's dev server loads this file itself, but specs that
 * talk to Supabase directly (e.g. diagnostics-flow.spec.ts's self-reset
 * setup/cleanup) run in this Node process, not the browser — without this
 * they'd see undefined NEXT_PUBLIC_SUPABASE_URL/ANON_KEY. No dotenv
 * dependency: a minimal inline parser, never overrides an already-set var.
 */
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not present — fall back to whatever the shell provides.
  }
}
loadEnvLocal();

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Specs share live seeded Supabase rows — parallel workers interfere
  // (e.g. doctor-consult completes the appointment reception-queue counts).
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
