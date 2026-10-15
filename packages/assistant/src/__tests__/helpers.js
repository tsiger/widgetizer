import express from "express";
import { setupAssistantServer } from "../index.js";
import { BRIDGE_BASE } from "../protocol.js";

export function createAccessSource(initial = true) {
  let enabled = initial;
  const listeners = new Set();
  return {
    isEnabled: () => enabled,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(value) {
      enabled = value;
      for (const fn of listeners) fn();
    },
  };
}

export const SITES = [
  { id: "a", name: "Bakery", theme: "arch" },
  { id: "b", name: "Studio", theme: "arch" },
];

export function createSites(openId = "a") {
  return {
    list: async () => SITES,
    get: async (_actor, id) => SITES.find((site) => site.id === id) ?? null,
    openSiteId: async () => openId,
  };
}

/** Same contract as the shell's database-backed store; one per simulated data folder. */
export function createMemoryOwnerStore() {
  let owner = null;
  return {
    transaction: (fn) => fn(),
    get: () => (owner ? { ...owner } : null),
    set: (next) => {
      owner = { ...next };
    },
    clear: () => {
      owner = null;
    },
  };
}

export function createMemoryPublisher() {
  const publisher = {
    record: null,
    published: 0,
    async publish(record) {
      publisher.record = record;
      publisher.published += 1;
    },
    async unpublish(instanceId) {
      if (publisher.record?.instanceId === instanceId) publisher.record = null;
    },
  };
  return publisher;
}

/** Run the assistant routers on a real loopback port. */
export async function startBridge(options = {}) {
  const access = options.access ?? createAccessSource(true);
  const publisher = options.publisher ?? createMemoryPublisher();
  const assistant = setupAssistantServer({
    access,
    publisher,
    sites: options.sites ?? createSites(),
    resolveActor: async () => ({ id: "default", kind: "local" }),
    appInfo: { version: "9.9.9" },
    ...options.assistant,
  });
  const app = express();
  options.before?.(app);
  app.use(BRIDGE_BASE, assistant.bridgeRouter);
  app.use("/api/assistant", assistant.controlRouter);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  await assistant.start(url);
  return {
    url,
    access,
    assistant,
    publisher,
    token: () => publisher.record?.token,
    async close() {
      await assistant.stop();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export async function json(url, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}
