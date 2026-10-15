#!/usr/bin/env node
/**
 * Builds the MCP relay that assistants (Claude Desktop, Codex, …) launch to talk
 * to the running Widgetizer app.
 *
 * Usage:
 *   node scripts/build-relay.mjs [--platform <mac|win|linux>] [--arch <x64|arm64>[,<x64|arm64>]] [--sign-mcpb]
 *
 * Outputs (all under build/, gitignored):
 *   build/relay/widgetizer-mcp.mjs              Relay bundled into one file; runs on plain Node
 *   build/relay-runtime/<platform>-<arch>/      Official Node runtime (node or node.exe + LICENSE)
 *   build/mcpb/widgetizer.mcpb                  Claude Desktop extension (uses Claude's own Node)
 *
 * --sign-mcpb is experimental: it self-signs the .mcpb, which mcpb verify only
 * accepts once that certificate is trusted by the OS.
 *
 * Platform and arch default to the host. Node downloads are cached in
 * build/relay-cache/ and checked against the release's SHASUMS256.txt every run.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { checkRelay } from "./check-relay.mjs";

const NODE_VERSION = "24.21.0";
const MCPB_CLI = "@anthropic-ai/mcpb@2.1.2";

const PLATFORMS = { mac: "darwin", win: "win", linux: "linux" };
const HOST_PLATFORM = { darwin: "mac", win32: "win", linux: "linux" }[process.platform];

const root = resolve(import.meta.dirname, "..");
const buildDir = join(root, "build");
const relayFile = join(buildDir, "relay", "widgetizer-mcp.mjs");
const cacheDir = join(buildDir, "relay-cache");
const mcpbStage = join(buildDir, "mcpb", "stage");
const mcpbFile = join(buildDir, "mcpb", "widgetizer.mcpb");

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const platform = option("--platform") ?? HOST_PLATFORM;
const arches = (option("--arch") ?? process.arch).split(",");
const signMcpb = args.includes("--sign-mcpb");

if (!PLATFORMS[platform] || !arches.every((arch) => ["x64", "arm64"].includes(arch))) {
  console.error("Usage: node scripts/build-relay.mjs [--platform <mac|win|linux>] [--arch <x64|arm64>[,<x64|arm64>]] [--sign-mcpb]");
  process.exit(1);
}
if (platform === "win" && arches.includes("arm64")) {
  console.error("Windows builds ship x64 only.");
  process.exit(1);
}

function run(cmd, cmdArgs) {
  console.log(`\n> ${cmd} ${cmdArgs.join(" ")}`);
  const result = spawnSync(cmd, cmdArgs, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${cmd} ${cmdArgs[0] ?? ""} failed (exit ${result.status ?? result.error?.message})`);
}

function mcpb(cmdArgs) {
  if (process.platform !== "win32") return run("npx", ["-y", MCPB_CLI, ...cmdArgs]);
  // npx is a .cmd shim on Windows, so it needs a shell, which doesn't quote arguments for us.
  const line = ["npx", "-y", MCPB_CLI, ...cmdArgs].map((arg) => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)).join(" ");
  console.log(`\n> ${line}`);
  const result = spawnSync(line, { stdio: "inherit", shell: true });
  if (result.status !== 0) throw new Error(`mcpb ${cmdArgs[0]} failed (exit ${result.status})`);
}

async function bundle(outfile) {
  await build({
    entryPoints: [join(root, "packages/mcp/bin/widgetizer-mcp.js")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "warning",
  });
  const result = await checkRelay({ relay: outfile });
  console.log(`Relay OK (${outfile}): ${result.serverInfo.name} ${result.serverInfo.version}; tools: ${result.tools.join(", ")}`);
}

async function download(url, file) {
  if (existsSync(file)) return;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(`${file}.part`, Buffer.from(await response.arrayBuffer()));
  renameSync(`${file}.part`, file);
}

function tarCommand() {
  // Git Bash's GNU tar shadows Windows' bsdtar on PATH and can't read .zip.
  return process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
}

async function stageRuntime(arch) {
  const base = `https://nodejs.org/dist/v${NODE_VERSION}`;
  const name = `node-v${NODE_VERSION}-${PLATFORMS[platform]}-${arch}`;
  const archive = `${name}.${platform === "win" ? "zip" : platform === "mac" ? "tar.gz" : "tar.xz"}`;
  const sums = join(cacheDir, `SHASUMS256-v${NODE_VERSION}.txt`);
  const archivePath = join(cacheDir, archive);

  await download(`${base}/SHASUMS256.txt`, sums);
  await download(`${base}/${archive}`, archivePath);

  const expected = readFileSync(sums, "utf8")
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .find(([, file]) => file === archive)?.[0];
  const actual = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
  if (!expected || expected !== actual) {
    rmSync(archivePath, { force: true });
    throw new Error(`Checksum mismatch for ${archive} (expected ${expected ?? "no entry"}, got ${actual}); removed it from the cache`);
  }

  const binary = platform === "win" ? "node.exe" : "node";
  const members = [`${name}/${platform === "win" ? binary : `bin/${binary}`}`, `${name}/LICENSE`];
  const extractDir = join(cacheDir, `extract-${name}`);
  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  run(tarCommand(), ["-xf", archivePath, "-C", extractDir, ...members]);

  const outDir = join(buildDir, "relay-runtime", `${platform}-${arch}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(join(extractDir, members[0]), join(outDir, binary));
  cpSync(join(extractDir, members[1]), join(outDir, "LICENSE"));
  rmSync(extractDir, { recursive: true, force: true });
  console.log(`Node ${NODE_VERSION} runtime staged in ${outDir}`);
}

async function buildMcpb() {
  rmSync(mcpbStage, { recursive: true, force: true });
  rmSync(mcpbFile, { force: true });
  mkdirSync(join(mcpbStage, "server"), { recursive: true });

  const manifest = JSON.parse(readFileSync(join(root, "packages/mcp/mcpb/manifest.json"), "utf8"));
  manifest.version = JSON.parse(readFileSync(join(root, "packages/mcp/package.json"), "utf8")).version;
  writeFileSync(join(mcpbStage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await bundle(join(mcpbStage, "server", "widgetizer-mcp.mjs"));

  mcpb(["validate", join(mcpbStage, "manifest.json")]);
  mcpb(["pack", mcpbStage, mcpbFile]);

  if (signMcpb) {
    try {
      mcpb(["sign", mcpbFile, "--self-signed"]);
      mcpb(["verify", mcpbFile]);
    } catch (error) {
      console.warn(`Signing check failed (the extension still installs, with an unverified-publisher warning): ${error.message}`);
    }
  }
}

await bundle(relayFile);
for (const arch of arches) await stageRuntime(arch);
await buildMcpb();
console.log("\nRelay build complete.");
