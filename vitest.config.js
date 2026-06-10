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
