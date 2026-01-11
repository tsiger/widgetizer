import { create } from "zustand";
import { savePageContent } from "../queries/pageManager";
import { saveGlobalWidget } from "../queries/previewManager";
import { saveThemeSettings } from "../queries/themeManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import usePageStore from "./pageStore";
import useThemeStore from "./themeStore";
import useProjectStore from "./projectStore";

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
    const { page, originalPage, themeSettings, originalThemeSettings } = pageStore;

    if (page && originalPage && JSON.stringify(page) !== JSON.stringify(originalPage)) {
      return true;
    }

    if (themeSettings && originalThemeSettings &&
        JSON.stringify(themeSettings) !== JSON.stringify(originalThemeSettings)) {
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
    const { page, globalWidgets, themeSettings } = pageStore;
    const themeStore = useThemeStore.getState();

    if (!hasUnsavedChanges()) return;

    if (isAuto) {
      set({ isAutoSaving: true });
    } else {
      set({ isSaving: true });
    }

    try {
      const savePromises = [];

      // Save global widgets
      if (globalWidgets.header && modifiedWidgets.has("header")) {
        savePromises.push(saveGlobalWidget("header", globalWidgets.header));
      }

      if (globalWidgets.footer && modifiedWidgets.has("footer")) {
        savePromises.push(saveGlobalWidget("footer", globalWidgets.footer));
      }

      // Save page content if there are page changes
      if (page && (modifiedWidgets.size > 0 || structureModified)) {
        savePromises.push(savePageContent(page.id, page));
      }

      // Save theme settings if modified (use pageStore's copy for unified undo)
      if (themeSettingsModified && themeSettings) {
        savePromises.push(saveThemeSettings(themeSettings));
      }

      await Promise.all(savePromises);

      // Invalidate media cache since page saves update media usage tracking
      const activeProject = useProjectStore.getState().activeProject;
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

      // Mark theme settings as saved in pageStore and sync to themeStore
      if (themeSettingsModified && themeSettings) {
        pageStore.markThemeSettingsSaved();
        // Sync to themeStore so Settings page sees the changes
        themeStore.setSettings(themeSettings);
        themeStore.markThemeSettingsSaved();
      }
    } catch (err) {
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
