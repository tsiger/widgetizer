import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createConnectionFile, ownerStillRunning } from "../local/connectionFile.js";
import { BRIDGE_BASE } from "../protocol.js";
import { createMemoryOwnerStore } from "./helpers.js";

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz connection "));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function closedPort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return `http://127.0.0.1:${port}`;
}

async function serve(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function hello(instanceId) {
  return (req, res) => {
    if (req.url !== `${BRIDGE_BASE}/hello`) return res.writeHead(404).end();
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ app: "widgetizer", instanceId }));
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const readFile = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

describe("connection file", () => {
  it("publishes the address and token, and removes only its own file", async () => {
    const root = await tempRoot();
    const file = createConnectionFile({ dataRoot: root, ownerStore: createMemoryOwnerStore() });
    await file.publish({ url: "http://127.0.0.1:4000", token: "secret", instanceId: "me" });
    expect(await readFile(file.path)).toMatchObject({
      format: 1,
      app: "widgetizer",
      url: "http://127.0.0.1:4000",
      token: "secret",
      instanceId: "me",
      pid: process.pid,
    });

    await file.unpublish("someone-else");
    await expect(fs.access(file.path)).resolves.toBeUndefined();
    await file.unpublish("me");
    await expect(fs.access(file.path)).rejects.toThrow();
  });

  it.skipIf(process.platform === "win32")("keeps the folder and file private to the user", async () => {
    const root = await tempRoot();
    const file = createConnectionFile({ dataRoot: root, ownerStore: createMemoryOwnerStore() });
    await file.publish({ url: "http://127.0.0.1:4000", token: "secret", instanceId: "me" });
    expect((await fs.stat(path.dirname(file.path))).mode & 0o777).toBe(0o700);
    expect((await fs.stat(file.path)).mode & 0o777).toBe(0o600);
  });

  it.runIf(process.platform === "win32")("keeps the folder private to the user and SYSTEM on Windows", async () => {
    const { execFileSync } = await import("node:child_process");
    const root = await tempRoot();
    const file = createConnectionFile({ dataRoot: root, ownerStore: createMemoryOwnerStore() });
    await file.publish({ url: "http://127.0.0.1:4000", token: "secret", instanceId: "me" });
    const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
    const grantees = execFileSync(icacls, [file.path], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.replace(file.path, "").trim())
      .filter((line) => line.includes(":("))
      .map((line) => line.split(":(")[0]);
    expect(grantees).toHaveLength(2);
    expect(grantees.some((name) => /SYSTEM$/.test(name))).toBe(true);
    expect(grantees.some((name) => name.endsWith(`\\${os.userInfo().username}`))).toBe(true);
  });

  it("takes over from a recorded owner that is no longer running", async () => {
    const root = await tempRoot();
    const ownerStore = createMemoryOwnerStore();
    ownerStore.set({ pid: 1, instanceId: "crashed", url: "http://127.0.0.1:1" });
    const file = createConnectionFile({ dataRoot: root, ownerStore, isOwnerRunning: async () => false });
    await file.publish({ url: "http://127.0.0.1:4000", token: "fresh", instanceId: "me" });
    expect((await readFile(file.path)).token).toBe("fresh");
    expect(ownerStore.get().instanceId).toBe("me");
  });

  it("refuses to take over from a Widgetizer that is still running", async () => {
    const root = await tempRoot();
    const ownerStore = createMemoryOwnerStore();
    ownerStore.set({ pid: process.pid, instanceId: "other", url: await serve(hello("other")) });
    const file = createConnectionFile({ dataRoot: root, ownerStore });
    await expect(file.publish({ url: "http://127.0.0.1:4000", token: "mine", instanceId: "me" })).rejects.toThrow(
      /Another Widgetizer/,
    );
    expect(ownerStore.get().instanceId).toBe("other");
  });

  it("when two starters both see the same stale owner, only one takes over", async () => {
    const root = await tempRoot();
    const ownerStore = createMemoryOwnerStore();
    ownerStore.set({ pid: 1, instanceId: "stale" });
    const bothChecked = deferred();
    let checks = 0;
    const isOwnerRunning = async (owner) => {
      if (owner.instanceId !== "stale") return true;
      if (++checks === 2) bothChecked.resolve();
      await bothChecked.promise;
      return false;
    };
    const a = createConnectionFile({ dataRoot: root, ownerStore, isOwnerRunning });
    const b = createConnectionFile({ dataRoot: root, ownerStore, isOwnerRunning });
    const results = await Promise.allSettled([
      a.publish({ url: "http://127.0.0.1:4001", token: "a", instanceId: "a" }),
      b.publish({ url: "http://127.0.0.1:4002", token: "b", instanceId: "b" }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect((await readFile(a.path)).instanceId).toBe(ownerStore.get().instanceId);
  });

  it("a displaced owner can't remove or overwrite its successor's file", async () => {
    const root = await tempRoot();
    const ownerStore = createMemoryOwnerStore();
    const first = createConnectionFile({ dataRoot: root, ownerStore, isOwnerRunning: async () => false });
    await first.publish({ url: "http://127.0.0.1:4001", token: "a", instanceId: "a" });
    const second = createConnectionFile({ dataRoot: root, ownerStore, isOwnerRunning: async () => false });
    await second.publish({ url: "http://127.0.0.1:4002", token: "b", instanceId: "b" });

    await first.unpublish("a");
    await first.close();
    expect((await readFile(second.path)).instanceId).toBe("b");
    expect(ownerStore.get().instanceId).toBe("b");
  });

  it("releases the folder on close", async () => {
    const root = await tempRoot();
    const ownerStore = createMemoryOwnerStore();
    const file = createConnectionFile({ dataRoot: root, ownerStore });
    await file.publish({ url: "http://127.0.0.1:4001", token: "a", instanceId: "a" });
    await file.close();
    await expect(fs.access(file.path)).rejects.toThrow();
    expect(ownerStore.get()).toBeNull();
  });
});

describe("ownerStillRunning", () => {
  const owner = (url, instanceId = "owner") => ({ pid: process.pid, instanceId, url });

  it("counts only proof as gone: a dead process, a refused address, or another instance answering", async () => {
    expect(await ownerStillRunning({ pid: 999999999, instanceId: "x", url: "http://127.0.0.1:1" })).toBe(false);
    expect(await ownerStillRunning(owner(await closedPort()))).toBe(false);
    expect(await ownerStillRunning(owner(await serve(hello("someone-else"))))).toBe(false);
  });

  it("keeps an owner that answers as itself, or whose reply is ambiguous", async () => {
    expect(await ownerStillRunning(owner(await serve(hello("owner"))))).toBe(true);
    expect(await ownerStillRunning(owner(await serve((_req, res) => res.writeHead(500).end())))).toBe(true);
    expect(await ownerStillRunning(owner(await serve((_req, res) => res.end("{not json"))))).toBe(true);
    expect(await ownerStillRunning(owner(await serve((req) => req.socket.destroy())))).toBe(true);
  });
});
