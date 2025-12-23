import { create } from "zustand";
import { API_URL } from "../config";

/**
 * Icons Store
 * Caches icon data per project to avoid refetching on every IconInput mount.
 */
const useIconsStore = create((set, get) => ({
  // Map of projectId -> { icons: {}, prefix: string, fetchedAt: number }
  iconsCache: {},
  loading: {},
  error: {},

  /**
   * Fetch icons for a project if not already cached
   * @param {string} projectId - The project ID
   * @param {boolean} forceRefresh - Force a refresh even if cached
   */
  fetchIcons: async (projectId, forceRefresh = false) => {
    if (!projectId) return { icons: {} };

    const { iconsCache, loading } = get();
    const cached = iconsCache[projectId];

    // Return cached data if available and not forcing refresh
    if (cached && !forceRefresh) {
      return cached;
    }

    // If already loading, wait for it
    if (loading[projectId]) {
      return cached || { icons: {} };
    }

    set((state) => ({
      loading: { ...state.loading, [projectId]: true },
      error: { ...state.error, [projectId]: null },
    }));

    try {
      const res = await fetch(API_URL(`/api/projects/${projectId}/icons`));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      set((state) => ({
        iconsCache: {
          ...state.iconsCache,
          [projectId]: { ...data, fetchedAt: Date.now() },
        },
        loading: { ...state.loading, [projectId]: false },
      }));

      return data;
    } catch (err) {
      console.error(`Failed to fetch icons for project ${projectId}:`, err);
      set((state) => ({
        loading: { ...state.loading, [projectId]: false },
        error: { ...state.error, [projectId]: err.message },
      }));
      return { icons: {} };
    }
  },

  /**
   * Get cached icons for a project (synchronous)
   */
  getIcons: (projectId) => {
    return get().iconsCache[projectId] || { icons: {} };
  },

  /**
   * Clear cache for a project
   */
  clearCache: (projectId) => {
    set((state) => {
      const { [projectId]: _, ...rest } = state.iconsCache;
      return { iconsCache: rest };
    });
  },

  /**
   * Clear all cached icons
   */
  clearAllCache: () => {
    set({ iconsCache: {} });
  },
}));

export default useIconsStore;
