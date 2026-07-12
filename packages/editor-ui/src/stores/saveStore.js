import { create } from "zustand";
import { isEqual } from "lodash";
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

const BASE_AUTOSAVE_DELAY_MS = 60000;
const MAX_AUTOSAVE_DELAY_MS = 600000;

function autosaveDelay(failureCount) {
  return Math.min(BASE_AUTOSAVE_DELAY_MS * 2 ** failureCount, MAX_AUTOSAVE_DELAY_MS);
}

const useAutoSave = create((set, get) => ({
  // State
  isSaving: false,
  isAutoSaving: false,
  lastSaved: null,
  modifiedWidgets: new Set(),
  structureModified: false,
  themeSettingsModified: false,
  autoSaveInterval: null,
  runningSave: null,
  queuedFollowUp: null,
  saveGeneration: 0,
  autoSaveFailureCount: 0,

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

    if (page && originalPage && !isEqual(page, originalPage)) {
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
      !isEqual(globalWidgets.header, originalGlobalWidgets.header)
    ) {
      return true;
    }
    if (
      globalWidgets.footer &&
      originalGlobalWidgets.footer &&
      !isEqual(globalWidgets.footer, originalGlobalWidgets.footer)
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
    set({ modifiedWidgets: newSet, autoSaveFailureCount: 0 });
    resetAutoSaveTimer();
  },

  markWidgetUnmodified: (widgetId) => {
    const { modifiedWidgets } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.delete(widgetId);
    set({ modifiedWidgets: newSet });
  },

  // Diffs the current page/global-widget content against the last-saved
  // baseline and reconciles modifiedWidgets to match — the one place that
  // handles dirtiness NOT introduced through markWidgetModified (undo/redo,
  // called by EditorTopBar's safeUndo/safeRedo after the temporal jump).
  // Unlike markWidgetModified, this can also CLEAR a widget's dirty flag
  // (when undo reverts it back to exactly its saved state).
  reconcileModifiedWidgets: () => {
    const { markWidgetModified, markWidgetUnmodified } = get();
    const { page, originalPage, globalWidgets, originalGlobalWidgets } = usePageStore.getState();

    if (page && originalPage) {
      const ids = new Set([...Object.keys(page.widgets ?? {}), ...Object.keys(originalPage.widgets ?? {})]);
      for (const id of ids) {
        if (!isEqual(page.widgets?.[id], originalPage.widgets?.[id])) {
          markWidgetModified(id);
        } else {
          markWidgetUnmodified(id);
        }
      }
    }

    for (const key of ["header", "footer"]) {
      if (!isEqual(globalWidgets[key], originalGlobalWidgets[key])) {
        markWidgetModified(key);
      } else {
        markWidgetUnmodified(key);
      }
    }
  },

  setStructureModified: (modified) => {
    set({ structureModified: modified });
    if (modified) {
      set({ autoSaveFailureCount: 0 });
      get().resetAutoSaveTimer();
    }
  },

  setThemeSettingsModified: (modified) => {
    set({ themeSettingsModified: modified });
    if (modified) {
      set({ autoSaveFailureCount: 0 });
      get().resetAutoSaveTimer();
    }
  },

  save: async (isAuto = false) => {
    const { runningSave, queuedFollowUp } = get();

    // A save is already executing: coalesce into a single queued follow-up
    // instead of overlapping OR silently no-oping — every caller who arrives
    // during this window awaits the SAME next run and gets its real outcome,
    // rather than a repeated click racing the in-flight request or being
    // dropped on the floor with no signal either way.
    if (runningSave) {
      if (queuedFollowUp) return queuedFollowUp;
      const followUp = runningSave.then(
        () => get().save(isAuto),
        () => get().save(isAuto),
      );
      set({ queuedFollowUp: followUp });
      return followUp;
    }

    if (!get().hasUnsavedChanges()) return { status: "clean" };

    // Captured now so a reset() that fires while this save is in flight can
    // be detected before any write-back below applies — see reset()'s comment.
    const myGeneration = get().saveGeneration;

    if (isAuto) {
      set({ isAutoSaving: true });
    } else {
      set({ isSaving: true });
    }

    const run = (async () => {
      const { modifiedWidgets, structureModified, themeSettingsModified } = get();
      const pageStore = usePageStore.getState();
      const { page, globalWidgets } = pageStore;
      const themeStore = useThemeStore.getState();
      const themeSettings = themeStore.settings;

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
            ? !isEqual(globalWidgets.header, pageStore.originalGlobalWidgets.header)
            : false;
        const hasFooterDiff =
          globalWidgets.footer && pageStore.originalGlobalWidgets.footer
            ? !isEqual(globalWidgets.footer, pageStore.originalGlobalWidgets.footer)
            : false;

        if (globalWidgets.header && (modifiedWidgets.has("header") || hasHeaderDiff)) {
          guardedPromises.push(saveGlobalWidget("header", globalWidgets.header));
        }

        if (globalWidgets.footer && (modifiedWidgets.has("footer") || hasFooterDiff)) {
          guardedPromises.push(saveGlobalWidget("footer", globalWidgets.footer));
        }

        const hasPageWidgetChanges = [...modifiedWidgets].some((id) => id !== "header" && id !== "footer");
        const hasPageDiff = page && pageStore.originalPage ? !isEqual(page, pageStore.originalPage) : false;
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

        // A reset() (discard-and-leave) fired while the above was in flight —
        // the content just sent is exactly what the user chose to discard.
        // Skip every write-back below; nothing here should apply.
        if (get().saveGeneration !== myGeneration) {
          return { status: "abandoned" };
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

        return { status: "success" };
      } catch (err) {
        if (err.code === "PROJECT_MISMATCH") {
          // Another tab took over the singleton active project. Surface the loud
          // stale-project curtain (the OSS shell renders it) and stop hammering the
          // server with doomed auto-saves. The tab recovers on reload, or when the
          // user re-activates this project elsewhere (focus revalidation clears it).
          useStaleProjectStore.getState().markStale();
          get().stopAutoSave();
          return { status: "mismatch" };
        }
        // Manual saves rethrow so the caller (the toolbar's dispatch) can
        // show its existing error toast; autosave failures stay silent —
        // interrupting the user mid-edit for a background retry would be
        // worse than the failure itself — and are retried with backoff by
        // resetAutoSaveTimer's tick instead.
        if (!isAuto) throw err;
        console.warn("[autosave] save failed, will retry:", err);
        return { status: "failed", error: err };
      } finally {
        if (isAuto) {
          set({ isAutoSaving: false });
        } else {
          set({ isSaving: false });
        }
        // Unconditional, not identity-checked against `run`: nothing else
        // can ever install a competing value here while this run is active —
        // any other save() call during this window hits the coalescing
        // branch above instead of creating an independent run — so
        // `runningSave` can only ever be referring to this run by the time
        // its own finally executes.
        set({ runningSave: null, queuedFollowUp: null });
      }
    })();

    set({ runningSave: run });
    return run;
  },

  resetAutoSaveTimer: () => {
    const { autoSaveInterval, autoSaveFailureCount } = get();

    if (autoSaveInterval) {
      clearTimeout(autoSaveInterval);
    }

    const timeout = setTimeout(async () => {
      // This timer already fired — nothing left to cancel for it
      // specifically. Clear the tracked id immediately so a fresh edit's own
      // resetAutoSaveTimer() call (which may run synchronously, or during
      // the save() await below) can freely arm its own timer without any
      // risk of this tick clobbering it afterward.
      set({ autoSaveInterval: null });

      if (get().hasUnsavedChanges()) {
        const result = await get().save(true);
        if (result.status === "failed") {
          set((s) => ({ autoSaveFailureCount: s.autoSaveFailureCount + 1 }));
        } else if (result.status === "success") {
          set({ autoSaveFailureCount: 0 });
        } else if (result.status === "mismatch" || result.status === "abandoned") {
          // An intentional stop happened during this attempt (PROJECT_MISMATCH's
          // own stopAutoSave(), or a reset() from discard-and-leave) — do not
          // reschedule, that would defeat it.
          return;
        }
      }

      // Reschedule only if nothing else already armed a timer while the
      // above was in flight (a fresh edit's own resetAutoSaveTimer() call).
      if (get().autoSaveInterval == null && get().hasUnsavedChanges()) {
        get().resetAutoSaveTimer();
      }
    }, autosaveDelay(autoSaveFailureCount));

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
    const { stopAutoSave, saveGeneration } = get();
    stopAutoSave();
    // isSaving/isAutoSaving/runningSave/queuedFollowUp are deliberately NOT
    // force-cleared here. An in-flight save (if any) owns its own bookkeeping
    // cleanup in its finally block regardless of generation — forcing them
    // false while the real network request is still pending is what let a
    // stale save race a fresh one. Bumping saveGeneration is what makes that
    // in-flight save's eventual write-back a no-op; its own execution still
    // runs to completion.
    set({
      saveGeneration: saveGeneration + 1,
      lastSaved: null,
      modifiedWidgets: new Set(),
      structureModified: false,
      themeSettingsModified: false,
      autoSaveFailureCount: 0,
    });
  },
}));

export default useAutoSave;
