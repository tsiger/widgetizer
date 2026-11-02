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
      // Vite loads the developer's local env file into import.meta.env, and
      // VITE_API_URL there (http://localhost:3001 in .env.example) would become
      // the editor's default API and preview origin. Tests that need a split
      // origin set it explicitly; the rest must not depend on a local file.
      env: { VITE_API_URL: "" },
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
        "packages/render-engine/src/**/*.test.js",
        "packages/editor-ui/src/**/*.test.{js,jsx}",
      ],
    },
  }),
);
