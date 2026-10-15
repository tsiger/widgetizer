import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import express from "express";
import os from "node:os";
import path from "node:path";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { startBridge, createAccessSource, createMemoryOwnerStore } from "../../../assistant/src/__tests__/helpers.js";
import { createConnectionFile } from "@widgetizer/assistant/local";
import { BRIDGE_BASE } from "@widgetizer/assistant/protocol";
import { createRelay } from "../index.js";
import { readConnection, defaultDataRoot, resolveDataRoot, connectionFilePath } from "../discovery.js";

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz relay "));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

const ownerStores = new Map();
function connectionFileFor(dataRoot) {
  if (!ownerStores.has(dataRoot)) ownerStores.set(dataRoot, createMemoryOwnerStore());
  return createConnectionFile({ dataRoot, ownerStore: ownerStores.get(dataRoot) });
}

async function startApp(dataRoot, options = {}) {
  const bridge = await startBridge({ publisher: connectionFileFor(dataRoot), ...options });
  cleanups.push(() => bridge.close());
  return bridge;
}

async function connectClient(dataRoot) {
  const { server, bridge } = await createRelay({ dataRoot, version: "0.0.1" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "Test Client", version: "1.0" });
  await client.connect(clientSide);
  cleanups.push(async () => {
    await client.close();
    await bridge.close();
  });
  return { client, bridge };
}

describe("discovery", () => {
  it("uses Electron's per-user data folder by default", () => {
    expect(defaultDataRoot({ platform: "win32", env: { APPDATA: "C:/Users/x/AppData/Roaming" }, home: "C:/Users/x" })).toBe(
      path.join("C:/Users/x/AppData/Roaming", "Widgetizer", "data"),
    );
    expect(defaultDataRoot({ platform: "darwin", env: {}, home: "/Users/x" })).toBe(
      path.join("/Users/x", "Library", "Application Support", "Widgetizer", "data"),
    );
  });

  it("prefers --data-root, then WIDGETIZER_DATA_ROOT", () => {
    expect(resolveDataRoot({ argv: ["--data-root", "/a"], env: { WIDGETIZER_DATA_ROOT: "/b" } })).toBe(path.resolve("/a"));
    expect(resolveDataRoot({ argv: [], env: { WIDGETIZER_DATA_ROOT: "/b" } })).toBe(path.resolve("/b"));
    expect(resolveDataRoot({ argv: ["--data-root", "${user_config.data_root}"], env: { WIDGETIZER_DATA_ROOT: "/b" } })).toBe(
      path.resolve("/b"),
    );
  });

  it("never sends the token anywhere but this computer", async () => {
    const root = await tempRoot();
    await fs.mkdir(path.dirname(connectionFilePath(root)), { recursive: true });
    const write = (url) =>
      fs.writeFile(connectionFilePath(root), JSON.stringify({ format: 1, app: "widgetizer", url, token: "t", instanceId: "i" }));
    await write("http://evil.test:80");
    expect(await readConnection(root)).toBeNull();
    await write("https://127.0.0.1:443");
    expect(await readConnection(root)).toBeNull();
    await write("http://127.0.0.1:4100");
    expect(await readConnection(root)).toEqual({ url: "http://127.0.0.1:4100", token: "t", instanceId: "i" });
  });
});

