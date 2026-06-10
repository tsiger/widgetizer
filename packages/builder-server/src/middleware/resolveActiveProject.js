import * as projectRepo from "../db/repositories/projectRepository.js";

/**
 * Express middleware that resolves the request scope and attaches it to req.
 *
 * Scope resolution is DELEGATED to the injected `req.adapters.scopeResolver`.
 * This is the seam that lets hosted swap in a Clerk-backed CloudScopeResolver:
 * OSS wires LocalScopeResolver (singleton active project), hosted wires its own.
 * The middleware itself only owns HTTP-layer policy (the write-guard) and the
 * convenience of loading the full project row for handlers that still read
 * `req.activeProject`.
 *
 * After this middleware: `req.scope` (the resolver's scope) and
 * `req.activeProject` (the full project row) are both available.
 */
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export async function resolveActiveProject(req, res, next) {
  try {
    let scope;
    try {
      scope = await req.adapters.scopeResolver.resolveScope(req);
    } catch (err) {
      // Preserve OSS's existing 404 response shape for the "no active project"
      // cases (NO_ACTIVE_PROJECT / PROJECT_NOT_FOUND). Any other resolver error
      // (hosted: AuthenticationError 401 / AuthorizationError 403, or an
      // unexpected failure) flows to errorHandler, which maps
      // WidgetizerError.statusCode.
      if (err?.code === "NO_ACTIVE_PROJECT" || err?.code === "PROJECT_NOT_FOUND") {
        return res.status(404).json({ error: "No active project found" });
      }
      return next(err);
    }

    // HTTP-layer write-guard (policy, not scope resolution): reject writes whose
    // client/route project id disagrees with the resolved scope. Kept here, not
    // in the resolver, because it is request-shape policy.
    if (WRITE_METHODS.includes(req.method)) {
      const clientProjectId = req.headers["x-project-id"];
      const routeProjectId = req.params?.projectId;

      if (
        (clientProjectId && clientProjectId !== scope.projectId) ||
        (routeProjectId && routeProjectId !== scope.projectId)
      ) {
        return res.status(409).json({
          error: "Project mismatch",
          message: "The active project has changed. Please reload the page.",
          code: "PROJECT_MISMATCH",
        });
      }
    }

    // Load the full project row for handlers that still read req.activeProject.
    const activeProject = projectRepo.getProjectById(scope.projectId);
    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    req.activeProject = activeProject;
    req.scope = scope;
    next();
  } catch (error) {
    next(error);
  }
}
