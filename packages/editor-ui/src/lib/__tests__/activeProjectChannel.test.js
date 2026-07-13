import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { announceActiveProjectChange, subscribeActiveProjectChange } from "../activeProjectChannel.js";

// Minimal in-memory BroadcastChannel that delivers to *other* same-name instances
// (never to the sender), mirroring the real spec closely enough to test cross-tab
// delivery within one process.
class MockBroadcastChannel {
  static instances = [];
  constructor(name) {
    this.name = name;
    this.listeners = [];
    this.closed = false;
    MockBroadcastChannel.instances.push(this);
  }
  postMessage(data) {
    for (const inst of MockBroadcastChannel.instances) {
      if (inst === this || inst.closed || inst.name !== this.name) continue;
      for (const l of inst.listeners) l({ data });
    }
  }
  addEventListener(type, cb) {
    if (type === "message") this.listeners.push(cb);
  }
  removeEventListener(type, cb) {
    this.listeners = this.listeners.filter((x) => x !== cb);
  }
  close() {
    this.closed = true;
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter((i) => i !== this);
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});
afterEach(() => vi.unstubAllGlobals());

describe("activeProjectChannel", () => {
  it("delivers an announcement to a subscriber", () => {
    const handler = vi.fn();
    const unsub = subscribeActiveProjectChange(handler);
    announceActiveProjectChange("proj-b");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("proj-b");
    unsub();
  });

  it("does not deliver after unsubscribe", () => {
    const handler = vi.fn();
    const unsub = subscribeActiveProjectChange(handler);
    unsub();
    announceActiveProjectChange("proj-b");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores unrelated messages", () => {
    const handler = vi.fn();
    const unsub = subscribeActiveProjectChange(handler);
    // a foreign message on the same channel name
    const other = new MockBroadcastChannel("widgetizer:active-project");
    other.postMessage({ type: "something-else" });
    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it("no-ops (does not throw) when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    expect(() => announceActiveProjectChange("x")).not.toThrow();
    const unsub = subscribeActiveProjectChange(() => {});
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});
