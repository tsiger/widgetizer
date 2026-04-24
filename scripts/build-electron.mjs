#!/usr/bin/env node
/**
 * Packages the Electron app for a target platform.
 *
 * Usage:
 *   node scripts/build-electron.mjs --platform <mac|win> [--unsigned]
 *
 * Pipeline (runs sequentially; aborts on any failure):
 *   1. Vite build (`npm run build`)
 *   2. Platform prep
 *        mac: swap in per-arch Sharp binaries via electron/prepare-mac-sharp.cjs
 *        win: install win32 x64 optional deps without saving
 *   3. Native rebuild for Electron (`@electron/rebuild --force`)
 *   4. electron-builder with the right platform flag, env vars, and target arg
 */

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const platformIdx = args.indexOf("--platform");
const platform = platformIdx !== -1 ? args[platformIdx + 1] : null;
const unsigned = args.includes("--unsigned");

if (platform !== "mac" && platform !== "win") {
  console.error("Usage: node scripts/build-electron.mjs --platform <mac|win> [--unsigned]");
  process.exit(1);
}

function run(cmd, cmdArgs, extraEnv = {}) {
  console.log(`\n> ${cmd} ${cmdArgs.join(" ")}`);
  const result = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

// 1. Vite build
run("npm", ["run", "build"]);

// 2. Platform prep
if (platform === "mac") {
  run("node", ["electron/prepare-mac-sharp.cjs"]);
} else {
  run("npm", ["install", "--no-save", "--platform=win32", "--arch=x64", "--include=optional"]);
}

// 3. Native rebuild
run("npx", ["@electron/rebuild", "--force"]);

// 4. electron-builder
const builderArgs = ["electron-builder", "--config", "electron/builder.config.mjs", `--${platform}`];
const builderEnv = {};

if (platform === "mac" && unsigned) {
  builderArgs.push("dir");
  builderEnv.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  builderEnv.SKIP_NOTARIZE = "1";
}

if (platform === "win" && unsigned) {
  builderEnv.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  builderEnv.WIN_UNSIGNED = "1";
}

run("npx", builderArgs, builderEnv);
