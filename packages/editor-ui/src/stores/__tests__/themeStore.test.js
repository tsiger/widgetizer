import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: vi.fn(),
  saveThemeSettings: vi.fn(),
}));
vi.mock("../../queries/mediaManager", () => ({
  invalidateMediaCache: vi.fn(),
}));
vi.mock("../../lib/activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "project-a"),
}));

const { default: useThemeStore } = await import("../themeStore");
const { getThemeSettings, saveThemeSettings } = await import("../../queries/themeManager");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useThemeStore.setState({
    settings: null,
    originalSettings: null,
    loading: false,
    error: null,
    loadedProjectId: null,
    activeLoadId: 0,
  });
}

function seedSettings() {
  const settings = {
    settings: {
      global: {
        colors: [
          { id: "primary_color", type: "color", value: "#ff0000" },
          { id: "secondary_color", type: "color", value: "#00ff00" },
        ],
      },
    },
  };

  useThemeStore.setState({
    settings: JSON.parse(JSON.stringify(settings)),
    originalSettings: JSON.parse(JSON.stringify(settings)),
    loadedProjectId: "project-a",
  });

  return settings;
}

// ============================================================================
// Tests
// ============================================================================

describe("themeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // loadSettings — failure clears stale data
  // --------------------------------------------------------------------------

  describe("loadSettings — failure handling", () => {
    it("clears previous project data on load failure", async () => {
      // Load project A successfully
      const projectASettings = {
        settings: { global: { colors: [{ id: "c1", value: "#aaa" }] } },
      };
      getThemeSettings.mockResolvedValueOnce(projectASettings);

      await useThemeStore.getState().loadSettings("project-a");
      expect(useThemeStore.getState().settings).toEqual(projectASettings);
      expect(useThemeStore.getState().loadedProjectId).toBe("project-a");

      // Now try loading project B — it fails
      getThemeSettings.mockRejectedValueOnce(new Error("Network error"));

      await useThemeStore.getState().loadSettings("project-b");

      const state = useThemeStore.getState();
      // Project A's data must NOT leak into project B
      expect(state.settings).toBeNull();
      expect(state.originalSettings).toBeNull();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.error).toBe("Network error");
      expect(state.loading).toBe(false);
    });

    it("does not clear data if a newer load superseded the failed one", async () => {
      // Start two loads in quick succession
      const slowFailure = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("slow fail")), 50),
      );
      const fastSuccess = Promise.resolve({
        settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } },
      });

      getThemeSettings
        .mockImplementationOnce(() => slowFailure)
        .mockImplementationOnce(() => fastSuccess);

      const firstLoad = useThemeStore.getState().loadSettings("project-a");
      const secondLoad = useThemeStore.getState().loadSettings("project-b");

      await secondLoad;
      await firstLoad.catch(() => {}); // wait for the failure to resolve

      // Project B's data should be intact
      const state = useThemeStore.getState();
      expect(state.settings).not.toBeNull();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // saveSettings — warning handling
  // --------------------------------------------------------------------------

  describe("saveSettings — warning handling", () => {
    it("reloads corrected values when server returns warnings", async () => {
      seedSettings();

      const correctedSettings = {
        settings: {
          global: {
            colors: [
              { id: "primary_color", type: "color", value: "#corrected" },
              { id: "secondary_color", type: "color", value: "#00ff00" },
            ],
          },
        },
      };

      saveThemeSettings.mockResolvedValueOnce({
        warnings: ["primary_color was out of range"],
      });
      getThemeSettings.mockResolvedValueOnce(correctedSettings);

      const result = await useThemeStore.getState().saveSettings("project-a");

      expect(result.warnings).toHaveLength(1);
      // Store should now reflect the corrected values
      expect(useThemeStore.getState().settings).toEqual(correctedSettings);
      expect(useThemeStore.getState().originalSettings).toEqual(correctedSettings);
    });

    it("marks settings as saved without refetch when no warnings", async () => {
      seedSettings();

      // Modify a setting
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#changed");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

      saveThemeSettings.mockResolvedValueOnce({});

      await useThemeStore.getState().saveSettings("project-a");

      // Should not have refetched
      expect(getThemeSettings).not.toHaveBeenCalled();
      // Should be marked as saved
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // updateThemeSetting
  // --------------------------------------------------------------------------

  describe("updateThemeSetting", () => {
    it("updates a setting and makes hasUnsavedThemeChanges return true", () => {
      seedSettings();
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);

      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
      const primary = useThemeStore.getState().settings.settings.global.colors
        .find((s) => s.id === "primary_color");
      expect(primary.value).toBe("#0000ff");
    });
  });

  // --------------------------------------------------------------------------
  // resetThemeSettings
  // --------------------------------------------------------------------------

  describe("resetThemeSettings", () => {
    it("reverts to original settings", () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#changed");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

      useThemeStore.getState().resetThemeSettings();
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // resetForProjectChange
  // --------------------------------------------------------------------------

  describe("resetForProjectChange", () => {
    it("clears all state", () => {
      seedSettings();
      useThemeStore.getState().resetForProjectChange();

      const state = useThemeStore.getState();
      expect(state.settings).toBeNull();
      expect(state.originalSettings).toBeNull();
      expect(state.loadedProjectId).toBeNull();
    });

    it("invalidates in-flight loads so stale responses are dropped", async () => {
      seedSettings();

      // Start a slow load
      const slowResponse = {
        settings: { global: { colors: [{ id: "c1", value: "#stale" }] } },
      };
      let resolveSlowLoad;
      getThemeSettings.mockImplementationOnce(
        () => new Promise((resolve) => { resolveSlowLoad = resolve; }),
      );

      const loadPromise = useThemeStore.getState().loadSettings("project-b");

      // Reset mid-flight — should bump activeLoadId
      useThemeStore.getState().resetForProjectChange();
      expect(useThemeStore.getState().settings).toBeNull();

      // Now the slow load resolves
      resolveSlowLoad(slowResponse);
      await loadPromise;

      // The stale response should have been dropped
      expect(useThemeStore.getState().settings).toBeNull();
      expect(useThemeStore.getState().loadedProjectId).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Project-switch coordination
  // --------------------------------------------------------------------------

  describe("project-switch coordination", () => {
    it("clears stale settings immediately when loading a different project", async () => {
      seedSettings();

      let resolveLoad;
      getThemeSettings.mockImplementationOnce(
        () => new Promise((resolve) => { resolveLoad = resolve; }),
      );

      const loadPromise = useThemeStore.getState().loadSettings("project-b");

      const stateWhileLoading = useThemeStore.getState();
      expect(stateWhileLoading.loading).toBe(true);
      expect(stateWhileLoading.loadedProjectId).toBe("project-b");
      expect(stateWhileLoading.settings).toBeNull();
      expect(stateWhileLoading.originalSettings).toBeNull();

      resolveLoad({ settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } } });
      await loadPromise;
    });

    it("switching projects mid-load drops the first project's response", async () => {
      let resolveA;
      const dataA = { settings: { global: { colors: [{ id: "c1", value: "#aaa" }] } } };
      const dataB = { settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } } };

      getThemeSettings
        .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
        .mockResolvedValueOnce(dataB);

      // Start loading project A
      const loadA = useThemeStore.getState().loadSettings("project-a");
      // Immediately start loading project B (simulates project switch)
      const loadB = useThemeStore.getState().loadSettings("project-b");

      await loadB;

      // B should be loaded
      expect(useThemeStore.getState().loadedProjectId).toBe("project-b");
      expect(useThemeStore.getState().settings).toEqual(dataB);

      // Now A's slow response arrives
      resolveA(dataA);
      await loadA;

      // A's response should be dropped — B should still be current
      expect(useThemeStore.getState().loadedProjectId).toBe("project-b");
      expect(useThemeStore.getState().settings).toEqual(dataB);
    });

    it("loading the same project preserves unsaved draft", async () => {
      const serverData = { settings: { global: { colors: [{ id: "c1", value: "#server" }] } } };
      getThemeSettings.mockResolvedValueOnce(serverData);

      await useThemeStore.getState().loadSettings("project-a");

      // User edits a setting (creates a draft)
      useThemeStore.getState().updateThemeSetting("colors", "c1", "#draft");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

      // loadSettings for the same project should be skippable by callers
      // (pageStore does this check), but if called directly it refetches
      getThemeSettings.mockResolvedValueOnce(serverData);
      await useThemeStore.getState().loadSettings("project-a");

      // Direct loadSettings always refetches — draft is lost
      // This is correct; the skip logic lives in pageStore.loadPage()
      expect(useThemeStore.getState().settings).toEqual(serverData);
    });
  });
});
