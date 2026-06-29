#!/usr/bin/env node
/**
 * Simulate a real Electron auto-update locally — no GitHub tag/release required.
 *
 * Auto-update compares the *running installed app's* version against a
 * `latest.yml` it fetches from a feed URL. This harness exercises the genuine
 * electron-updater flow (detect -> banner -> download with progress -> Restart
 * -> install -> relaunch) by:
 *   1. building a version-bumped installer into a throwaway output dir
 *      (without touching package.json or git),
 *   2. serving that dir over local HTTP, and
 *   3. launching the already-installed older app pointed at that feed via the
 *      ELECTRON_UPDATER_URL override already wired into electron/main.js.
 *
 * It is "100% accurate" because only the feed host changes (localhost instead
 * of github.com): same autoUpdater, same latest.yml parsing, same NSIS
 * installer + blockmap, same relaunch.
 *
 * You cannot update *from* nothing, so a baseline must be installed first:
 *
 *   npm run updater:base    # build + run the installer for the CURRENT version
 *   ...install it...        # silent NSIS install, app launches
 *   npm run updater:sim     # build NEXT version, serve it, launch the baseline
 *
 * Options (sim mode):
 *   --next <x.y.z>   Version to build as the update (default: bump base patch).
 *   --port <n>       Local feed port (default 8384).
 *   --app-exe <path> Path to the installed Widgetizer.exe (auto-probed if omitted;
 *                    or set WIDGETIZER_EXE). Use if probing fails.
 *   --skip-build     Reuse an existing dist-electron-update/ build (faster iteration).
 *
 * Modes:
 *   --setup-base     Build the CURRENT version and run its installer (baseline).
 *
 * Windows only. (Mac auto-update needs matching code signatures, so it cannot be
 * faked unsigned; the flow there is otherwise identical.)
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startFeedServer } from "./serve-update-feed.mjs";

const args = process.argv.slice(2);
const flag = (name, def = null) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

if (process.platform !== "win32") {
  console.error("simulate-update: Windows only. Mac auto-update requires matching code signatures.");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const base = pkg.version;

function bumpPatch(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) {
    throw new Error(`Cannot parse version for bump: ${v}`);
  }
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

function runBuild(buildArgs) {
  console.log(`\n> node scripts/build-electron.mjs ${buildArgs.join(" ")}`);
  const result = spawnSync("node", ["scripts/build-electron.mjs", ...buildArgs], {
    stdio: "inherit",
    cwd: root,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

// ---- Baseline mode: build + install the current version ----------------------
if (has("--setup-base")) {
  console.log(`[base] Building baseline installer for current version ${base}...`);
  runBuild(["--platform", "win", "--unsigned"]);

  const installer = join(root, "dist-electron", `Widgetizer-Setup-${base}.exe`);
  if (!existsSync(installer)) {
    console.error(`[base] Installer not found at ${installer}`);
    process.exit(1);
  }

  console.log(`[base] Launching installer: ${installer}`);
  console.log("[base] The NSIS one-click installer runs silently and launches the app.");
  const child = spawn(installer, [], { detached: true, stdio: "ignore" });
  child.unref();

  console.log("");
  console.log(`Baseline v${base} is installing. Once it launches, you can close it, then run:`);
  console.log("  npm run updater:sim");
  process.exit(0);
}

// ---- Sim mode: build NEXT, serve it, launch the installed baseline -----------
const next = flag("--next") || bumpPatch(base);
const port = Number(flag("--port", "8384"));
const outDir = resolve(root, "dist-electron-update");

if (compareVersions(next, base) <= 0) {
  console.error(`[sim] --next (${next}) must be greater than the baseline version (${base}).`);
  process.exit(1);
}

console.log(`[sim] Baseline (installed): v${base}`);
console.log(`[sim] Update to build:      v${next}`);
console.log(`[sim] Feed port:            ${port}`);

if (!has("--skip-build")) {
  rmSync(outDir, { recursive: true, force: true });
  runBuild(["--platform", "win", "--unsigned", "--app-version", next, "--out-dir", outDir]);
}

// Verify the artifacts electron-updater will ask for.
const ymlPath = join(outDir, "latest.yml");
const exePath = join(outDir, `Widgetizer-Setup-${next}.exe`);
for (const [label, p] of [["latest.yml", ymlPath], [`installer`, exePath]]) {
  if (!existsSync(p)) {
    console.error(`[sim] Expected ${label} not found at ${p}. Did the build succeed?`);
    process.exit(1);
  }
}

// Locate the installed baseline app.
const exeOverride = flag("--app-exe") || process.env.WIDGETIZER_EXE || null;
const probes = exeOverride
  ? [exeOverride]
  : [
      join(process.env.LOCALAPPDATA || "", "Programs", "Widgetizer", "Widgetizer.exe"),
      join(process.env.LOCALAPPDATA || "", "Programs", "widgetizer", "Widgetizer.exe"),
      join(process.env.ProgramFiles || "", "Widgetizer", "Widgetizer.exe"),
    ];
const appExe = probes.find((p) => p && existsSync(p));

if (!appExe) {
  console.error("[sim] Could not locate an installed Widgetizer.exe. Looked in:");
  probes.forEach((p) => console.error(`        ${p}`));
  console.error("[sim] Install a baseline first (npm run updater:base), or pass --app-exe <path>.");
  process.exit(1);
}

const feedUrl = `http://127.0.0.1:${port}`;
const server = await startFeedServer({ dir: outDir, port });

console.log(`[sim] Launching installed app with ELECTRON_UPDATER_URL=${feedUrl}`);
console.log(`[sim]   ${appExe}`);
const appProcess = spawn(appExe, [], {
  detached: true,
  stdio: "ignore",
  env: { ...process.env, ELECTRON_UPDATER_URL: feedUrl },
});
appProcess.unref();

console.log("");
console.log("======================================================================");
console.log(`  Simulating update  v${base}  ->  v${next}`);
console.log("======================================================================");
console.log("  In the app (the check fires ~10s after launch):");
console.log("    1. Update banner appears announcing the new version.");
console.log("    2. Click to download — watch the progress bar.");
console.log("    3. Click Restart — NSIS installs and the app relaunches as the new version.");
console.log("    4. Confirm via Help > About that the version is now " + next + ".");
console.log("");
console.log("  Watch the [feed] log lines below for latest.yml / installer fetches.");
console.log("  Press Ctrl+C here to stop the feed server when you're done.");
console.log("======================================================================");

function shutdown() {
  console.log("\n[sim] Shutting down feed server.");
  server.close(() => process.exit(0));
  // Hard exit fallback if close hangs.
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Numeric semver compare on the leading x.y.z (ignores prerelease tags).
function compareVersions(a, b) {
  const pa = a.match(/\d+/g).map(Number);
  const pb = b.match(/\d+/g).map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
