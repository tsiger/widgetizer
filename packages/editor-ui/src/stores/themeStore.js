import { create } from "zustand";
import { applyThemeSettingChanges, diffThemeSettings } from "@widgetizer/core/themeSettingChanges";
import { getThemeSettings, saveThemeSettingChanges } from "../queries/themeManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import { getActiveProjectId } from "../lib/activeProjectId";

/**
 * Canonical owner of per-project theme settings across the app.
 * Both the Settings page and the page editor read/write through this store.
 * The editor's pageStore keeps a thin proxy layer for undo/redo only.
 *
 * Saves send only the settings that changed, each with the value it started
 * from, and the server answers with the file as saved — so a screen holding an
 * older copy (loaded before a theme update, or before another screen saved)
 * can never put back what it did not change. One save runs at a time: a save
 * requested meanwhile waits and then sends whatever is still unsaved, so
 * responses can never land out of order.
 */

const clone = (value) => JSON.parse(JSON.stringify(value));
const CONFLICT_CODES = new Set(["THEME_SETTINGS_CHANGED", "THEME_VERSION_CHANGED"]);

// The save queue: the run in flight, and at most one follow-up waiting for it.
let inFlight = null;
let followUp = null;
let queueEpoch = 0;
// A save in flight when the store is reset belongs to the state just dropped:
// its generation moved, so it writes nothing back, and a new save need not wait.
const dropSaveQueue = () => {
  inFlight = null;
  followUp = null;
  queueEpoch += 1;
};
// pageStore registers here to keep the editor's undo history in step whenever
// the store takes the server's copy (see onServerThemeAdopted below).
let adoptedListener = null;

