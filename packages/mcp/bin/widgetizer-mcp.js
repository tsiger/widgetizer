#!/usr/bin/env node
// stdout carries MCP messages only; anything for humans goes to stderr.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRelay, resolveDataRoot } from "../src/index.js";

const RELAY_VERSION = "0.1.0";

const { server, bridge } = await createRelay({ dataRoot: resolveDataRoot(), version: RELAY_VERSION });

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await bridge.close();
  process.exit(0);
}

process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await server.connect(new StdioServerTransport());
