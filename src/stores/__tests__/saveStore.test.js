import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock all external query modules
vi.mock("../../queries/pageManager", () => ({
  getPage: vi.fn(),
  savePageContent: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/previewManager", () => ({
  getGlobalWidgets: vi.fn(),
  saveGlobalWidget: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: vi.fn(),
  saveThemeSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../queries/mediaManager", () => ({
  invalidateMediaCache: vi.fn(),
}));
vi.mock("../themeStore", () => ({
  default: {
    getState: () => ({
      setSettings: vi.fn(),
      markThemeSettingsSaved: vi.fn(),
    }),
  },
}));
vi.mock("../projectStore", () => ({
  default: {
    getState: () => ({
      activeProject: { id: "test-project" },
    }),
  },
}));

const { default: useAutoSave } = await import("../saveStore");
const { default: usePageStore } = await import("../pageStore");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStores() {
  useAutoSave.getState().reset();

  usePageStore.setState({
    page: null,
    originalPage: null,
    globalWidgets: { header: null, footer: null },
    themeSettings: null,
    originalThemeSettings: null,
    loading: false,
    error: null,
  });
}

function seedPageStore() {
  const page = {
    id: "page-1",
    title: "Test",
    widgets: { "w-1": { type: "rich-text", settings: { text: "Hi" } } },
    widgetsOrder: ["w-1"],
  };

  usePageStore.setState({
    page: JSON.parse(JSON.stringify(page)),
    originalPage: JSON.parse(JSON.stringify(page)),
    loading: false,
  });

  return page;
}

// ============================================================================
// Tests
// ============================================================================

