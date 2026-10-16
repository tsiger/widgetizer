import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { createServerRpc } from "./serverRpc.js";

function fakeChild() {
  const child = new EventEmitter();
  child.sent = [];
  child.postMessage = (message) => child.sent.push(message);
  return child;
}

describe("createServerRpc", () => {
  it("matches each reply to its own request", async () => {
    const child = fakeChild();
    const rpc = createServerRpc(child);
    const first = rpc.call("assistantAccess");
    const second = rpc.call("enableAssistant");
    const [a, b] = child.sent;
    child.emit("message", { type: "rpc-result", id: b.id, ok: true, value: { enabled: true } });
    child.emit("message", { type: "rpc-result", id: a.id, ok: false, error: "nope" });
    await expect(second).resolves.toEqual({ enabled: true });
    await expect(first).rejects.toThrow("nope");
  });

  it("settles every waiting call when the server exits, and refuses calls after", async () => {
    const child = fakeChild();
    const rpc = createServerRpc(child);
    const waiting = rpc.call("assistantAccess");
    child.emit("exit", 1);
    await expect(waiting).rejects.toThrow("The server stopped.");
    await expect(rpc.call("assistantAccess")).rejects.toThrow("The server stopped.");
  });

  it("gives up on a reply that never comes, and ignores it if it arrives late", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      const rpc = createServerRpc(child, { deadlineMs: 100 });
      const waiting = rpc.call("enableAssistant");
      const assertion = expect(waiting).rejects.toThrow("didn't answer");
      vi.advanceTimersByTime(100);
      await assertion;
      child.emit("message", { type: "rpc-result", id: child.sent[0].id, ok: true, value: {} });
    } finally {
      vi.useRealTimers();
    }
  });
});
