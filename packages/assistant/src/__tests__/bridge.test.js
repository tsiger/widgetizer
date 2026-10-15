import { describe, it, expect, afterEach } from "vitest";
import { startBridge, json, createAccessSource } from "./helpers.js";
import { BRIDGE_BASE, BRIDGE_PROTOCOL, ERROR_CODES } from "../protocol.js";

let bridge;
afterEach(async () => {
  await bridge?.close();
  bridge = null;
});

async function openSession(target = bridge, body = {}) {
  const res = await json(`${target.url}${BRIDGE_BASE}/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${target.token()}` },
    body: { bridge: BRIDGE_PROTOCOL, relay: { version: "1" }, client: { name: "Test", version: "1" }, ...body },
  });
  return res;
}

function sessionHeaders(session) {
  return { authorization: `Bearer ${session.sessionToken}`, "x-widgetizer-session": session.sessionId };
}

function call(session, tool, body) {
  return json(`${bridge.url}${BRIDGE_BASE}/call/${tool}`, { method: "POST", headers: sessionHeaders(session), body });
}

describe("assistant bridge", () => {
  it("answers hello with only its identity", async () => {
    bridge = await startBridge();
    const { status, data } = await json(`${bridge.url}${BRIDGE_BASE}/hello`);
    expect(status).toBe(200);
    expect(Object.keys(data).sort()).toEqual(["app", "bridge", "instanceId"]);
    expect(data.instanceId).toBe(bridge.publisher.record.instanceId);
  });

  it("refuses a session without the current installation token", async () => {
    bridge = await startBridge();
    const res = await json(`${bridge.url}${BRIDGE_BASE}/session`, {
      method: "POST",
      headers: { authorization: "Bearer nope" },
      body: { bridge: BRIDGE_PROTOCOL },
    });
    expect(res.status).toBe(401);
    expect(res.data.error.code).toBe(ERROR_CODES.TOKEN_INVALID);
  });

  it("names which side to update when bridge versions don't overlap", async () => {
    bridge = await startBridge();
    const old = await openSession(bridge, { bridge: { min: 0, max: 0 } });
    expect(old.status).toBe(409);
    expect(old.data.error.message).toMatch(/update the connection/);
    const newer = await openSession(bridge, { bridge: { min: 99, max: 99 } });
    expect(newer.data.error.message).toMatch(/update Widgetizer/);
  });

  it("serves the catalog and runs read tools for the open site", async () => {
    bridge = await startBridge();
    const { data: session } = await openSession();
    const catalog = await json(`${bridge.url}${BRIDGE_BASE}/catalog`, { headers: sessionHeaders(session) });
    expect(catalog.data.tools.map((tool) => tool.name)).toEqual(["widgetizer_status", "list_sites"]);
    expect(catalog.data.instructions.length).toBeGreaterThan(0);

    const status = await call(session, "widgetizer_status", { requestId: "req-status-1" });
    expect(status.data.structuredContent).toEqual({
      appVersion: "9.9.9",
      openSite: { id: "a", name: "Bakery", theme: "arch" },
    });

    const sites = await call(session, "list_sites", { requestId: "req-sites-1" });
    expect(sites.data.structuredContent.sites.map((site) => [site.id, site.isOpen])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("rejects unknown arguments with a fixable message", async () => {
    bridge = await startBridge();
    const { data: session } = await openSession();
    const res = await call(session, "list_sites", { requestId: "req-args-1", arguments: { page: 2 } });
    expect(res.data.isError).toBe(true);
    expect(res.data.error.message).toMatch(/Unknown argument\(s\): page/);
  });

  it("requires a request ID and echoes it, so a lost answer can be traced", async () => {
    bridge = await startBridge();
    const { data: session } = await openSession();
    expect((await call(session, "list_sites", {})).status).toBe(400);
    const res = await call(session, "list_sites", { requestId: "trace-me-123" });
    expect(res.data.requestId).toBe("trace-me-123");
  });

  it("ends every session and refuses calls when access is turned off", async () => {
    bridge = await startBridge();
    const { data: session } = await openSession();
    bridge.access.set(false);
    await bridge.assistant.settled();

    const res = await call(session, "list_sites", { requestId: "req-off-1" });
    expect(res.status).toBe(403);
    expect(res.data.error.code).toBe(ERROR_CODES.DISABLED);
    expect(bridge.publisher.record).toBeNull();

    bridge.access.set(true);
    await bridge.assistant.settled();
    const again = await call(session, "list_sites", { requestId: "req-off-2" });
    expect(again.data.error.code).toBe(ERROR_CODES.SESSION_EXPIRED);
  });

  it("issues a fresh token every time access is turned on", async () => {
    bridge = await startBridge();
    const firstToken = bridge.token();
    bridge.access.set(false);
    bridge.access.set(true);
    await bridge.assistant.settled();
    expect(bridge.token()).toBeTruthy();
    expect(bridge.token()).not.toBe(firstToken);
  });

  it("expires a session that stops sending heartbeats", async () => {
    let now = 1_000_000;
    bridge = await startBridge({ assistant: { now: () => now, heartbeatSeconds: 1 } });
    const { data: session } = await openSession();
    now += 2000;
    expect((await json(`${bridge.url}${BRIDGE_BASE}/heartbeat`, { method: "POST", headers: sessionHeaders(session) })).status).toBe(200);
    now += 3001;
    const late = await json(`${bridge.url}${BRIDGE_BASE}/heartbeat`, { method: "POST", headers: sessionHeaders(session) });
    expect(late.data.error.code).toBe(ERROR_CODES.SESSION_EXPIRED);
  });

  it("reports connected clients and real readiness on the control route", async () => {
    bridge = await startBridge();
    await openSession();
    const { data } = await json(`${bridge.url}/api/assistant/status`);
    expect(data).toMatchObject({ enabled: true, ready: true, error: null });
    expect(data.sessions.map((session) => session.client.name)).toEqual(["Test"]);
  });

  it("reports a failed publication instead of claiming to be ready", async () => {
    bridge = await startBridge({
      publisher: {
        publish: async () => {
          throw new Error("disk full");
        },
        unpublish: async () => {},
      },
    });
    const { data } = await json(`${bridge.url}/api/assistant/status`);
    expect(data).toMatchObject({ enabled: true, ready: false, error: "disk full" });
  });

  it("withdraws a publication that finishes after access was turned off", async () => {
    let release;
    const publisher = {
      record: null,
      publish: (record) =>
        new Promise((resolve) => {
          release = () => {
            publisher.record = record;
            resolve();
          };
        }),
      unpublish: async (instanceId) => {
        if (publisher.record?.instanceId === instanceId) publisher.record = null;
      },
    };
    const access = createAccessSource(false);
    bridge = await startBridge({ access, publisher });
    access.set(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    access.set(false);
    release();
    await bridge.assistant.settled();
    expect(publisher.record).toBeNull();
  });
});
