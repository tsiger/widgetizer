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

const mockThemeStoreState = {
  settings: null,
  originalSettings: null,
  loadedProjectId: null,
  setSettings: vi.fn(),
  markThemeSettingsSaved: vi.fn(),
  hasUnsavedThemeChanges: vi.fn(() => false),
  loadSettings: vi.fn().mockResolvedValue(undefined),
  saveSettings: vi.fn().mockResolvedValue({}),
  updateThemeSetting: vi.fn(),
  resetForProjectChange: vi.fn(),
};

vi.mock("../themeStore", () => ({
  default: {
    getState: () => mockThemeStoreState,
  },
}));
vi.mock("../projectStore", () => ({
  default: {
    getState: () => ({
      activeProject: { id: "test-project" },
    }),
  },
}));
vi.mock("../../lib/activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "test-project"),
}));

const { default: useAutoSave } = await import("../saveStore");
const { default: usePageStore } = await import("../pageStore");
const { default: useStaleProjectStore } = await import("../staleProjectStore.js");
const { savePageContent } = await import("../../queries/pageManager");
const { saveGlobalWidget } = await import("../../queries/previewManager");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStores() {
  useAutoSave.getState().reset();

  usePageStore.setState({
    page: null,
    originalPage: null,
    globalWidgets: { header: null, footer: null },
    originalGlobalWidgets: { header: null, footer: null },
    themeSettingsSnapshot: null,
    loadedProjectId: null,
    activeLoadId: 0,
    loading: false,
    error: null,
  });

  // Reset themeStore mock
  mockThemeStoreState.settings = null;
  mockThemeStoreState.originalSettings = null;
  mockThemeStoreState.loadedProjectId = null;
  mockThemeStoreState.setSettings.mockReset();
  mockThemeStoreState.markThemeSettingsSaved.mockReset();
  mockThemeStoreState.hasUnsavedThemeChanges.mockReset().mockReturnValue(false);
  mockThemeStoreState.saveSettings.mockReset().mockResolvedValue({});
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
    loadedProjectId: "test-project",
    loading: false,
  });

  return page;
}

// ============================================================================
// Tests
// ============================================================================

