import { create } from "zustand";
import { getActiveProject } from "../queries/projectManager";

/**
 * Zustand store for managing the active project state.
 * Automatically fetches the active project on store initialization.
 *
 * @typedef {Object} ProjectStore
 * @property {Object|null} activeProject - The currently active project object
 * @property {boolean} loading - Whether the project is being fetched
 * @property {string|null} error - Error message if fetch failed, null otherwise
 * @property {Function} fetchActiveProject - Fetch and set the active project from the server
 * @property {Function} setActiveProject - Manually set the active project
 */

// Create the store
const useProjectStore = create((set) => ({
  // State
  activeProject: null,
  loading: true,
  error: null,

  // Actions
  fetchActiveProject: async () => {
    set({ loading: true, error: null });
    try {
      const project = await getActiveProject();
      set({ activeProject: project, loading: false });
    } catch (error) {
      console.error("Failed to load active project:", error);
      set({ error: error.message, loading: false });
    }
  },

  // You can add more actions later
  setActiveProject: (project) => set({ activeProject: project }),
}));

// NOTE: Do NOT call fetchActiveProject() here at module load time.
// Instead, the fetch is triggered from App.jsx on mount.

export default useProjectStore;
