import { describe, it, expect } from "vitest";
import { createEnableGate, isTrustedSender } from "./assistantPrompt.js";

const ORIGIN = "http://127.0.0.1:4100";

function editorEvent(url = `${ORIGIN}/settings`) {
  const mainFrame = { url };
  const sender = { mainFrame };
  return { event: { sender, senderFrame: mainFrame }, webContents: sender };
}

describe("isTrustedSender", () => {
  it("accepts the editor's main frame only", () => {
    const { event, webContents } = editorEvent();
    expect(isTrustedSender(event, { webContents, rendererOrigin: ORIGIN })).toBe(true);
    expect(isTrustedSender({ ...event, senderFrame: { url: `${ORIGIN}/render/x` } }, { webContents, rendererOrigin: ORIGIN })).toBe(false);
    expect(isTrustedSender(event, { webContents: {}, rendererOrigin: ORIGIN })).toBe(false);
    const elsewhere = editorEvent("https://example.com/");
    expect(isTrustedSender(elsewhere.event, { webContents: elsewhere.webContents, rendererOrigin: ORIGIN })).toBe(false);
  });
});

function gate(overrides = {}) {
  const calls = { ask: 0, enable: 0 };
  let clock = 1000;
  const requestEnable = createEnableGate({
    isTrusted: () => true,
    getAccess: async () => ({ enabled: false }),
    enable: async () => {
      calls.enable += 1;
      return { enabled: true };
    },
    ask: async () => {
      calls.ask += 1;
      return true;
    },
    now: () => clock,
    cooldownMs: 2000,
    ...overrides,
  });
  return { requestEnable, calls, advance: (ms) => (clock += ms) };
}

describe("createEnableGate", () => {
  it("turns access on only after the user allows it", async () => {
    const { requestEnable, calls } = gate();
    expect(await requestEnable({})).toEqual({ result: "enabled" });
    expect(calls).toEqual({ ask: 1, enable: 1 });

    const cancelled = gate({ ask: async () => false });
    expect(await cancelled.requestEnable({})).toEqual({ result: "cancelled" });
    expect(cancelled.calls.enable).toBe(0);
  });

  it("refuses an untrusted sender without asking", async () => {
    const { requestEnable, calls } = gate({ isTrusted: () => false });
    expect(await requestEnable({})).toEqual({ result: "refused" });
    expect(calls.ask).toBe(0);
  });

  it("doesn't ask when access is already on", async () => {
    const { requestEnable, calls } = gate({ getAccess: async () => ({ enabled: true }) });
    expect(await requestEnable({})).toEqual({ result: "enabled" });
    expect(calls.ask).toBe(0);
  });

  it("runs one request at a time, even while the status check is still pending", async () => {
    let release;
    const { requestEnable, calls } = gate({
      getAccess: () =>
        new Promise((resolve) => {
          release = () => resolve({ enabled: false });
        }),
    });
    const first = requestEnable({});
    expect(await requestEnable({})).toEqual({ result: "busy" });
    release();
    expect(await first).toEqual({ result: "enabled" });
    expect(calls.ask).toBe(1);
  });

  it("pauses after each request so a page can't reopen the prompt at once", async () => {
    let asked = 0;
    const { requestEnable, advance } = gate({
      ask: async () => {
        asked += 1;
        return false;
      },
    });
    await requestEnable({});
    expect(await requestEnable({})).toEqual({ result: "busy" });
    advance(2000);
    expect(await requestEnable({})).toEqual({ result: "cancelled" });
    expect(asked).toBe(2);
  });

  it("reports a lost reply as unknown and never retries it", async () => {
    const { requestEnable, calls } = gate({
      enable: async () => {
        calls.enable += 1;
        throw new Error("The server didn't answer.");
      },
    });
    expect(await requestEnable({})).toEqual({ result: "unknown" });
    expect(calls.enable).toBe(1);
  });

  it("reports an unreachable server without asking", async () => {
    const { requestEnable, calls } = gate({ getAccess: async () => Promise.reject(new Error("down")) });
    expect(await requestEnable({})).toEqual({ result: "unavailable" });
    expect(calls.ask).toBe(0);
  });
});
