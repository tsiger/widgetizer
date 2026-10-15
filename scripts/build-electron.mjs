#!/usr/bin/env node
/**
 * Packages the Electron app for a target platform.
 *
 * Usage:
 *   node scripts/build-electron.mjs --platform <mac|win|linux> [--unsigned] [--arch <x64|arm64>]
 *
 * Pipeline (runs sequentially; aborts on any failure):
 *   1. Vite build (`npm run build`)
 *   2. Platform prep
 *        mac: swap in per-arch Sharp binaries via electron/prepare-mac-sharp.cjs
 *        win: install win32 x64 optional deps without saving
 *        linux: install both supported Sharp architectures
 *   3. Native rebuild for Electron (`@electron/rebuild --force`)
 *   4. electron-builder with the right platform flag, env vars, and target arg
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const platformIdx = args.indexOf("--platform");
const platform = platformIdx !== -1 ? args[platformIdx + 1] : null;
const unsigned = args.includes("--unsigned");
const archIdx = args.indexOf("--arch");
const linuxArch = archIdx === -1 ? process.arch : args[archIdx + 1];

if (!["mac", "win", "linux"].includes(platform)) {
  console.error("Usage: node scripts/build-electron.mjs --platform <mac|win|linux> [--unsigned] [--arch <x64|arm64>]");
  process.exit(1);
}

if (archIdx !== -1 && platform !== "linux") {
  console.error("--arch is supported by this script only for Linux builds.");
  process.exit(1);
}

if (platform === "linux" && (process.platform !== "linux" || !["x64", "arm64"].includes(linuxArch))) {
  console.error("Build on Linux with --arch x64 or --arch arm64 (defaults to the host architecture).");
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
} else if (platform === "win") {
  run("npm", ["install", "--no-save", "--platform=win32", "--arch=x64", "--include=optional"]);
} else if (platform === "linux") {
  run("node", ["electron/prepare-linux-sharp.cjs"]);
}

// 3. Native rebuild
run("npx", ["@electron/rebuild", "--force", ...(platform === "linux" ? ["--arch", linuxArch] : [])]);

if (platform === "linux") {
  // The binaries selected at runtime must match the target, not the build host.
  const expectedMachine = linuxArch === "arm64" ? 183 : 62;
  const vipsDir = `node_modules/@img/sharp-libvips-linux-${linuxArch}/lib`;
  const vipsLibraries = readdirSync(vipsDir).filter((name) => name.startsWith("libvips-cpp.so."));
  if (!vipsLibraries.length) throw new Error(`Missing libvips for ${linuxArch}`);
  for (const binary of [
    "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
    `node_modules/@img/sharp-linux-${linuxArch}/lib/sharp-linux-${linuxArch}.node`,
    ...vipsLibraries.map((name) => `${vipsDir}/${name}`),
  ]) {
    const header = readFileSync(binary);
    if (header.toString("hex", 0, 4) !== "7f454c46" || header[4] !== 2 || header[5] !== 1 || header.readUInt16LE(18) !== expectedMachine) {
      throw new Error(`Wrong native architecture for ${linuxArch}: ${binary}`);
    }
  }
}

// 4. electron-builder
const builderArgs = ["electron-builder", "--config", "electron/builder.config.mjs", `--${platform}`];
const builderEnv = {};

if (platform === "linux") {
  builderArgs.push(`--${linuxArch}`, "--publish", "never");
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
