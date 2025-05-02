import { create } from "zustand";
import { savePageContent } from "../utils/pageManager";
import { saveGlobalWidget } from "../utils/previewManager";
import usePageStore from "./pageStore";

const useAutoSave = create((set, get) => ({
  // State
  isSaving: false,
  isAutoSaving: false,
  lastSaved: null,
  modifiedWidgets: new Set(),
  structureModified: false,
  autoSaveInterval: null,

  // Computed
  hasUnsavedChanges: () => {
    const { modifiedWidgets, structureModified } = get();
    return modifiedWidgets.size > 0 || structureModified;
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

  save: async (isAuto = false) => {
    const { modifiedWidgets, structureModified, hasUnsavedChanges } = get();
    const pageStore = usePageStore.getState();
    const { page } = pageStore;

    if (!page || !hasUnsavedChanges()) return;

    if (isAuto) {
      set({ isAutoSaving: true });
    } else {
      set({ isSaving: true });
    }

    try {
      const pageToSave = JSON.parse(JSON.stringify(page));

      // Handle global widgets
      const globalWidgetPromises = [];

      if (pageToSave.widgets["header_widget"] && modifiedWidgets.has("header_widget")) {
        globalWidgetPromises.push(saveGlobalWidget("header", pageToSave.widgets["header_widget"]));
      }
      delete pageToSave.widgets["header_widget"];

      if (pageToSave.widgets["footer_widget"] && modifiedWidgets.has("footer_widget")) {
        globalWidgetPromises.push(saveGlobalWidget("footer", pageToSave.widgets["footer_widget"]));
      }
      delete pageToSave.widgets["footer_widget"];

      await Promise.all(globalWidgetPromises);

      await savePageContent(page.id, pageToSave);

      set({
        modifiedWidgets: new Set(),
        structureModified: false,
        lastSaved: new Date(),
      });

      // Update the original page in pageStore
      pageStore.setOriginalPage(page);
    } catch (err) {
      console.error("Failed to save page content:", err);
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
    });
  },
}));

export default useAutoSave;
