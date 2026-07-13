// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { PluginProvider } from "../../extension/PluginProvider.jsx";
import { useDispatchCommand } from "../useDispatchCommand.js";
import useProjectStore from "../../stores/projectStore.js";
import useToastStore from "../../stores/toastStore.js";

function wrapper({ commands = [], hooks } = {}) {
  const plugin = { name: "t", commands, ...(hooks ? { hooks } : {}) };
  return function Wrapper({ children }) {
    return <PluginProvider plugins={[plugin]}>{children}</PluginProvider>;
  };
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: { id: "p1" } });
});

describe("useDispatchCommand", () => {
  it("dispatches a command with a ctx carrying projectId, runCommand, and hooks", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });
    await act(async () => {
      await result.current.dispatch("save", "save");
    });
    expect(run).toHaveBeenCalledTimes(1);
    const ctx = run.mock.calls[0][0];
    expect(ctx.projectId).toBe("p1");
    expect(typeof ctx.runCommand).toBe("function");
    expect(typeof ctx.hooks.runBefore).toBe("function");
    expect(typeof ctx.hooks.runAfter).toBe("function");
  });

  it("tracks pending[actionId] true while the command is in flight, false after", async () => {
    let resolveRun;
    const run = vi.fn(() => new Promise((r) => { resolveRun = r; }));
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });

    let dispatchPromise;
    act(() => {
      dispatchPromise = result.current.dispatch("save", "save");
    });
    await waitFor(() => expect(result.current.pending.save).toBe(true));

    await act(async () => {
      resolveRun();
      await dispatchPromise;
    });
    expect(result.current.pending.save).toBe(false);
  });

  it("surfaces the rejected command's own error message in the toast", async () => {
    const showToast = vi.fn();
    useToastStore.setState({ showToast });
    const run = vi.fn().mockRejectedValue(new Error("This project is being edited elsewhere — refresh before publishing."));
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });
    await act(async () => {
      await result.current.dispatch("save", "save");
    });
    expect(showToast).toHaveBeenCalledWith(
      "This project is being edited elsewhere — refresh before publishing.",
      "error",
    );
  });

  it("falls back to the generic translated message when the rejection has no message", async () => {
    const showToast = vi.fn();
    useToastStore.setState({ showToast });
    const run = vi.fn().mockRejectedValue(new Error());
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });
    await act(async () => {
      await result.current.dispatch("save", "save");
    });
    expect(showToast).toHaveBeenCalledWith("pageEditor.toolbar.actionFailed", "error");
  });

  it("falls back to the generic message (does not crash) when a command rejects with a non-Error value", async () => {
    const showToast = vi.fn();
    useToastStore.setState({ showToast });
    const run = vi.fn().mockRejectedValue(null);
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });
    await act(async () => {
      await result.current.dispatch("save", "save");
    });
    expect(showToast).toHaveBeenCalledWith("pageEditor.toolbar.actionFailed", "error");
  });

  it("shows the generic message (not the raw internal string) when the command id doesn't resolve", async () => {
    const showToast = vi.fn();
    useToastStore.setState({ showToast });
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [] }) });
    await act(async () => {
      await result.current.dispatch("save", "save");
    });
    expect(showToast).toHaveBeenCalledWith("pageEditor.toolbar.actionFailed", "error");
  });

  it("ctx.runCommand reuses the same ctx (including hooks) for nested command calls", async () => {
    const inner = vi.fn().mockResolvedValue("inner-result");
    const outer = vi.fn((ctx) => ctx.runCommand("inner"));
    const { result } = renderHook(() => useDispatchCommand(), {
      wrapper: wrapper({ commands: [{ id: "outer", run: outer }, { id: "inner", run: inner }] }),
    });
    await act(async () => {
      await result.current.dispatch("outer", "outer");
    });
    expect(inner).toHaveBeenCalledTimes(1);
    const innerCtx = inner.mock.calls[0][0];
    expect(innerCtx.projectId).toBe("p1");
    expect(typeof innerCtx.hooks.runBefore).toBe("function");
  });

  it("gives independent pending state to separate hook instances (per-caller busy UI)", async () => {
    let resolveRun;
    const run = vi.fn(() => new Promise((r) => { resolveRun = r; }));
    const w = wrapper({ commands: [{ id: "save", run }] });
    const a = renderHook(() => useDispatchCommand(), { wrapper: w });
    const b = renderHook(() => useDispatchCommand(), { wrapper: w });

    act(() => {
      a.result.current.dispatch("save", "save");
    });
    await waitFor(() => expect(a.result.current.pending.save).toBe(true));
    expect(b.result.current.pending.save).toBeFalsy();

    await act(async () => {
      resolveRun();
    });
  });

  it("does not crash or log an error when the component unmounts before the awaited command resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveRun;
    const run = vi.fn(() => new Promise((r) => { resolveRun = r; }));
    const { result, unmount } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });

    let dispatchPromise;
    act(() => {
      dispatchPromise = result.current.dispatch("save", "save");
    });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));

    unmount();

    // The dispatch's own state updates (setPending in its `finally`) fire after
    // unmount here — this must not throw or log an error.
    await expect(
      act(async () => {
        resolveRun();
        await dispatchPromise;
      }),
    ).resolves.not.toThrow();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("runs concurrently (no dedupe/queueing) when dispatch() is called twice back-to-back on the same hook instance before the first resolves", async () => {
    const resolveFns = [];
    const run = vi.fn(() => new Promise((r) => { resolveFns.push(r); }));
    const { result } = renderHook(() => useDispatchCommand(), { wrapper: wrapper({ commands: [{ id: "save", run }] }) });

    let firstDispatch, secondDispatch;
    act(() => {
      firstDispatch = result.current.dispatch("save", "save");
      secondDispatch = result.current.dispatch("save", "save");
    });

    // Nothing in the hook guards a rapid repeat before the first call settles —
    // both invocations reach the command directly, concurrently.
    expect(run).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFns.forEach((resolve) => resolve());
      await Promise.all([firstDispatch, secondDispatch]);
    });

    expect(result.current.pending.save).toBe(false);
  });
});
