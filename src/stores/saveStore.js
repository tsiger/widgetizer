import { create } from "zustand";
import { savePageContent } from "../queries/pageManager";
import { saveGlobalWidget } from "../queries/previewManager";
import { saveThemeSettings } from "../queries/themeManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import usePageStore from "./pageStore";
import useThemeStore from "./themeStore";
import useProjectStore from "./projectStore";

/**
 * Zustand store for managing auto-save functionality in the page editor.
 * Tracks modified widgets, structure changes, and theme settings modifications.
 * Provides both manual and automatic (60-second debounced) saving capabilities.
 *
 * @typedef {Object} AutoSaveStore
 * @property {boolean} isSaving - Whether a manual save is in progress
 * @property {boolean} isAutoSaving - Whether an auto-save is in progress
 * @property {Date|null} lastSaved - Timestamp of the last successful save
 * @property {Set<string>} modifiedWidgets - Set of widget IDs that have been modified
 * @property {boolean} structureModified - Whether page structure (widget order) has changed
 * @property {boolean} themeSettingsModified - Whether theme settings have changed
 * @property {number|null} autoSaveInterval - Timer ID for the auto-save debounce
 * @property {Function} hasUnsavedChanges - Check if there are any unsaved changes
 * @property {Function} markWidgetModified - Mark a widget as having unsaved changes
 * @property {Function} markWidgetUnmodified - Remove a widget from the modified set
 * @property {Function} setStructureModified - Set whether structure has changed
 * @property {Function} setThemeSettingsModified - Set whether theme settings have changed
 * @property {Function} save - Save all pending changes (manual or auto)
 * @property {Function} resetAutoSaveTimer - Reset the 60-second auto-save timer
 * @property {Function} stopAutoSave - Cancel any pending auto-save
 * @property {Function} reset - Clear all save state and stop auto-save
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

      // Save page content if there are page changes (including undo/redo)
      // Filter out global widget IDs - they are saved separately via saveGlobalWidget
      const hasPageWidgetChanges = [...modifiedWidgets].some(id => id !== "header" && id !== "footer");
      const hasPageDiff = page && pageStore.originalPage
        ? JSON.stringify(page) !== JSON.stringify(pageStore.originalPage)
        : false;
      if (page && (hasPageWidgetChanges || structureModified || hasPageDiff)) {
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
