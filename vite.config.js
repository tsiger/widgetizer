import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Read package.json to get version
const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
