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
    expect(state.scope).toEqual({
      actor: { id: "default", kind: "local" },
      projectId: "proj-1",
      folderName: "proj-one",
    });
  });

  it("fetchActiveProject records the error and stops loading on failure", async () => {
    getActiveProject.mockRejectedValue(new Error("boom"));
    await useProjectStore.getState().fetchActiveProject();

    const state = useProjectStore.getState();
    expect(state.error).toBe("boom");
    expect(state.loading).toBe(false);
    expect(state.activeProject).toBeNull();
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
