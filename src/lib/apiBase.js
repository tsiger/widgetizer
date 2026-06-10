/**
 * Configurable base path for **project-scoped editor** API calls.
 *
 * The OSS shell serves the editor's project-scoped router under `/api` (with a
 * singleton active project resolved from the `X-Project-Id` header); hosted
 * serves the same router under `/api/projects/${projectId}`. Editor query code
 * issues calls through `editorFetch` (see apiFetch.js), which prepends this
 * base — so the same code works in both shells.
 *
 * This is a registry (not React context), mirroring `registerProjectStore` in
 * activeProjectId.js, so the non-component query layer can read it without prop
 * drilling. `EditorShell` will call `setApiBase()` once on mount; the default
 * reproduces today's OSS behavior.
 *
 * Note: actor-scoped / shell calls (projects, themes, app settings) and the few
 * project-id-in-path editor endpoints (e.g. `/api/projects/:id/widgets`, media,
 * export) keep using `apiFetch` with absolute paths until the hosted route
 * scheme is aligned (Stage 2).
 */
let _apiBase = "/api";

export function setApiBase(base) {
  _apiBase = base;
}

export function getApiBase() {
  return _apiBase;
}
