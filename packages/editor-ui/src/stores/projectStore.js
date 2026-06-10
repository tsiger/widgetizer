import { create } from "zustand";
import { LOCAL_ACTOR } from "@widgetizer/core/adapters";
import { getActiveProject } from "../queries/projectManager";

/**
 * Zustand store for the active project / editor scope.
 *
 * Two ways the project is established:
 *  - `fetchActiveProject()` — OSS-shell path: reads the singleton active
 *    project from the API (`/api/projects/active`).
 *  - `seedProject(project)` — DI path: a shell (e.g. the hosted `EditorShell`)
 *    that already knows the project hands it in directly, no fetch. This is the
 *    "initial scope via prop" hook from the design doc; it lets editor-ui stop
 *    assuming a singleton active-project API.
 *
 * The store also exposes a derived `scope` ({ actor, projectId, folderName }) so
 * editor code can read the scope uniformly instead of reaching into the project
 * object. The `actor` here is the OSS local default; a hosted shell seeds its
 * own scope (with a cloud actor) via `seedProject`/`setActiveProject`.
 *
 * @typedef {Object} ProjectStore
 * @property {Object|null} activeProject - The currently active project object
 * @property {{actor: object, projectId: string, folderName: string}|null} scope
 * @property {boolean} loading
 * @property {string|null} error
 */

/** Derive the editor scope from a project record. */
function deriveScope(project) {
  if (!project) return null;
  return {
    actor: LOCAL_ACTOR,
    projectId: project.id,
    folderName: project.folderName,
  };
}

// Create the store
const useProjectStore = create((set) => ({
  // State
  activeProject: null,
  scope: null,
  loading: true,
  error: null,

  // Actions
  fetchActiveProject: async () => {
    set({ loading: true, error: null });
    try {
      const project = await getActiveProject();
      set({ activeProject: project, scope: deriveScope(project), loading: false });
    } catch (error) {
      console.error("Failed to load active project:", error);
      set({ error: error.message, loading: false });
    }
  },

  // Manually set the active project (e.g. after the OSS project picker selects one).
  setActiveProject: (project) => set({ activeProject: project, scope: deriveScope(project) }),

  // Seed the store from an externally-provided project (DI path). Marks loading
  // false since no fetch is needed; pass an explicit scope to override the
  // derived (local) actor — e.g. a hosted shell with a cloud actor.
  seedProject: (project, scope = null) =>
    set({ activeProject: project, scope: scope ?? deriveScope(project), loading: false, error: null }),
}));

// NOTE: Do NOT call fetchActiveProject() here at module load time.
// Instead, the fetch (OSS) or seedProject (DI shells) is triggered by the shell.

export default useProjectStore;
