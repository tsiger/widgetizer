import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read package.json to get version
const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Resolve the editor-ui package to its SOURCE (not a built artifact) so
      // Vite/Vitest bundle + HMR work across the workspace boundary, mirroring
      // how hosted aliases the vendored package. Exact-match only, so subpath
      // exports (e.g. the Tailwind preset) still resolve via the package's own
      // exports map. @widgetizer/core keeps its symlink+exports resolution (it
      // has subpath exports we must not shadow).
      {
        find: /^@widgetizer\/editor-ui$/,
        replacement: resolve(import.meta.dirname, "packages/editor-ui/src/index.js"),
      },
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: 3000,
    watch: {
      ignored: ["**/data/**", "**/themes/**"],
    },
  },
});
