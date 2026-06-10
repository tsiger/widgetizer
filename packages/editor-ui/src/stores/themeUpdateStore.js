import { create } from "zustand";
import { getThemeUpdateCount } from "../queries/themeManager";

/**
 * Zustand store for tracking available theme updates.
 * Used to display update badges in the sidebar navigation.
 *
 * @typedef {Object} ThemeUpdateStore
 * @property {number} updateCount - Number of themes with available updates
 * @property {boolean} isLoading - Whether the update count is being fetched
 * @property {Function} fetchUpdateCount - Fetch the current count of available theme updates
 */

const useThemeUpdateStore = create((set) => ({
  updateCount: 0,
  isLoading: false,

  fetchUpdateCount: async () => {
    set({ isLoading: true });
    try {
      const result = await getThemeUpdateCount();
      set({ updateCount: result.count || 0 });
    } catch (error) {
      console.error("Failed to fetch theme update count:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useThemeUpdateStore;
