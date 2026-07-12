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
    const { isSaving, isAutoSaving, modifiedWidgets, structureModified, themeSettingsModified, hasUnsavedChanges } =
      get();

    // A save — manual OR auto — is already in flight: skip. This is the
    // single guard every caller relies on (the `save` toolbar command, and
    // the 60s autosave timer's own direct get().save(true) call below in
    // resetAutoSaveTimer) — putting it only in the command wrapper misses the
    // timer's direct call entirely, letting a manual save and an autosave
    // tick run concurrently regardless of which started first. Both would
    // resolve and each calls usePageStore.temporal.getState().clear(),
    // wiping the undo/redo stack mid-edit.
    if (isSaving || isAutoSaving) return;

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

      // Set membership alone can miss a widget re-edited (to the SAME id)
      // while its own prior save was still in flight — re-adding an id
      // already present is a no-op, so the Set never reflects that a fresh
      // edit landed. Gate on a value-diff too (mirroring hasPageDiff below),
      // or that re-edit would silently never get sent.
      const hasHeaderDiff =
        globalWidgets.header && pageStore.originalGlobalWidgets.header
          ? JSON.stringify(globalWidgets.header) !== JSON.stringify(pageStore.originalGlobalWidgets.header)
          : false;
      const hasFooterDiff =
        globalWidgets.footer && pageStore.originalGlobalWidgets.footer
          ? JSON.stringify(globalWidgets.footer) !== JSON.stringify(pageStore.originalGlobalWidgets.footer)
          : false;

      if (globalWidgets.header && (modifiedWidgets.has("header") || hasHeaderDiff)) {
        guardedPromises.push(saveGlobalWidget("header", globalWidgets.header));
      }

      if (globalWidgets.footer && (modifiedWidgets.has("footer") || hasFooterDiff)) {
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

    const timeout = setTimeout(async () => {
      const { hasUnsavedChanges } = get();
      if (hasUnsavedChanges()) {
        await get().save(true); // may no-op if another save is already in flight — see save()'s own guard
      }

      // While the above was in flight, something else may have already
      // touched autoSaveInterval: a fresh edit's own resetAutoSaveTimer()
      // call (armed a newer live timer), or an explicit stop — save()'s own
      // PROJECT_MISMATCH handling calls stopAutoSave() specifically to halt
      // retries, and so can an external stopAutoSave()/reset() (e.g. the user
      // discarding changes via the navigation guard). Only proceed if THIS
      // tick's own timer id is still the one tracked; otherwise a newer timer
      // is already handling it, or a stop was intentional — either way,
      // touching state here would either orphan that newer timer (untracked,
      // uncancellable) or defeat the stop by silently re-arming autosave.
      if (get().autoSaveInterval !== timeout) return;

      set({ autoSaveInterval: null });
      // Content can still be dirty here for two reasons: save() above no-op'd
      // (another save was in flight when this tick fired) or it ran but a
      // fresh edit landed mid-flight. Either way, reschedule instead of
      // leaving no active timer — otherwise a dirty edit sits unsaved
      // indefinitely until the user happens to make another edit (the only
      // other thing that calls resetAutoSaveTimer) or clicks Save manually.
      if (get().hasUnsavedChanges()) {
        get().resetAutoSaveTimer();
      }
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
