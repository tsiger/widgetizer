import { create } from "zustand";
import { getThemeSettings } from "../queries/themeManager";

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
