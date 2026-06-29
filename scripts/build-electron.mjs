#!/usr/bin/env node
/**
 * Packages the Electron app for a target platform.
 *
 * Usage:
 *   node scripts/build-electron.mjs --platform <mac|win> [--unsigned]
 *       [--app-version <x.y.z>] [--out-dir <path>]
 *
 * Pipeline (runs sequentially; aborts on any failure):
 *   1. Vite build (`npm run build`)
 *   2. Platform prep
 *        mac: swap in per-arch Sharp binaries via electron/prepare-mac-sharp.cjs
 *        win: install win32 x64 optional deps without saving
 *   3. Native rebuild for Electron (`@electron/rebuild --force`)
 *   4. electron-builder with the right platform flag, env vars, and target arg
 *
 * Override flags (used by the update simulator, scripts/simulate-update.mjs):
 *   --app-version  Override the packaged version without touching package.json
 *                  (electron-builder `-c.extraMetadata.version`). Lets you build
 *                  a "next" release for local auto-update testing.
 *   --out-dir      Override the output directory (`-c.directories.output`) so a
 *                  simulated build lands beside, not on top of, a real build.
 *   When either override is present, `--publish never` is forced so a simulated
 *   build can never accidentally publish.
 */

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const platformIdx = args.indexOf("--platform");
const platform = platformIdx !== -1 ? args[platformIdx + 1] : null;
const unsigned = args.includes("--unsigned");

const appVersionIdx = args.indexOf("--app-version");
const appVersion = appVersionIdx !== -1 ? args[appVersionIdx + 1] : null;
const outDirIdx = args.indexOf("--out-dir");
const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : null;

if (platform !== "mac" && platform !== "win") {
  console.error("Usage: node scripts/build-electron.mjs --platform <mac|win> [--unsigned]");
  process.exit(1);
}

await ensureEnvProduction();

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim().toLowerCase());
    });
  });
}

async function ensureEnvProduction() {
  const envPath = resolve(process.cwd(), ".env.production");
  if (existsSync(envPath)) return;

  console.log("");
  console.log("[preflight] .env.production not found.");
  console.log("  Production builds need it so VITE_API_URL is empty (same-origin) in the bundle.");
  console.log("  Without it, the packaged app's frontend will call http://localhost:3001 and");
  console.log("  every API request will fail because the bundled server uses a dynamic port.");
  console.log("");

  // Non-interactive (CI, redirected stdin) — auto-create the safe default
  // rather than hanging on a prompt nobody can answer.
  if (!process.stdin.isTTY) {
    writeFileSync(envPath, "VITE_API_URL=\n");
    console.log(`Non-interactive shell — wrote ${envPath} with VITE_API_URL=`);
    return;
  }

  const answer = await prompt("Create .env.production now? [Y/n] ");
  if (answer === "" || answer === "y" || answer === "yes") {
    writeFileSync(envPath, "VITE_API_URL=\n");
    console.log(`Wrote ${envPath}`);
    return;
  }

  const confirm = await prompt("Continue the build anyway? [y/N] ");
  if (confirm !== "y" && confirm !== "yes") {
    console.error("Aborted.");
    process.exit(1);
  }
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

// Simulation overrides: bump the packaged version and/or redirect output without
// editing package.json, and never publish a simulated artifact.
if (appVersion) {
  builderArgs.push(`-c.extraMetadata.version=${appVersion}`);
}
if (outDir) {
  builderArgs.push(`-c.directories.output=${outDir}`);
}
if (appVersion || outDir) {
  builderArgs.push("--publish", "never");
}

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
