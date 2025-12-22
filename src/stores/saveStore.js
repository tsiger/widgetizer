import { create } from "zustand";
import { savePageContent } from "../queries/pageManager";
import { saveGlobalWidget } from "../queries/previewManager";
import { saveThemeSettings } from "../queries/themeManager";
import usePageStore from "./pageStore";
import useThemeStore from "./themeStore";

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
    return modifiedWidgets.size > 0 || structureModified || themeSettingsModified;
  },

  // Actions
  markWidgetModified: (widgetId) => {
    const { modifiedWidgets } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.add(widgetId);
    set({ modifiedWidgets: newSet });
  },

  markWidgetUnmodified: (widgetId) => {
    const { modifiedWidgets } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.delete(widgetId);
    set({ modifiedWidgets: newSet });
  },

  setStructureModified: (modified) => {
    set({ structureModified: modified });
  },

  setThemeSettingsModified: (modified) => {
    set({ themeSettingsModified: modified });
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

  startAutoSave: () => {
    const { autoSaveInterval } = get();
    if (autoSaveInterval) return;

    const interval = setInterval(() => {
      const { hasUnsavedChanges } = get();
      if (hasUnsavedChanges()) {
        get().save(true);
      }
    }, 60000); // 1 minute

    set({ autoSaveInterval: interval });
  },

  stopAutoSave: () => {
    const { autoSaveInterval } = get();
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
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
