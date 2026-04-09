import { create } from "zustand";
import { getThemeSettings, saveThemeSettings } from "../queries/themeManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import { getActiveProjectId } from "../lib/activeProjectId";

/**
 * Canonical owner of per-project theme settings across the app.
 * Both the Settings page and the page editor read/write through this store.
 * The editor's pageStore keeps a thin proxy layer for undo/redo only.
 */

const useThemeStore = create((set, get) => ({
  // State
  settings: null,
  originalSettings: null,
  loading: false,
  error: null,
  loadedProjectId: null,
  activeLoadId: 0,

  // Actions

  /**
   * Load theme settings for a project. Uses the active project if no
   * projectId is supplied. Includes a stale-load guard so that a slow
   * response from a previous project doesn't clobber a newer load.
   */
  loadSettings: async (projectId) => {
    const resolvedProjectId = projectId || getActiveProjectId();
    if (!resolvedProjectId) {
      set({
        settings: null,
        originalSettings: null,
        loading: false,
        error: null,
        loadedProjectId: null,
      });
      return;
    }

    const nextLoadId = get().activeLoadId + 1;
    set({ activeLoadId: nextLoadId, loading: true, error: null });

    try {
      const settings = await getThemeSettings(resolvedProjectId);

      // Stale-load guard: drop the response if a newer load was started
      if (get().activeLoadId !== nextLoadId) return;

      set({
        settings,
        originalSettings: JSON.parse(JSON.stringify(settings)),
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
   * Save current settings to the server for a specific project.
   * Returns the save result (which may contain warnings).
   */
  saveSettings: async (projectId) => {
    const resolvedProjectId = projectId || getActiveProjectId();
    const { settings } = get();
    if (!resolvedProjectId || !settings) return null;

    const result = await saveThemeSettings(resolvedProjectId, settings);

    if (result.warnings?.length) {
      // Server corrected some values — reload to get the canonical state
      const freshData = await getThemeSettings(resolvedProjectId);
      // Only apply if still the same project
      if (get().loadedProjectId === resolvedProjectId) {
        set({
          settings: freshData,
          originalSettings: JSON.parse(JSON.stringify(freshData)),
        });
      }
    } else {
      if (get().loadedProjectId === resolvedProjectId) {
        set({ originalSettings: JSON.parse(JSON.stringify(settings)) });
      }
    }

    invalidateMediaCache(resolvedProjectId);
    return result;
  },

  /**
   * Replace the full settings object (e.g. from an undo/redo restore).
   */
  setSettings: (settings) => {
    set({ settings });
  },

  /**
   * Update a single theme setting within a group.
   */
  updateThemeSetting: (groupKey, settingId, value) => {
    const { settings } = get();
    if (!settings?.settings?.global) return;

    const updatedSettings = JSON.parse(JSON.stringify(settings));
    const group = updatedSettings.settings.global[groupKey];
    if (!group) return;

    const settingIndex = group.findIndex((s) => s.id === settingId);
    if (settingIndex !== -1) {
      group[settingIndex].value = value;
    }

    set({ settings: updatedSettings });
  },

  /**
   * Revert settings to the last-saved state.
   */
  resetThemeSettings: () => {
    const { originalSettings } = get();
    if (originalSettings) {
      set({ settings: JSON.parse(JSON.stringify(originalSettings)) });
    }
  },

  /**
   * Check whether the in-memory draft differs from the last-saved state.
   */
  hasUnsavedThemeChanges: () => {
    const { settings, originalSettings } = get();
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  },

  /**
   * After a successful external save, snapshot the current settings as
   * the new "original" baseline so dirty detection resets.
   */
  markThemeSettingsSaved: () => {
    const { settings } = get();
    if (settings) {
      set({ originalSettings: JSON.parse(JSON.stringify(settings)) });
    }
  },

  /**
   * Clear all state when switching projects or unmounting.
   * Bumps activeLoadId so any in-flight load from the previous project
   * is dropped when it resolves.
   */
  resetForProjectChange: () => {
    set((prev) => ({
      settings: null,
      originalSettings: null,
      loading: false,
      error: null,
      loadedProjectId: null,
      activeLoadId: prev.activeLoadId + 1,
    }));
  },

  /**
   * Full reset (also resets activeLoadId).
   */
  reset: () => {
    set({
      settings: null,
      originalSettings: null,
      loading: false,
      error: null,
      loadedProjectId: null,
      activeLoadId: 0,
    });
  },
}));

export default useThemeStore;
