import { create } from "zustand";
import { savePageContent } from "../queries/pageManager";
import { saveGlobalWidget } from "../queries/previewManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import usePageStore from "./pageStore";
import useThemeStore from "./themeStore";
import useProjectStore from "./projectStore";
import useToastStore from "./toastStore";

/**
 * Zustand store for managing auto-save functionality in the page editor.
 * Tracks modified widgets, structure changes, and theme settings modifications.
 * Provides both manual and automatic (60-second debounced) saving capabilities.
 */

const useAutoSave = create((set, get) => ({
  // State
  isSaving: false,
  isAutoSaving: false,
  lastSaved: null,
  modifiedWidgets: new Set(),
  structureModified: false,
  themeSettingsModified: false,
  autoSaveInterval: null,

  // Computed
  hasUnsavedChanges: () => {
    const { modifiedWidgets, structureModified, themeSettingsModified } = get();

    // Check explicit modification flags first (fast path)
    if (modifiedWidgets.size > 0 || structureModified || themeSettingsModified) {
      return true;
    }

    // Check if page state differs from saved state (catches undo/redo changes)
    const pageStore = usePageStore.getState();
    const { page, originalPage } = pageStore;

    if (page && originalPage && JSON.stringify(page) !== JSON.stringify(originalPage)) {
      return true;
    }

    // Check theme settings via themeStore (canonical owner)
    if (useThemeStore.getState().hasUnsavedThemeChanges()) {
      return true;
    }

    return false;
  },

  // Actions
  markWidgetModified: (widgetId) => {
    const { modifiedWidgets, resetAutoSaveTimer } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.add(widgetId);
    set({ modifiedWidgets: newSet });
    resetAutoSaveTimer();
  },

  markWidgetUnmodified: (widgetId) => {
    const { modifiedWidgets } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.delete(widgetId);
    set({ modifiedWidgets: newSet });
  },

  setStructureModified: (modified) => {
    set({ structureModified: modified });
    if (modified) {
      get().resetAutoSaveTimer();
    }
  },

  setThemeSettingsModified: (modified) => {
    set({ themeSettingsModified: modified });
    if (modified) {
      get().resetAutoSaveTimer();
    }
  },

  save: async (isAuto = false) => {
    const { modifiedWidgets, structureModified, themeSettingsModified, hasUnsavedChanges } = get();
    const pageStore = usePageStore.getState();
    const { page, globalWidgets } = pageStore;
    const themeStore = useThemeStore.getState();
    const themeSettings = themeStore.settings;

    if (!hasUnsavedChanges()) return;

    if (isAuto) {
      set({ isAutoSaving: true });
    } else {
      set({ isSaving: true });
    }

    try {
      const activeProject = useProjectStore.getState().activeProject;
      const loadedProjectId = pageStore.loadedProjectId;

      if (activeProject && loadedProjectId && activeProject.id !== loadedProjectId) {
        const mismatchError = new Error("Project mismatch");
        mismatchError.code = "PROJECT_MISMATCH";
        throw mismatchError;
      }

      // Phase 1: mismatch-guarded writes (page content + global widgets)
      const guardedPromises = [];

      if (globalWidgets.header && modifiedWidgets.has("header")) {
        guardedPromises.push(saveGlobalWidget("header", globalWidgets.header));
      }

      if (globalWidgets.footer && modifiedWidgets.has("footer")) {
        guardedPromises.push(saveGlobalWidget("footer", globalWidgets.footer));
      }

      const hasPageWidgetChanges = [...modifiedWidgets].some((id) => id !== "header" && id !== "footer");
      const hasPageDiff =
        page && pageStore.originalPage ? JSON.stringify(page) !== JSON.stringify(pageStore.originalPage) : false;
      if (page && (hasPageWidgetChanges || structureModified || hasPageDiff)) {
        guardedPromises.push(savePageContent(page.id, page));
      }

      await Promise.all(guardedPromises);

      // Phase 2: theme settings via themeStore's canonical save path.
      // This handles warning/correction reloads from the server automatically.
      const hasThemeDrift = themeStore.hasUnsavedThemeChanges();
      if ((themeSettingsModified || hasThemeDrift) && themeSettings && activeProject) {
        await useThemeStore.getState().saveSettings(activeProject.id);
      }

      // Invalidate media cache since page saves update media usage tracking
      if (activeProject) {
        invalidateMediaCache(activeProject.id);
      }

      set({
        modifiedWidgets: new Set(),
        structureModified: false,
        themeSettingsModified: false,
        lastSaved: new Date(),
      });

      if (page) {
        pageStore.setOriginalPage(page);
      }
    } catch (err) {
      if (err.code === "PROJECT_MISMATCH") {
        const { showToast } = useToastStore.getState();
        showToast(
          "The active project has changed. Your unsaved edits are preserved — reload to continue editing.",
          "error",
          { duration: 0 },
        );
        get().stopAutoSave();
        return;
      }
      console.error("Failed to save:", err);
    } finally {
      if (isAuto) {
        set({ isAutoSaving: false });
      } else {
        set({ isSaving: false });
      }
    }
  },

  resetAutoSaveTimer: () => {
    const { autoSaveInterval } = get();

    if (autoSaveInterval) {
      clearTimeout(autoSaveInterval);
    }

    const timeout = setTimeout(() => {
      const { hasUnsavedChanges } = get();
      if (hasUnsavedChanges()) {
        get().save(true);
      }
      set({ autoSaveInterval: null });
    }, 60000);

    set({ autoSaveInterval: timeout });
  },

  stopAutoSave: () => {
    const { autoSaveInterval } = get();
    if (autoSaveInterval) {
      clearTimeout(autoSaveInterval);
      set({ autoSaveInterval: null });
    }
  },

  reset: () => {
    const { stopAutoSave } = get();
    stopAutoSave();
    set({
      isSaving: false,
      isAutoSaving: false,
      lastSaved: null,
      modifiedWidgets: new Set(),
      structureModified: false,
      themeSettingsModified: false,
    });
  },
}));

export default useAutoSave;