describe("relay", () => {
  it("starts and explains what to do when Widgetizer isn't running", async () => {
    const root = await tempRoot();
    const { client } = await connectClient(root);
    expect(client.getInstructions()).toMatch(/open Widgetizer/);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["widgetizer_connect"]);
    const result = await client.callTool({ name: "widgetizer_connect", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/isn't reachable/);
  });

  it("offers the app's tools and returns structured results", async () => {
    const root = await tempRoot();
    await startApp(root);
    const { client } = await connectClient(root);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toContain("list_sites");
    expect(names.at(-1)).toBe("widgetizer_connect");
    const result = await client.callTool({ name: "list_sites", arguments: {} });
    expect(result.structuredContent.sites).toHaveLength(2);
  });

  it("picks up Widgetizer when it starts after the assistant", async () => {
    const root = await tempRoot();
    const { client } = await connectClient(root);
    await startApp(root);
    const connected = await client.callTool({ name: "widgetizer_connect", arguments: {} });
    expect(connected.isError).toBe(false);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("list_sites");
  });

  it("relays that access is off, then works again once it is back on", async () => {
    const root = await tempRoot();
    const access = createAccessSource(true);
    const app = await startApp(root, { access });
    const { client } = await connectClient(root);

    access.set(false);
    await app.assistant.settled();
    const off = await client.callTool({ name: "list_sites", arguments: {} });
    expect(off.content[0].text).toMatch(/Widgetizer isn't reachable|turned off/);

    access.set(true);
    await app.assistant.settled();
    const on = await client.callTool({ name: "list_sites", arguments: {} });
    expect(on.isError).toBe(false);
  });

  it("reports a lost answer as an unknown outcome and never replays the call", async () => {
    const root = await tempRoot();
    let runs = 0;
    await startApp(root, {
      before: (app) =>
        app.use(`${BRIDGE_BASE}/call`, (req, res, next) => {
          res.json = () => req.socket.destroy();
          next();
        }),
      assistant: {
        tools: [
          {
            name: "count",
            description: "",
            inputSchema: { type: "object", properties: {} },
            run: async () => ({ data: { runs: ++runs } }),
          },
        ],
      },
    });
    const { client } = await connectClient(root);
    const result = await client.callTool({ name: "count", arguments: {} });
    expect(runs).toBe(1);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/unknown whether this happened \(request [0-9a-f-]+\)/);
  });

  it("treats a malformed answer as unknown, not as success", async () => {
    const root = await tempRoot();
    await startApp(root, {
      before: (app) =>
        app.use(`${BRIDGE_BASE}/call`, (_req, res) => {
          res.status(200).type("json").send("{not json");
        }),
    });
    const { client } = await connectClient(root);
    const result = await client.callTool({ name: "list_sites", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/unknown whether this happened/);
  });

  it("passes on the app's refusal for an unknown tool", async () => {
    const root = await tempRoot();
    await startApp(root);
    const { client } = await connectClient(root);
    const result = await client.callTool({ name: "no_such_tool", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Unknown tool: no_such_tool/);
  });

  it("lists the new app's tools after Widgetizer restarts", async () => {
    const root = await tempRoot();
    const first = await startBridge({ publisher: connectionFileFor(root) });
    const { client, bridge } = await connectClient(root);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("list_sites");

    await first.close();
    bridge.session = null;
    const extra = { name: "new_tool", description: "", inputSchema: { type: "object", properties: {} }, run: async () => ({ data: {} }) };
    await startApp(root, { assistant: { tools: [extra] } });
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["new_tool", "widgetizer_connect"]);
  });

  it("reports an unknown outcome instead of retrying against a different app instance", async () => {
    const root = await tempRoot();
    let runs = 0;
    const tools = [
      { name: "count", description: "", inputSchema: { type: "object", properties: {} }, run: async () => ({ runs: ++runs }) },
    ];
    let first;
    first = await startBridge({
      publisher: connectionFileFor(root),
      before: (app) =>
        app.use(`${BRIDGE_BASE}/call`, (req, res, next) => {
          res.json = () => {
            req.socket.destroy();
            first.close();
          };
          next();
        }),
      assistant: { tools },
    });
    const { client } = await connectClient(root);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const replacement = startApp(root, { assistant: { tools } });
    const result = await client.callTool({ name: "count", arguments: {} });
    await replacement;
    expect(runs).toBe(1);
    expect(result.isError).toBe(true);
  });

  it("opens one session for concurrent callers, and a stale heartbeat can't drop a newer one", async () => {
    const root = await tempRoot();
    const app = await startApp(root);
    const { bridge } = await connectClient(root);
    const old = bridge.session;

    bridge.session = null;
    const [a, b] = await Promise.all([bridge.connect(), bridge.connect()]);
    expect(a).toBe(b);

    bridge.forget(old);
    expect(bridge.session).toBe(a);

    const status = await (await fetch(`${app.url}/api/assistant/status`)).json();
    expect(status.sessions).toHaveLength(2);
  });

  it("treats a well-formed but incomplete answer as unknown", async () => {
    const root = await tempRoot();
    await startApp(root, {
      before: (app) =>
        app.use(`${BRIDGE_BASE}/call`, express.json(), (req, res) => {
          res.json({ requestId: req.body.requestId, isError: false });
        }),
    });
    const { bridge } = await connectClient(root);
    await expect(bridge.call("list_sites", {})).rejects.toMatchObject({ code: "OUTCOME_UNKNOWN" });
  });

  it("a call that fails late doesn't drop a session opened in the meantime", async () => {
    const root = await tempRoot();
    let releaseCall;
    await startApp(root, {
      before: (app) =>
        app.use(`${BRIDGE_BASE}/call`, (req) => {
          releaseCall = () => req.socket.destroy();
        }),
    });
    const { bridge } = await connectClient(root);
    const pending = bridge.call("list_sites", {}).catch((error) => error);
    await new Promise((resolve) => setTimeout(resolve, 50));

    bridge.session = null;
    const fresh = await bridge.connect();
    releaseCall();
    expect((await pending).code).toBe("OUTCOME_UNKNOWN");
    expect(bridge.session).toBe(fresh);
  });

  it("hands images to the client as image content, labelled", async () => {
    const root = await tempRoot();
    await startApp(root, {
      assistant: {
        tools: [
          {
            name: "picture",
            description: "",
            inputSchema: { type: "object", properties: {} },
            run: async () => ({ data: { ok: true }, images: [{ data: "aGk=", mimeType: "image/png", mediaId: "m1", label: "A photo" }] }),
          },
        ],
      },
    });
    const { client } = await connectClient(root);
    const result = await client.callTool({ name: "picture", arguments: {} });
    expect(result.content.slice(1)).toEqual([
      { type: "text", text: "A photo" },
      { type: "image", data: "aGk=", mimeType: "image/png" },
    ]);
    expect(result.structuredContent).toEqual({ ok: true });
  });
});