const useThemeStore = create((set, get) => {
  const moved = (projectId, generation) => get().generation !== generation || get().loadedProjectId !== projectId;

  /**
   * Take the server's copy: it becomes the baseline, and the draft becomes the
   * server's copy with `onTop` (the user's still-unsaved changes) applied over
   * it. `expected` is what the client believed the server would hold — the
   * listener uses it to tell the server's corrections from the user's own edits.
   */
  const adoptServerTheme = (serverTheme, onTop, expected) => {
    const baseline = clone(serverTheme);
    const { theme: draft, skipped } =
      onTop.length > 0 ? applyThemeSettingChanges(serverTheme, onTop) : { theme: clone(serverTheme), skipped: [] };
    set({ originalSettings: baseline, settings: draft, conflict: null });
    if (adoptedListener) {
      try {
        adoptedListener(expected, baseline, draft);
      } catch (err) {
        // The save itself succeeded; a failed history rewrite must not undo that.
        console.error("Failed to rebase editor history on the saved theme:", err);
      }
    }
    // An edit kept on top for a setting the server's copy no longer has is
    // dropped; say so rather than claim every edit was kept.
    return skipped;
  };

  const isDraftDiscarded = () => {
    const { discardedRevision, draftRevision } = get();
    return discardedRevision !== null && discardedRevision === draftRevision;
  };

  // Settings changed elsewhere since this screen loaded them. Nothing was written,
  // so all the user's edits go back on top of the server's copy and stay unsaved.
  const resolveConflict = async (projectId, generation, error) => {
    const fresh = await getThemeSettings(projectId);
    if (moved(projectId, generation)) return { warnings: [], stale: true };
    const { originalSettings, settings } = get();
    const dropped = adoptServerTheme(fresh, diffThemeSettings(originalSettings, settings), originalSettings);
    set({ conflict: { at: Date.now(), ids: error?.data?.conflicts ?? [] } });
    return { warnings: dropped, conflict: true, adopted: true };
  };

  const runSave = async (projectId) => {
    const state = get();
    if (state.loadedProjectId !== projectId || !state.settings || !state.originalSettings) {
      return { warnings: [], stale: true };
    }
    const { generation } = state;
    const sent = state.settings;
    const changes = diffThemeSettings(state.originalSettings, sent);
    if (changes.length === 0) return { warnings: [], skipped: true };

    let result;
    try {
      result = await saveThemeSettingChanges(projectId, changes, sent);
    } catch (err) {
      if (err?.status === 409 && CONFLICT_CODES.has(err.code)) return resolveConflict(projectId, generation, err);
      throw err;
    }
    if (moved(projectId, generation)) return { warnings: result.warnings, stale: true };

    // A draft discarded while this save was in flight is not the user's newest
    // word — the saved values are. Keep nothing of it on top.
    const discarded = isDraftDiscarded();
    let adopted = true;
    let dropped = [];
    if (result.theme) {
      const live = get().settings;
      dropped = adoptServerTheme(result.theme, discarded ? [] : diffThemeSettings(sent, live), discarded ? live : sent);
    } else if (discarded || result.warnings.some((warning) => warning.code === "VALUE_CORRECTED")) {
      // The whole-file fallback returns no file; read back what it corrected —
      // or, for a draft discarded meanwhile, what it saved: rebaselining to the
      // sent values under the reverted draft would leave a dirty draft that the
      // next save sends back over the saved one.
      const fresh = await getThemeSettings(projectId);
      if (moved(projectId, generation)) return { warnings: result.warnings, stale: true };
      const live = get().settings;
      const discardedNow = isDraftDiscarded();
      dropped = adoptServerTheme(fresh, discardedNow ? [] : diffThemeSettings(sent, live), discardedNow ? live : sent);
    } else {
      set({ originalSettings: clone(sent) });
      adopted = false;
    }

    invalidateMediaCache(projectId);
    // `adopted`: the store now holds the server's copy (false only when the
    // whole-file fallback saved a draft that was not discarded, without
    // returning or correcting anything).
    return { warnings: [...result.warnings, ...dropped], adopted };
  };

  const startRun = (projectId) => {
    const run = runSave(projectId).finally(() => {
      if (inFlight === run) {
        inFlight = null;
        set({ saving: false });
      }
    });
    inFlight = run;
    set({ saving: true });
    return run;
  };

  return {
    // State
    settings: null,
    originalSettings: null,
    loading: false,
    error: null,
    loadedProjectId: null,
    activeLoadId: 0,
    // Only ever increases. Anything that replaces the store's copy wholesale
    // bumps it, and a save whose generation moved writes nothing back.
    generation: 0,
    // Bumped by the user's own draft writes only, never by taking a server copy.
    draftRevision: 0,
    // The draftRevision a discard left behind, while nothing has edited since.
    discardedRevision: null,
    saving: false,
    // Set when a save found settings changed elsewhere: { at, ids }.
    conflict: null,

    // Actions

    /**
     * Load theme settings for a project. Uses the active project if no
     * projectId is supplied. Includes a stale-load guard so that a slow
     * response from a previous project doesn't clobber a newer load.
     */
    loadSettings: async (projectId) => {
      const resolvedProjectId = projectId || getActiveProjectId();
      if (!resolvedProjectId) {
        set((prev) => ({
          settings: null,
          originalSettings: null,
          loading: false,
          error: null,
          loadedProjectId: null,
          generation: prev.generation + 1,
          discardedRevision: null,
          conflict: null,
        }));
        return;
      }

      const isProjectChange = get().loadedProjectId !== resolvedProjectId;
      const nextLoadId = get().activeLoadId + 1;
      set((prev) => ({
        activeLoadId: nextLoadId,
        generation: prev.generation + 1,
        discardedRevision: null,
        conflict: null,
        loading: true,
        error: null,
        ...(isProjectChange
          ? {
              settings: null,
              originalSettings: null,
              loadedProjectId: resolvedProjectId,
            }
          : {}),
      }));

      try {
        const settings = await getThemeSettings(resolvedProjectId);

        // Stale-load guard: drop the response if a newer load was started
        if (get().activeLoadId !== nextLoadId) return;

        set({
          settings,
          originalSettings: clone(settings),
          loading: false,
          loadedProjectId: resolvedProjectId,
        });
      } catch (err) {
        if (get().activeLoadId !== nextLoadId) return;
        // Clear previous project's data so it can't leak into the new project
        set({
          settings: null,
          originalSettings: null,
          loading: false,
          error: err.message,
          loadedProjectId: resolvedProjectId,
        });
        console.error("Failed to load theme settings:", err);
      }
    },

    /**
     * Save the unsaved changes for a project. Resolves an object carrying
     * `warnings` (objects with a `code`), plus `conflict: true` when the settings
     * were changed elsewhere (the edits are kept on top, still unsaved), or
     * `skipped`/`stale` when there was nothing to send or the store moved on.
     * A save requested while one runs waits for it, then sends what is still
     * unsaved; every caller waiting on that follow-up gets its result.
     */
    saveSettings: (projectId) => {
      const resolvedProjectId = projectId || getActiveProjectId();
      if (!resolvedProjectId || !get().settings) return Promise.resolve(null);
      // The follow-up first: between a run settling and its follow-up starting,
      // `inFlight` is already null, and starting another run there would put two
      // saves in flight at once.
      if (followUp) return followUp;
      if (!inFlight) return startRun(resolvedProjectId);
      const epoch = queueEpoch;
      followUp = inFlight
        .catch(() => {})
        .then(() => {
          // The store was reset while this waited: what it would send is gone.
          if (epoch !== queueEpoch) return { warnings: [], stale: true };
          followUp = null;
          return startRun(resolvedProjectId);
        });
      return followUp;
    },

    /**
     * Replace the full settings object (e.g. from an undo/redo restore).
     */
    setSettings: (settings) => {
      set((prev) => ({ settings, draftRevision: prev.draftRevision + 1 }));
    },

    /**
     * Update a single theme setting within a group.
     */
    updateThemeSetting: (groupKey, settingId, value) => {
      const { settings } = get();
      if (!settings?.settings?.global) return;

      const updatedSettings = clone(settings);
      const group = updatedSettings.settings.global[groupKey];
      if (!group) return;

      const settingIndex = group.findIndex((s) => s.id === settingId);
      if (settingIndex !== -1) {
        group[settingIndex].value = value;
      }

      set((prev) => ({ settings: updatedSettings, draftRevision: prev.draftRevision + 1 }));
    },

    /**
     * Revert settings to the last-saved state. Not an invalidation: a save in
     * flight still lands and rebaselines.
     */
    resetThemeSettings: () => {
      const { originalSettings } = get();
      if (originalSettings) {
        set((prev) => ({ settings: clone(originalSettings), draftRevision: prev.draftRevision + 1 }));
      }
    },

    /**
     * Revert the draft because the user discarded their edits (the editor's
     * discard-and-leave). A save already in flight still reaches the server;
     * when it lands on a draft nothing has edited since, the saved values are
     * taken as they are rather than reverted on top.
     */
    discardDraft: () => {
      get().resetThemeSettings();
      set((prev) => ({ discardedRevision: prev.draftRevision }));
    },

    /** Whether the draft is still the one a discard left in place. */
    isDraftDiscarded,

    /**
     * Check whether the in-memory draft differs from the last-saved state, by
     * the same per-setting comparison the save uses — so "unsaved" always means
     * there is something to send.
     */
    hasUnsavedThemeChanges: () => {
      const { settings, originalSettings } = get();
      if (!settings || !originalSettings) return false;
      return diffThemeSettings(originalSettings, settings).length > 0;
    },

    /** The screen announced the conflict. */
    clearConflict: () => set({ conflict: null }),

    /**
     * Re-read the server and reconcile with it, for when this store's copy is
     * known to be out of step and only the server can say what the theme is.
     *
     * The BASELINE always becomes what the server holds. The DRAFT follows only
     * while nothing has touched it since `expectedDraft` was captured — an edit
     * made while this request was in flight is the user's newest word, and it
     * then reads dirty against the fresh baseline, which is exactly true.
     *
     * Returns the server's copy, or null when the read failed or the store moved
     * on to another project or another load. It reads the load counter without
     * bumping it, so a load already running still finishes and clears `loading`.
     */
    reconcileFromServer: async (projectId, expectedDraft) => {
      const loadId = get().activeLoadId;

      let fresh;
      try {
        fresh = await getThemeSettings(projectId);
      } catch (err) {
        console.error("Failed to reconcile theme settings:", err);
        return null;
      }

      if (get().activeLoadId !== loadId || get().loadedProjectId !== projectId) return null;

      const untouched = get().settings === expectedDraft;
      const onTop = untouched ? [] : diffThemeSettings(get().originalSettings ?? fresh, get().settings);
      adoptServerTheme(fresh, onTop, expectedDraft);
      return fresh;
    },

    /**
     * After a successful external save, snapshot the current settings as
     * the new "original" baseline so dirty detection resets.
     */
    markThemeSettingsSaved: () => {
      const { settings } = get();
      if (settings) {
        set({ originalSettings: clone(settings) });
      }
    },

    /**
     * Drop the loaded copy because it changed on the server outside any save,
     * e.g. a theme update was applied. The next screen that needs the settings
     * loads them fresh; a save in flight writes nothing back. An unsaved draft
     * is discarded with it.
     */
    invalidate: () => {
      get().resetForProjectChange();
    },

    /**
     * Clear all state when switching projects or unmounting.
     * Bumps activeLoadId so any in-flight load from the previous project
     * is dropped when it resolves.
     */
    resetForProjectChange: () => {
      dropSaveQueue();
      set((prev) => ({
        settings: null,
        originalSettings: null,
        loading: false,
        error: null,
        loadedProjectId: null,
        activeLoadId: prev.activeLoadId + 1,
        generation: prev.generation + 1,
        discardedRevision: null,
        conflict: null,
        saving: false,
      }));
    },

    /**
     * Full reset (also resets activeLoadId). The generation keeps counting up,
     * so a save from before the reset still recognises it moved on.
     */
    reset: () => {
      dropSaveQueue();
      set((prev) => ({
        settings: null,
        originalSettings: null,
        loading: false,
        error: null,
        loadedProjectId: null,
        activeLoadId: 0,
        generation: prev.generation + 1,
        discardedRevision: null,
        conflict: null,
        saving: false,
      }));
    },
  };
});

/**
 * Register the one listener told whenever the store takes the server's copy:
 * `(expected, baseline, draft)`. pageStore uses it to keep the editor's undo
 * history in step. A static rather than state, so a store that mocks this one
 * without it is unaffected.
 */
useThemeStore.onServerThemeAdopted = (listener) => {
  adoptedListener = listener;
};

export default useThemeStore;
