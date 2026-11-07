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
 *   5. mac (signed): add the built app's macOS minimum to latest-mac.yml (scripts/mac-update-feed.js)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import { darwinVersionForMacOS, withMinimumSystemVersion } from "./mac-update-feed.js";

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
  // npm picks optional native packages (Sharp's) by its `os` and `cpu` settings; it has no
  // `platform` or `arch` settings, so those flags were ignored and a build on a Mac got Mac binaries.
  run("npm", ["install", "--no-save", "--os=win32", "--cpu=x64", "--include=optional"]);
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
  // Sharp's binary is named after its version (sharp-linux-x64-0.35.5.node).
  const sharpDir = `node_modules/@img/sharp-linux-${linuxArch}/lib`;
  const sharpBinaries = readdirSync(sharpDir).filter((name) => name.endsWith(".node"));
  if (!sharpBinaries.length) throw new Error(`Missing Sharp for ${linuxArch}`);
  for (const binary of [
    // better-sqlite3 loads its bundled Node-API binary for the platform and architecture.
    `node_modules/better-sqlite3/prebuilds/linux-${linuxArch}.node`,
    ...sharpBinaries.map((name) => `${sharpDir}/${name}`),
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

// The Mac feed is finished after electron-builder exits (step 5), so it must never publish by itself
// (it would on a git tag or in CI); releases are uploaded by hand.
if (platform === "mac") {
  builderArgs.push("--publish", "never");
}

run("npx", builderArgs, builderEnv);

// 5. Mac update feed: electron-updater offers an update to any Mac unless the feed names a minimum.
if (platform === "mac" && !unsigned) {
  const feedPath = "dist-electron/latest-mac.yml";
  if (!existsSync(feedPath)) throw new Error(`${feedPath} is missing after a signed Mac build`);
  // The config builds x64 (dist-electron/mac) and arm64 (dist-electron/mac-arm64); no other folder.
  const minimums = ["mac", "mac-arm64"]
    .map((dir) => join("dist-electron", dir, "Widgetizer.app/Contents/Info.plist"))
    .filter((plist) => existsSync(plist))
    .map((plist) => {
      const result = spawnSync("plutil", ["-extract", "LSMinimumSystemVersion", "raw", plist], { encoding: "utf8" });
      if (result.status !== 0) throw new Error(`No LSMinimumSystemVersion in ${plist}`);
      return result.stdout.trim();
    });
  if (!minimums.length) throw new Error("No built Mac app in dist-electron/mac or dist-electron/mac-arm64");
  const darwinVersions = [...new Set(minimums.map(darwinVersionForMacOS))];
  if (darwinVersions.length !== 1) throw new Error(`The Mac builds disagree on the macOS minimum: ${minimums.join(", ")}`);
  writeFileSync(feedPath, withMinimumSystemVersion(readFileSync(feedPath, "utf8"), darwinVersions[0]));
  console.log(`\n${feedPath}: minimumSystemVersion ${darwinVersions[0]} (macOS ${minimums[0]})`);
}
