import { create } from "zustand";
import { savePageContent } from "../queries/pageManager";
import { saveGlobalWidget } from "../queries/previewManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import usePageStore from "./pageStore";
import useThemeStore from "./themeStore";
import useProjectStore from "./projectStore";
import useStaleProjectStore from "./staleProjectStore";

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
    const { page, originalPage, globalWidgets, originalGlobalWidgets } = pageStore;

    if (page && originalPage && JSON.stringify(page) !== JSON.stringify(originalPage)) {
      return true;
    }

    // Same idea for header/footer — modifiedWidgets Set membership alone
    // can't tell "still dirty from before a save" apart from "re-dirtied by a
    // fresh edit while that save's request was still in flight" (re-adding an
    // id already present is a no-op), so this value-based diff is the only
    // reliable signal for that race.
    if (
      globalWidgets.header &&
      originalGlobalWidgets.header &&
      JSON.stringify(globalWidgets.header) !== JSON.stringify(originalGlobalWidgets.header)
    ) {
      return true;
    }
    if (
      globalWidgets.footer &&
      originalGlobalWidgets.footer &&
      JSON.stringify(globalWidgets.footer) !== JSON.stringify(originalGlobalWidgets.footer)
    ) {
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

      // Clear only the widget ids this save actually attempted (the
      // `modifiedWidgets` snapshot captured at entry), not whatever the live
      // set holds now — an edit landing on a widget while the awaits above
      // were still in flight isn't included in what was just saved, and must
      // stay flagged dirty so hasUnsavedChanges() doesn't wrongly read clean
      // (a caller gating on it — e.g. hosted's Save & Publish — would
      // otherwise publish without that edit).
      set((state) => {
        const remaining = new Set(state.modifiedWidgets);
        for (const id of modifiedWidgets) remaining.delete(id);
        return {
          modifiedWidgets: remaining,
          structureModified: false,
          themeSettingsModified: false,
          lastSaved: new Date(),
        };
      });

      if (page) {
        pageStore.setOriginalPage(page);
      }
      // Rebaseline against the ENTRY-time globalWidgets snapshot (what this
      // save actually sent), not the live pageStore state — if header/footer
      // was edited again while the awaits above were in flight, the live
      // state has already moved past this snapshot, so the next
      // hasUnsavedChanges() check correctly sees a fresh diff instead of
      // wrongly reading clean.
      pageStore.setOriginalGlobalWidgets(globalWidgets);

      // Rebaseline undo history to the just-saved state (like page load does), so
      // Undo can't step past the save into stale pre-save values and re-dirty the UI.
      usePageStore.temporal.getState().clear();
    } catch (err) {
      if (err.code === "PROJECT_MISMATCH") {
        // Another tab took over the singleton active project. Surface the loud
        // stale-project curtain (the OSS shell renders it) and stop hammering the
        // server with doomed auto-saves. The tab recovers on reload, or when the
        // user re-activates this project elsewhere (focus revalidation clears it).
        useStaleProjectStore.getState().markStale();
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
