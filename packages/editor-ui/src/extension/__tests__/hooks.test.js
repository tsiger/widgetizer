import { describe, it, expect, vi } from "vitest";
import { createHookRunner, HOOK_EVENTS } from "../hooks.js";

describe("createHookRunner", () => {
  it("exposes the MVP lifecycle events", () => {
    expect(HOOK_EVENTS).toContain("beforePublish");
    expect(HOOK_EVENTS).toContain("afterPublish");
    expect(HOOK_EVENTS).toContain("beforePageDelete");
  });

  it("runBefore runs handlers in plugin order and resolves proceed:true when none refuse", async () => {
    const calls = [];
    const runner = createHookRunner([
      { name: "a", hooks: { beforePublish: async () => void calls.push("a") } },
      { name: "b", hooks: { beforePublish: async () => void calls.push("b") } },
    ]);
    const result = await runner.runBefore("beforePublish", { projectId: "p" });
    expect(result).toEqual({ proceed: true });
    expect(calls).toEqual(["a", "b"]);
  });

  it("runBefore halts on the first refusal and returns its message", async () => {
    const calls = [];
    const runner = createHookRunner([
      { name: "a", hooks: { beforePublish: async () => void calls.push("a") } },
      { name: "b", hooks: { beforePublish: async () => ({ proceed: false, message: "limit reached" }) } },
      { name: "c", hooks: { beforePublish: async () => void calls.push("c") } },
    ]);
    const result = await runner.runBefore("beforePublish");
    expect(result).toEqual({ proceed: false, message: "limit reached" });
    expect(calls).toEqual(["a"]); // c never runs
  });

  it("runBefore passes ctx and args through to handlers", async () => {
    const seen = [];
    const runner = createHookRunner([
      { name: "a", hooks: { beforePageDelete: async (ctx, pageId) => void seen.push([ctx, pageId]) } },
    ]);
    await runner.runBefore("beforePageDelete", { scope: "s" }, "home");
    expect(seen).toEqual([[{ scope: "s" }, "home"]]);
  });

  it("runAfter runs every handler and swallows errors", async () => {
    const calls = [];
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const runner = createHookRunner([
      { name: "a", hooks: { afterPublish: async () => void calls.push("a") } },
      { name: "boom", hooks: { afterPublish: async () => { throw new Error("nope"); } } },
      { name: "c", hooks: { afterPublish: async () => void calls.push("c") } },
    ]);
    await runner.runAfter("afterPublish", { version: 2 });
    expect(calls).toEqual(["a", "c"]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("no handlers => before proceeds, after is a no-op", async () => {
    const runner = createHookRunner([{ name: "a" }]);
    expect(await runner.runBefore("beforePublish")).toEqual({ proceed: true });
    await expect(runner.runAfter("afterPublish")).resolves.toBeUndefined();
  });
});
