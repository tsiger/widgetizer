import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import express from "express";
import { createRequestGuard } from "../requestGuard.js";

let server;
afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve())));

async function start(options) {
  const app = express();
  let port = null;
  app.use(createRequestGuard({ getPort: () => port, loopbackOnly: true, controlPaths: ["/api/assistant"], ...options }));
  app.all(/.*/, (_req, res) => res.json({ ok: true }));
  server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  port = server.address().port;
  return port;
}

function request(port, { method = "GET", path = "/api/pages", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("request guard", () => {
  it("rejects a Host that isn't this server (DNS rebinding)", async () => {
    const port = await start();
    expect(await request(port, { headers: { host: "evil.test" } })).toBe(421);
    expect(await request(port, { headers: { host: `localhost:${port}` } })).toBe(200);
  });

  it("allows writes only from this server's own origin or an allowed dev origin", async () => {
    const port = await start({ extraOrigins: ["http://localhost:3000"] });
    expect(await request(port, { method: "POST" })).toBe(403);
    expect(await request(port, { method: "POST", headers: { origin: "http://evil.test" } })).toBe(403);
    expect(await request(port, { method: "POST", headers: { origin: "null" } })).toBe(403);
    expect(await request(port, { method: "POST", headers: { origin: `http://127.0.0.1:${port}` } })).toBe(200);
    expect(await request(port, { method: "POST", headers: { origin: "http://localhost:3000" } })).toBe(200);
  });

  it("leaves the relay's bridge routes to their own credentials", async () => {
    const port = await start({ editorSecret: "s3cret" });
    expect(await request(port, { method: "POST", path: "/api/assistant/bridge/session" })).toBe(200);
  });

  it("requires the editor credential for writes and control routes when one is configured", async () => {
    const port = await start({ editorSecret: "s3cret" });
    const origin = `http://127.0.0.1:${port}`;
    expect(await request(port, { method: "PUT", path: "/api/settings", headers: { origin } })).toBe(403);
    expect(await request(port, { path: "/api/assistant/status" })).toBe(403);
    expect(
      await request(port, { method: "PUT", path: "/api/settings", headers: { origin, "x-widgetizer-editor": "wrong" } }),
    ).toBe(403);
    expect(
      await request(port, { method: "PUT", path: "/api/settings", headers: { origin, "x-widgetizer-editor": "s3cret" } }),
    ).toBe(200);
    expect(await request(port, { path: "/api/assistant/status", headers: { "x-widgetizer-editor": "s3cret" } })).toBe(200);
    expect(await request(port, { path: "/api/pages" })).toBe(200);
  });

  it("can't be sidestepped with a differently cased path", async () => {
    const port = await start({ editorSecret: "s3cret" });
    const origin = `http://127.0.0.1:${port}`;
    expect(await request(port, { method: "PUT", path: "/API/Settings", headers: { origin } })).toBe(403);
    expect(await request(port, { method: "PUT", path: "/API/settings" })).toBe(403);
    expect(await request(port, { path: "/api/Assistant/status" })).toBe(403);
  });

  it("checks writes everywhere, not only under /api", async () => {
    const port = await start();
    expect(await request(port, { method: "POST", path: "/render/x", headers: { origin: "http://evil.test" } })).toBe(403);
  });

  it("on an all-interfaces bind, accepts loopback names and configured hosts but not a rebinding attacker", async () => {
    const port = await start({ loopbackOnly: false, allowedHosts: ["widgetizer.lan:8080"] });
    const as = (host, extra = {}) => request(port, { method: "POST", headers: { host, origin: `http://${host}`, ...extra } });
    expect(await as("localhost:9999")).toBe(200);
    expect(await as("widgetizer.lan:8080")).toBe(200);
    expect(await as(`evil.test:${port}`)).toBe(421);
  });
});
