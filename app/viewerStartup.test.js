import { describe, it, expect, vi } from "vitest";
import { startViewerThenReady } from "./viewerStartup.js";

const base = { host: "127.0.0.1", appPort: 3001, appPortWasRequested: true };
const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

function makeLog() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("startViewerThenReady", () => {
  it("calls onReady after a delayed start succeeds, with the port and origins", async () => {
    const order = [];
    const viewer = {
      start: vi.fn(async () => {
        await delay(20);
        order.push("started");
        return { port: 3002 };
      }),
      origins: () => ["http://127.0.0.1:3002"],
    };
    const onReady = vi.fn(() => order.push("ready"));
    await startViewerThenReady({ ...base, viewer, onReady, log: makeLog() });
    expect(order).toEqual(["started", "ready"]);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(3001, { port: 3002, origins: ["http://127.0.0.1:3002"] });
    expect(viewer.start).toHaveBeenCalledWith({ host: "127.0.0.1", appPort: 3001, appPortWasRequested: true });
  });

  it("calls onReady with null after a delayed null", async () => {
    const viewer = { start: () => delay(20, null), origins: () => [] };
    const onReady = vi.fn();
    const log = makeLog();
    await startViewerThenReady({ ...base, viewer, onReady, log });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(3001, null);
    expect(log.log).not.toHaveBeenCalled();
  });

  it("treats a rejecting start as off, logs an error, and does not reject", async () => {
    const viewer = { start: () => Promise.reject(new Error("boom")), origins: () => [] };
    const onReady = vi.fn();
    const log = makeLog();
    await expect(startViewerThenReady({ ...base, viewer, onReady, log })).resolves.toBeUndefined();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(3001, null);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });

  it("treats a throwing start as off", async () => {
    const viewer = {
      start: () => {
        throw new Error("sync boom");
      },
      origins: () => [],
    };
    const onReady = vi.fn();
    const log = makeLog();
    await startViewerThenReady({ ...base, viewer, onReady, log });
    expect(onReady).toHaveBeenCalledWith(3001, null);
    expect(log.error).toHaveBeenCalled();
  });

  it("rejects when onReady itself throws", async () => {
    const viewer = { start: async () => null, origins: () => [] };
    const onReady = vi.fn(() => {
      throw new Error("ready failed");
    });
    await expect(startViewerThenReady({ ...base, viewer, onReady, log: makeLog() })).rejects.toThrow("ready failed");
  });
});
