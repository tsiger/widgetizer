import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: [
      "src/**/*.test.js",
      "scripts/__tests__/*.test.js",
      // Only packages whose tests use Vitest. @widgetizer/builder-server uses
      // the Node test runner (npm test), so it is intentionally excluded here.
      "packages/core/src/**/*.test.js",
      "packages/adapters-local/src/**/*.test.js",
    ],
  },
});
