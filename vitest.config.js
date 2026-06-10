import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // Mirror vite.config.js so module resolution matches the build (vitest does
  // not read vite.config.js when a vitest.config.js is present).
  resolve: {
    alias: [
      {
        find: /^@widgetizer\/editor-ui$/,
        replacement: resolve(import.meta.dirname, "packages/editor-ui/src/index.js"),
      },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.js"],
    include: [
      "src/**/*.test.{js,jsx}",
      "scripts/__tests__/*.test.js",
      // Only packages whose tests use Vitest. @widgetizer/builder-server uses
      // the Node test runner (npm test), so it is intentionally excluded here.
      "packages/core/src/**/*.test.js",
      "packages/adapters-local/src/**/*.test.js",
      "packages/editor-ui/src/**/*.test.{js,jsx}",
    ],
  },
});
