import { create } from "zustand";
import { getThemeSettings } from "../queries/themeManager";

/**
 * Zustand store for managing theme settings state.
 * Used for the Settings page to display and modify global theme configuration.
 *
 * @typedef {Object} ThemeStore
 * @property {Object|null} settings - Current theme settings object
 * @property {Object|null} originalSettings - Deep copy of settings at load time for change detection
 * @property {boolean} loading - Whether theme settings are being loaded
 * @property {string|null} error - Error message if loading failed
 * @property {Function} loadSettings - Fetch theme settings from the server
 * @property {Function} setSettings - Directly update the settings object
 * @property {Function} updateThemeSetting - Update a single setting within a group
 * @property {Function} resetThemeSettings - Revert settings to original loaded state
 * @property {Function} hasUnsavedThemeChanges - Check if settings differ from original
 * @property {Function} markThemeSettingsSaved - Update original settings after successful save
 * @property {Function} reset - Clear all state to initial values
 */

const useThemeStore = create((set, get) => ({
  // State
  settings: null,
  originalSettings: null,
  loading: false,
  error: null,

  // Actions
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getThemeSettings();
      set({
        settings,
        originalSettings: JSON.parse(JSON.stringify(settings)), // Deep copy
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      console.error("Failed to load theme settings:", err);
    }
  },

  setSettings: (settings) => {
    set({ settings });
  },

  // Update a single theme setting
  updateThemeSetting: (groupKey, settingId, value) => {
    const { settings } = get();
    if (!settings || !settings.settings || !settings.settings.global) return;

    const updatedSettings = JSON.parse(JSON.stringify(settings));
    const group = updatedSettings.settings.global[groupKey];

    if (!group) return;

    // Find and update the setting
    const settingIndex = group.findIndex((s) => s.id === settingId);
    if (settingIndex !== -1) {
      group[settingIndex].value = value;
    }

    set({ settings: updatedSettings });
  },

  // Reset theme settings to original
  resetThemeSettings: () => {
    const { originalSettings } = get();
    if (originalSettings) {
      set({ settings: JSON.parse(JSON.stringify(originalSettings)) });
    }
  },

  // Check if there are unsaved changes
  hasUnsavedThemeChanges: () => {
    const { settings, originalSettings } = get();
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  },

  // After successful save, update originalSettings
  markThemeSettingsSaved: () => {
    const { settings } = get();
    if (settings) {
      set({ originalSettings: JSON.parse(JSON.stringify(settings)) });
    }
  },

  reset: () => {
    set({ settings: null, originalSettings: null, loading: false, error: null });
  },
}));

export default useThemeStore;
