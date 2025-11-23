import { create } from "zustand";
import { getThemeSettings } from "../queries/themeManager";

const useThemeStore = create((set) => ({
  // State
  settings: null,
  loading: false,
  error: null,

  // Actions
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getThemeSettings();
      set({ settings, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      console.error("Failed to load theme settings:", err);
    }
  },

  setSettings: (settings) => {
    set({ settings });
  },

  reset: () => {
    set({ settings: null, loading: false, error: null });
  },
}));

export default useThemeStore;