describe("saveStore (useAutoSave)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetStores();
    useStaleProjectStore.getState().clearStale();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Project mismatch (stale active project)
  // --------------------------------------------------------------------------

  describe("project mismatch (PROJECT_MISMATCH)", () => {
    it("marks the project stale and stops auto-save, without throwing", async () => {
      // The loaded page belongs to a different project than the (mocked) active
      // project "test-project" — the client-side pre-check throws PROJECT_MISMATCH.
      usePageStore.setState({ loadedProjectId: "other-project" });
      useAutoSave.getState().markWidgetModified("w-1"); // unsaved change + arms the auto-save timer
      expect(useAutoSave.getState().autoSaveInterval).not.toBe(null);

      await expect(useAutoSave.getState().save(false)).resolves.toBeUndefined();

      expect(useStaleProjectStore.getState().isStale).toBe(true);
      expect(useAutoSave.getState().autoSaveInterval).toBe(null);
    });
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

    it("detects theme settings drift via themeStore", () => {
      seedPageStore();

      // Simulate themeStore reporting unsaved changes
      mockThemeStoreState.hasUnsavedThemeChanges.mockReturnValue(true);

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

    it("does not start a second save while a manual save is already in flight", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveSave;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
      const firstSave = useAutoSave.getState().save(false);

      await useAutoSave.getState().save(false); // a repeated trigger (held Ctrl+S) while isSaving is already true
      expect(savePageContent).toHaveBeenCalledTimes(1);

      resolveSave({});
      await firstSave;
    });

    it("does not let the 60s autosave timer's own save(true) call start while a manual save is in flight (the timer bypasses the `save` command entirely, so the guard must live here, not just at the command layer)", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveSave;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
      const manualSave = useAutoSave.getState().save(false);
      expect(useAutoSave.getState().isSaving).toBe(true);

      // Simulates resetAutoSaveTimer's setTimeout callback calling
      // get().save(true) directly — no command wrapper involved.
      await useAutoSave.getState().save(true);
      expect(useAutoSave.getState().isAutoSaving).toBe(false); // never started
      expect(savePageContent).toHaveBeenCalledTimes(1); // only the manual save's own request

      resolveSave({});
      await manualSave;
      // Undo history clears exactly once (from the manual save), not twice.
      expect(usePageStore.temporal.getState().pastStates).toHaveLength(0);
    });

    it("does not start an autosave while one is already in flight", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveSave;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
      const firstSave = useAutoSave.getState().save(true);

      await useAutoSave.getState().save(true);
      expect(savePageContent).toHaveBeenCalledTimes(1);

      resolveSave({});
      await firstSave;
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

    it("preserves a widget modified while this save's requests are still in flight (a concurrent edit must not be silently dropped from dirty-tracking)", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveSave;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));

      const savePromise = useAutoSave.getState().save();

      // A concurrent edit lands while this save's page-content request is
      // still pending — it was never part of the snapshot this save decided
      // to send, so it must survive the post-save clear.
      useAutoSave.getState().markWidgetModified("header");

      resolveSave({});
      await savePromise;

      expect(useAutoSave.getState().modifiedWidgets.has("w-1")).toBe(false); // this save's own widget: cleared
      expect(useAutoSave.getState().modifiedWidgets.has("header")).toBe(true); // concurrent edit: preserved
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("detects a re-edit of the SAME widget made while its own save request is still in flight (Set membership alone can't tell this apart from 'still dirty from before')", async () => {
      seedPageStore();
      const originalHeader = { type: "header", settings: { text: "v1" }, blocks: {}, blocksOrder: [] };
      usePageStore.setState({
        globalWidgets: { header: originalHeader, footer: null },
        originalGlobalWidgets: { header: JSON.parse(JSON.stringify(originalHeader)), footer: null },
      });
      useAutoSave.getState().markWidgetModified("header");

      let resolveSave;
      saveGlobalWidget.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));

      const savePromise = useAutoSave.getState().save();

      // A fresh edit to the SAME widget lands while this save's own request
      // for it is still pending. markWidgetModified("header") is a no-op
      // (already in the Set), so only a value-based diff against the
      // entry-time snapshot can catch this.
      const reEditedHeader = { ...originalHeader, settings: { text: "v2" } };
      usePageStore.setState((state) => ({
        globalWidgets: { ...state.globalWidgets, header: reEditedHeader },
      }));
      useAutoSave.getState().markWidgetModified("header");

      resolveSave({});
      await savePromise;

      expect(usePageStore.getState().originalGlobalWidgets.header).toEqual(originalHeader); // rebaselined to what was actually sent, not the live re-edit
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("actually resends a same-widget re-edit on the NEXT save, not just flags it dirty (the re-edit's own modifiedWidgets entry was consumed by the first save's clear)", async () => {
      seedPageStore();
      const originalHeader = { type: "header", settings: { text: "v1" }, blocks: {}, blocksOrder: [] };
      usePageStore.setState({
        globalWidgets: { header: originalHeader, footer: null },
        originalGlobalWidgets: { header: JSON.parse(JSON.stringify(originalHeader)), footer: null },
      });
      useAutoSave.getState().markWidgetModified("header");

      let resolveSave;
      saveGlobalWidget.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
      const savePromise = useAutoSave.getState().save();

      const reEditedHeader = { ...originalHeader, settings: { text: "v2" } };
      usePageStore.setState((state) => ({
        globalWidgets: { ...state.globalWidgets, header: reEditedHeader },
      }));
      useAutoSave.getState().markWidgetModified("header"); // no-op on the Set — "header" was already in it

      resolveSave({});
      await savePromise;

      // At this point modifiedWidgets no longer contains "header" (the first
      // save's clear removed it) — only the value-diff against
      // originalGlobalWidgets still flags the re-edit as dirty. A second save
      // (e.g. the next autosave tick) must still resend it.
      saveGlobalWidget.mockClear();
      await useAutoSave.getState().save();

      expect(saveGlobalWidget).toHaveBeenCalledWith("header", reEditedHeader);
      expect(usePageStore.getState().originalGlobalWidgets.header).toEqual(reEditedHeader);
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
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

    it("delegates theme save to themeStore.saveSettings", async () => {
      seedPageStore();
      const themeSettings = {
        settings: { global: { colors: [{ id: "c1", value: "#000" }] } },
      };
      mockThemeStoreState.settings = themeSettings;
      useAutoSave.getState().setThemeSettingsModified(true);

      await useAutoSave.getState().save();

      // Should call the canonical save path, not the raw API function
      expect(mockThemeStoreState.saveSettings).toHaveBeenCalledWith("test-project");
    });

    it("saves theme settings when themeStore reports drift even without explicit flag", async () => {
      seedPageStore();
      mockThemeStoreState.settings = {
        settings: { global: { colors: [{ id: "c1", value: "#drifted" }] } },
      };
      // themeSettingsModified is false, but themeStore has drift (e.g. from undo)
      mockThemeStoreState.hasUnsavedThemeChanges.mockReturnValue(true);

      await useAutoSave.getState().save();

      expect(mockThemeStoreState.saveSettings).toHaveBeenCalledWith("test-project");
    });

    it("clears undo history after a successful save (EDIT-045)", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      // Simulate accumulated undo/redo history before the save.
      usePageStore.temporal.setState({ pastStates: [{}, {}], futureStates: [{}] });
      expect(usePageStore.temporal.getState().pastStates.length).toBeGreaterThan(0);

      await useAutoSave.getState().save();

      // Save rebaselines history so Undo can't step past the saved state.
      expect(usePageStore.temporal.getState().pastStates).toHaveLength(0);
      expect(usePageStore.temporal.getState().futureStates).toHaveLength(0);
    });

    it("aborts before saving when the loaded page belongs to another project", async () => {
      seedPageStore();
      usePageStore.setState({ loadedProjectId: "other-project" });
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().setThemeSettingsModified(true);

      await useAutoSave.getState().save();

      expect(savePageContent).not.toHaveBeenCalled();
      expect(mockThemeStoreState.saveSettings).not.toHaveBeenCalled();
      expect(useAutoSave.getState().isSaving).toBe(false);
    });

    it("preserves modification flags when save is aborted by project mismatch", async () => {
      seedPageStore();
      usePageStore.setState({ loadedProjectId: "other-project" });
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().setThemeSettingsModified(true);
      useAutoSave.getState().setStructureModified(true);

      await useAutoSave.getState().save();

      // Flags should NOT be cleared — the save was aborted, edits are preserved
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(1);
      expect(useAutoSave.getState().themeSettingsModified).toBe(true);
      expect(useAutoSave.getState().structureModified).toBe(true);
    });

    it("stops auto-save timer when project mismatch is detected", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().resetAutoSaveTimer();
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();

      usePageStore.setState({ loadedProjectId: "other-project" });
      await useAutoSave.getState().save();

      // Auto-save should be stopped to prevent repeated failed save attempts
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
    });
  });
});
