import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Reuse vite.config.js wholesale (react plugin + the @widgetizer/editor-ui
// source alias) so test-time module resolution matches the build and the alias
// is declared in exactly one place.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      setupFiles: ["./vitest.setup.js"],
      include: [
        "app/src/**/*.test.{js,jsx}",
        // Electron shell carries a few pure, import-safe helpers (e.g. the preview
        // path guard) that are unit-tested here; main.js itself stays out (it imports
        // electron and isn't import-safe under Vitest).
        "electron/**/*.test.js",
        "scripts/__tests__/*.test.js",
        // Only packages whose tests use Vitest. @widgetizer/builder-server uses
        // the Node test runner (npm test), so it is intentionally excluded here.
        "packages/core/src/**/*.test.js",
        "packages/adapters-local/src/**/*.test.js",
        "packages/editor-ui/src/**/*.test.{js,jsx}",
      ],
    },
  }),
);
