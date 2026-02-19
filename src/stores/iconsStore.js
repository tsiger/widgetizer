import { create } from "zustand";
import { apiFetch } from "../lib/apiFetch";

/**
 * Zustand store for caching project icon sets.
 * Prevents refetching icons on every IconInput mount by maintaining a per-project cache.
 *
 * @typedef {Object} IconsCache
 * @property {Object<string, string>} icons - Map of icon names to SVG content
 * @property {string} prefix - Icon prefix for the set
 * @property {number} fetchedAt - Timestamp when icons were fetched
 *
 * @typedef {Object} IconsStore
 * @property {Object<string, IconsCache>} iconsCache - Cached icons by project ID
 * @property {Object<string, boolean>} loading - Loading state by project ID
 * @property {Object<string, string|null>} error - Error messages by project ID
 * @property {Function} fetchIcons - Fetch icons for a project
 * @property {Function} getIcons - Get cached icons synchronously
 * @property {Function} clearCache - Clear cache for a specific project
 * @property {Function} clearAllCache - Clear all cached icons
 */
const useIconsStore = create((set, get) => ({
  /** @type {Object<string, IconsCache>} */
  iconsCache: {},
  /** @type {Object<string, boolean>} */
  loading: {},
  /** @type {Object<string, string|null>} */
  error: {},

  /**
   * Fetch icons for a project if not already cached.
   * Returns cached data immediately if available and not forcing refresh.
   * @param {string} projectId - The project ID to fetch icons for
   * @param {boolean} [forceRefresh=false] - Force a refresh even if cached
   * @returns {Promise<IconsCache>} Icon data with icons map and prefix
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
      const res = await apiFetch(`/api/projects/${projectId}/icons`);
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
   * Get cached icons for a project synchronously.
   * Returns empty object if no cache exists.
   * @param {string} projectId - The project ID
   * @returns {IconsCache} Cached icon data or empty object
   */
  getIcons: (projectId) => {
    return get().iconsCache[projectId] || { icons: {} };
  },

  /**
   * Clear cached icons for a specific project.
   * @param {string} projectId - The project ID to clear cache for
   */
  clearCache: (projectId) => {
    set((state) => {
      // eslint-disable-next-line no-unused-vars
      const { [projectId]: _, ...rest } = state.iconsCache;
      return { iconsCache: rest };
    });
  },

  /**
   * Clear all cached icons across all projects.
   * Useful when switching users or resetting application state.
   */
  clearAllCache: () => {
    set({ iconsCache: {} });
  },
}));

export default useIconsStore;
