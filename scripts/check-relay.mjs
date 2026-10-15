#!/usr/bin/env node
/**
 * Smoke-tests a bundled relay: starts it, sends MCP initialize + tools/list over
 * stdio and expects the always-present widgetizer_connect tool.
 *
 * Usage:
 *   node scripts/check-relay.mjs --relay <file.mjs> [--node <node binary>] [-- <extra relay args>]
 *
 * The relay runs from the OS temp directory against an empty data folder (via
 * WIDGETIZER_DATA_ROOT), so a Widgetizer running on this machine doesn't change the result.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TIMEOUT_MS = 15000;

export function checkRelay({ relay, node = process.execPath, args = [], env = process.env }) {
  const dataRoot = mkdtempSync(join(tmpdir(), "wz-relay-check-"));
  const child = spawn(node, [resolve(relay), ...args], {
    cwd: tmpdir(),
    env: { ...env, WIDGETIZER_DATA_ROOT: dataRoot },
    stdio: ["pipe", "pipe", "pipe"],
  });

  return new Promise((done, fail) => {
    let stdout = "";
    let stderr = "";
    const responses = new Map();
    const timer = setTimeout(() => finish(new Error("Timed out waiting for the relay to answer")), TIMEOUT_MS);

    function finish(error, result) {
      clearTimeout(timer);
      child.kill();
      rmSync(dataRoot, { recursive: true, force: true });
      if (error) fail(new Error(`${error.message}\n--- relay stderr ---\n${stderr}`));
      else done(result);
    }

    function send(message) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
    }

    child.on("error", finish);
    child.on("exit", (code) => {
      if (responses.size < 2) finish(new Error(`Relay exited early (code ${code})`));
    });
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      let newline;
      while ((newline = stdout.indexOf("\n")) !== -1) {
        const line = stdout.slice(0, newline).trim();
        stdout = stdout.slice(newline + 1);
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          return finish(new Error(`Relay wrote non-JSON to stdout: ${line}`));
        }
        if (message.id === undefined) continue;
        responses.set(message.id, message);
        if (message.id === 1) {
          if (!message.result?.serverInfo) return finish(new Error(`Bad initialize response: ${line}`));
          send({ method: "notifications/initialized" });
          send({ id: 2, method: "tools/list", params: {} });
        } else if (message.id === 2) {
          const tools = message.result?.tools?.map((tool) => tool.name) ?? [];
          if (!tools.includes("widgetizer_connect")) return finish(new Error(`widgetizer_connect missing: ${line}`));
          finish(null, { serverInfo: responses.get(1).result.serverInfo, tools });
        }
      }
    });

    send({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "widgetizer-relay-check", version: "0.0.0" },
      },
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const option = (name) => {
    const index = argv.indexOf(name);
    return index === -1 ? undefined : argv[index + 1];
  };
  const separator = argv.indexOf("--");
  const relay = option("--relay");
  if (!relay) {
    console.error("Usage: node scripts/check-relay.mjs --relay <file.mjs> [--node <node binary>] [-- <extra relay args>]");
    process.exit(1);
  }
  try {
    const result = await checkRelay({
      relay,
      node: option("--node"),
      args: separator === -1 ? [] : argv.slice(separator + 1),
    });
    console.log(`Relay OK: ${result.serverInfo.name} ${result.serverInfo.version}; tools: ${result.tools.join(", ")}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
