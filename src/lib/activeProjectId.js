/**
 * Decouples apiFetch from projectStore to break the circular import chain:
 * apiFetch -> projectStore -> projectManager -> apiFetch
 *
 * Instead: apiFetch -> activeProjectId (no cycle)
 *          App.jsx calls registerProjectStore() once on mount
 */

let _store = null;

export function registerProjectStore(store) {
  _store = store;
}

export function getActiveProjectId() {
  return _store?.getState()?.activeProject?.id ?? null;
}