describe("saveStore (useAutoSave)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStores();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Initial state
  // --------------------------------------------------------------------------

  describe("initial state", () => {
    it("starts with no unsaved changes", () => {
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
    });

    it("starts with empty modifiedWidgets set", () => {
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(0);
    });

    it("starts with structureModified false", () => {
      expect(useAutoSave.getState().structureModified).toBe(false);
    });

    it("starts with themeSettingsModified false", () => {
      expect(useAutoSave.getState().themeSettingsModified).toBe(false);
    });

    it("starts with isSaving false", () => {
      expect(useAutoSave.getState().isSaving).toBe(false);
    });

    it("starts with lastSaved null", () => {
      expect(useAutoSave.getState().lastSaved).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // markWidgetModified / markWidgetUnmodified
  // --------------------------------------------------------------------------

  describe("markWidgetModified", () => {
    it("adds a widget ID to the modified set", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().modifiedWidgets.has("w-1")).toBe(true);
    });

    it("accumulates multiple widget IDs", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().markWidgetModified("w-2");
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(2);
    });

    it("does not duplicate an already-modified widget", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(1);
    });

    it("triggers hasUnsavedChanges to return true", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("resets the auto-save timer", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();
    });
  });

  describe("markWidgetUnmodified", () => {
    it("removes a widget ID from the modified set", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().markWidgetUnmodified("w-1");
      expect(useAutoSave.getState().modifiedWidgets.has("w-1")).toBe(false);
    });

    it("does not affect other modified widgets", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().markWidgetModified("w-2");
      useAutoSave.getState().markWidgetUnmodified("w-1");
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(1);
      expect(useAutoSave.getState().modifiedWidgets.has("w-2")).toBe(true);
    });

    it("is a no-op for unknown widget IDs", () => {
      useAutoSave.getState().markWidgetUnmodified("w-999");
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // setStructureModified
  // --------------------------------------------------------------------------

  describe("setStructureModified", () => {
    it("sets the structureModified flag", () => {
      useAutoSave.getState().setStructureModified(true);
      expect(useAutoSave.getState().structureModified).toBe(true);
    });

    it("triggers hasUnsavedChanges when true", () => {
      useAutoSave.getState().setStructureModified(true);
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("resets the auto-save timer when set to true", () => {
      useAutoSave.getState().setStructureModified(true);
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();
    });

    it("does not reset the auto-save timer when set to false", () => {
      useAutoSave.getState().setStructureModified(false);
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
    });

    it("can be toggled off", () => {
      useAutoSave.getState().setStructureModified(true);
      useAutoSave.getState().setStructureModified(false);
      expect(useAutoSave.getState().structureModified).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // setThemeSettingsModified
  // --------------------------------------------------------------------------

  describe("setThemeSettingsModified", () => {
    it("sets the themeSettingsModified flag", () => {
      useAutoSave.getState().setThemeSettingsModified(true);
      expect(useAutoSave.getState().themeSettingsModified).toBe(true);
    });

    it("triggers hasUnsavedChanges when true", () => {
      useAutoSave.getState().setThemeSettingsModified(true);
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("resets the auto-save timer when set to true", () => {
      useAutoSave.getState().setThemeSettingsModified(true);
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();
    });

    it("does not reset the auto-save timer when set to false", () => {
      useAutoSave.getState().setThemeSettingsModified(false);
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // hasUnsavedChanges — deep equality fallback
  // --------------------------------------------------------------------------

  describe("hasUnsavedChanges — deep equality fallback", () => {
    it("returns false when page equals originalPage and no flags set", () => {
      seedPageStore();
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
    });

    it("detects page drift (undo/redo scenario)", () => {
      seedPageStore();

      // Simulate an undo-style change: modify page but don't flag it
      const page = usePageStore.getState().page;
      const changedPage = { ...page, title: "Changed via undo" };
      usePageStore.setState({ page: changedPage });

      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("detects theme settings drift", () => {
      const settings = {
        settings: { global: { colors: [{ id: "c1", value: "#000" }] } },
      };
      usePageStore.setState({
        themeSettings: JSON.parse(JSON.stringify(settings)),
        originalThemeSettings: JSON.parse(JSON.stringify(settings)),
      });

      // Modify themeSettings without flagging
      const modified = JSON.parse(JSON.stringify(settings));
      modified.settings.global.colors[0].value = "#fff";
      usePageStore.setState({ themeSettings: modified });

      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("returns false when page is null", () => {
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // resetAutoSaveTimer / stopAutoSave
  // --------------------------------------------------------------------------

  describe("resetAutoSaveTimer", () => {
    it("sets an auto-save timer", () => {
      useAutoSave.getState().resetAutoSaveTimer();
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();
    });

    it("clears the previous timer when reset", () => {
      useAutoSave.getState().resetAutoSaveTimer();
      const first = useAutoSave.getState().autoSaveInterval;

      useAutoSave.getState().resetAutoSaveTimer();
      const second = useAutoSave.getState().autoSaveInterval;

      expect(second).not.toBe(first);
    });
  });

  describe("stopAutoSave", () => {
    it("clears the auto-save timer", () => {
      useAutoSave.getState().resetAutoSaveTimer();
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();

      useAutoSave.getState().stopAutoSave();
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
    });

    it("is a no-op when no timer is running", () => {
      expect(() => useAutoSave.getState().stopAutoSave()).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // reset
  // --------------------------------------------------------------------------

  describe("reset", () => {
    it("clears all modification flags", () => {
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().setStructureModified(true);
      useAutoSave.getState().setThemeSettingsModified(true);

      useAutoSave.getState().reset();

      expect(useAutoSave.getState().modifiedWidgets.size).toBe(0);
      expect(useAutoSave.getState().structureModified).toBe(false);
      expect(useAutoSave.getState().themeSettingsModified).toBe(false);
    });

    it("clears saving flags", () => {
      useAutoSave.setState({ isSaving: true, isAutoSaving: true });
      useAutoSave.getState().reset();

      expect(useAutoSave.getState().isSaving).toBe(false);
      expect(useAutoSave.getState().isAutoSaving).toBe(false);
    });

    it("clears lastSaved", () => {
      useAutoSave.setState({ lastSaved: new Date() });
      useAutoSave.getState().reset();
      expect(useAutoSave.getState().lastSaved).toBeNull();
    });

    it("stops the auto-save timer", () => {
      useAutoSave.getState().resetAutoSaveTimer();
      useAutoSave.getState().reset();
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // save
  // --------------------------------------------------------------------------

  describe("save", () => {
    it("sets isSaving during a manual save", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      const promise = useAutoSave.getState().save(false);
      expect(useAutoSave.getState().isSaving).toBe(true);

      await promise;
      expect(useAutoSave.getState().isSaving).toBe(false);
    });

    it("sets isAutoSaving during an auto-save", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      const promise = useAutoSave.getState().save(true);
      expect(useAutoSave.getState().isAutoSaving).toBe(true);

      await promise;
      expect(useAutoSave.getState().isAutoSaving).toBe(false);
    });

    it("clears all modification flags after saving", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().setStructureModified(true);
      useAutoSave.getState().setThemeSettingsModified(true);

      await useAutoSave.getState().save();

      expect(useAutoSave.getState().modifiedWidgets.size).toBe(0);
      expect(useAutoSave.getState().structureModified).toBe(false);
      expect(useAutoSave.getState().themeSettingsModified).toBe(false);
    });

    it("updates lastSaved timestamp", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      await useAutoSave.getState().save();
      expect(useAutoSave.getState().lastSaved).toBeInstanceOf(Date);
    });

    it("is a no-op when there are no unsaved changes", async () => {
      seedPageStore();
      await useAutoSave.getState().save();

      // lastSaved should still be null because nothing was saved
      expect(useAutoSave.getState().lastSaved).toBeNull();
    });

    it("updates originalPage in pageStore after save", async () => {
      seedPageStore();

      // Modify the page directly
      const page = { ...usePageStore.getState().page, title: "Modified" };
      usePageStore.setState({ page });
      useAutoSave.getState().markWidgetModified("w-1");

      await useAutoSave.getState().save();

      expect(usePageStore.getState().originalPage.title).toBe("Modified");
    });
  });
});
