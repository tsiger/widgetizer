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
 *    "initial scope via prop" hook; it lets editor-ui stop
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

// Bootstrap resilience: a cold-boot GET /api/projects/active can be cancelled by
// a top-level navigation (NS_BINDING_ABORTED) or hit a transient error. Retry a
// bounded number of times before surfacing an error — a failed probe must NOT be
// mistaken for "no active project" (that wrongly bounces the editor to the picker).
const BOOTSTRAP_MAX_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_DELAY_MS = 400;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry only THROWN failures. A resolved value (a project, or null when no
// projects exist) is authoritative and returned immediately — null still routes
// to the picker.
async function fetchActiveProjectWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt++) {
    try {
      return await getActiveProject();
    } catch (error) {
      lastError = error;
      if (attempt < BOOTSTRAP_MAX_ATTEMPTS) await sleep(BOOTSTRAP_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

// Single-flight guard: React StrictMode double-invokes the bootstrap effect, and
// two racing fetches let the first-to-fail bounce the router before the second
// resolves. Sharing one in-flight promise yields one fetch and one settle.
let inflightFetch = null;

// Create the store
const useProjectStore = create((set) => ({
  // State
  activeProject: null,
  scope: null,
  loading: true,
  error: null,

  // Actions
  fetchActiveProject: () => {
    if (inflightFetch) return inflightFetch;
    set({ loading: true, error: null });
    inflightFetch = (async () => {
      try {
        const project = await fetchActiveProjectWithRetry();
        set({ activeProject: project, scope: deriveScope(project), loading: false, error: null });
      } catch (error) {
        // Retries exhausted. Surface an explicit error the gates read as
        // "couldn't load" (retry screen) — NOT "no project" (picker).
        console.error("Failed to load active project:", error);
        set({ error: error.message, loading: false });
      } finally {
        inflightFetch = null;
      }
    })();
    return inflightFetch;
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
