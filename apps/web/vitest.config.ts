import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit-test config for hooks/lib code (jsdom environment). Separate from the
 * Playwright e2e suite (`test:e2e`), which owns full-browser scenarios.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
