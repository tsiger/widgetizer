// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../lib/activeProjectId.js", () => ({ getActiveProjectId: vi.fn() }));
vi.mock("../../queries/projectManager.js", () => ({ getActiveProject: vi.fn() }));
vi.mock("../../lib/activeProjectChannel.js", () => ({
  subscribeActiveProjectChange: vi.fn(() => () => {}),
}));

const { getActiveProjectId } = await import("../../lib/activeProjectId.js");
const { getActiveProject } = await import("../../queries/projectManager.js");
const { subscribeActiveProjectChange } = await import("../../lib/activeProjectChannel.js");
const { isActiveProjectStale, useStaleActiveProjectDetection } = await import(
  "../useStaleActiveProjectDetection.js"
);
const useStaleProjectStore = (await import("../../stores/staleProjectStore.js")).default;

beforeEach(() => {
  vi.clearAllMocks();
  useStaleProjectStore.getState().clearStale();
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});
afterEach(() => vi.restoreAllMocks());

async function fireFocus() {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("isActiveProjectStale", () => {
  it("true only when both ids present and differ", () => {
    expect(isActiveProjectStale("a", { id: "b" })).toBe(true);
    expect(isActiveProjectStale("a", { id: "a" })).toBe(false);
    expect(isActiveProjectStale(null, { id: "b" })).toBe(false);
    expect(isActiveProjectStale("a", null)).toBe(false);
    expect(isActiveProjectStale("a", {})).toBe(false);
  });
});

describe("useStaleActiveProjectDetection", () => {
  it("clears any leftover flag on mount (clean slate on editor entry)", () => {
    useStaleProjectStore.getState().markStale("Leftover");
    renderHook(() => useStaleActiveProjectDetection());
    expect(useStaleProjectStore.getState().isStale).toBe(false);
  });

  it("marks stale on focus when the server active project differs", async () => {
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockResolvedValue({ id: "b", name: "Marketing" });
    renderHook(() => useStaleActiveProjectDetection());
    await fireFocus();
    expect(useStaleProjectStore.getState().isStale).toBe(true);
    expect(useStaleProjectStore.getState().incomingName).toBe("Marketing");
  });

  it("clears stale on refocus once no longer stale (recovery path)", async () => {
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockResolvedValue({ id: "a", name: "Home" });
    renderHook(() => useStaleActiveProjectDetection());
    // Simulate a flag set during the session (e.g. saveStore's 409 branch),
    // then a refocus that finds the server no longer diverges.
    act(() => useStaleProjectStore.getState().markStale("Marketing"));
    await fireFocus();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
  });

  it("re-checks immediately when a sibling tab announces an active-project change", async () => {
    let channelHandler;
    subscribeActiveProjectChange.mockImplementationOnce((cb) => {
      channelHandler = cb;
      return () => {};
    });
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockResolvedValue({ id: "b", name: "Marketing" });
    renderHook(() => useStaleActiveProjectDetection());
    await act(async () => {
      channelHandler(); // simulate the sibling tab's broadcast
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useStaleProjectStore.getState().isStale).toBe(true);
    expect(useStaleProjectStore.getState().incomingName).toBe("Marketing");
  });

  it("dedupes the focus + visibilitychange double-fire into a single probe", async () => {
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockResolvedValue({ id: "b", name: "Marketing" });
    renderHook(() => useStaleActiveProjectDetection());
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getActiveProject).toHaveBeenCalledTimes(1);
    expect(useStaleProjectStore.getState().isStale).toBe(true);
  });

  it("does not curtain on a probe failure", async () => {
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockRejectedValue(new Error("network"));
    renderHook(() => useStaleActiveProjectDetection());
    await fireFocus();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
  });

  it("ignores the check while the tab is hidden", async () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    getActiveProjectId.mockReturnValue("a");
    getActiveProject.mockResolvedValue({ id: "b", name: "Marketing" });
    renderHook(() => useStaleActiveProjectDetection());
    await fireFocus();
    expect(getActiveProject).not.toHaveBeenCalled();
    expect(useStaleProjectStore.getState().isStale).toBe(false);
  });
});
