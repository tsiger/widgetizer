import { create } from "zustand";
import { getActiveProject } from "../queries/projectManager";

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

// Just do the initial fetch when the store is created
useProjectStore.getState().fetchActiveProject();

export default useProjectStore;
