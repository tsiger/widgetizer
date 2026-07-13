import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../queries/projectManager", () => ({
  getActiveProject: vi.fn(),
}));

const { default: useProjectStore } = await import("../projectStore");
const { getActiveProject } = await import("../../queries/projectManager");

function resetStore() {
  useProjectStore.setState({ activeProject: null, scope: null, loading: true, error: null });
}

const PROJECT = { id: "proj-1", folderName: "proj-one", name: "Proj One", theme: "arch" };

describe("projectStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it("fetchActiveProject sets the project and derives scope (OSS path)", async () => {
    getActiveProject.mockResolvedValue(PROJECT);
    await useProjectStore.getState().fetchActiveProject();

    const state = useProjectStore.getState();
    expect(state.activeProject).toEqual(PROJECT);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.scope).toEqual({
      actor: { id: "default", kind: "local" },
      projectId: "proj-1",
      folderName: "proj-one",
    });
  });

  it("surfaces an error after exhausting retries (leaves activeProject null)", async () => {
    vi.useFakeTimers();
    getActiveProject.mockRejectedValue(new Error("boom"));
    const p = useProjectStore.getState().fetchActiveProject();
    await vi.runAllTimersAsync();
    await p;

    const state = useProjectStore.getState();
    expect(state.error).toBe("boom");
    expect(state.loading).toBe(false);
    expect(state.activeProject).toBeNull();
    expect(getActiveProject).toHaveBeenCalledTimes(3); // 1 + 2 retries
    vi.useRealTimers();
  });

  it("retries a transient failure and resolves without an error", async () => {
    vi.useFakeTimers();
    getActiveProject.mockRejectedValueOnce(new Error("aborted")).mockResolvedValue(PROJECT);
    const p = useProjectStore.getState().fetchActiveProject();
    await vi.runAllTimersAsync();
    await p;

    const state = useProjectStore.getState();
    expect(state.activeProject).toEqual(PROJECT);
    expect(state.error).toBeNull();
    vi.useRealTimers();
  });

  it("treats a resolved null as no active project (no retry, no error)", async () => {
    getActiveProject.mockResolvedValue(null);
    await useProjectStore.getState().fetchActiveProject();

    const state = useProjectStore.getState();
    expect(state.activeProject).toBeNull();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(getActiveProject).toHaveBeenCalledTimes(1);
  });

  it("shares a single in-flight fetch across concurrent calls (StrictMode dedup)", async () => {
    getActiveProject.mockResolvedValue(PROJECT);
    await Promise.all([
      useProjectStore.getState().fetchActiveProject(),
      useProjectStore.getState().fetchActiveProject(),
    ]);
    expect(getActiveProject).toHaveBeenCalledTimes(1);
  });

  it("seedProject sets the project + derived scope without a fetch (DI path)", () => {
    useProjectStore.getState().seedProject(PROJECT);

    const state = useProjectStore.getState();
    expect(getActiveProject).not.toHaveBeenCalled();
    expect(state.activeProject).toEqual(PROJECT);
    expect(state.loading).toBe(false);
    expect(state.scope.projectId).toBe("proj-1");
  });

  it("seedProject honors an explicit scope (e.g. a hosted cloud actor)", () => {
    const scope = { actor: { id: "user_abc", kind: "cloud" }, projectId: "proj-1", folderName: "proj-one" };
    useProjectStore.getState().seedProject(PROJECT, scope);
    expect(useProjectStore.getState().scope).toEqual(scope);
  });

  it("setActiveProject(null) clears scope", () => {
    useProjectStore.getState().setActiveProject(PROJECT);
    expect(useProjectStore.getState().scope).not.toBeNull();
    useProjectStore.getState().setActiveProject(null);
    expect(useProjectStore.getState().scope).toBeNull();
  });
});
