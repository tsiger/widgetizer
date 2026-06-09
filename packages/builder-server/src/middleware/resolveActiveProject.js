import * as projectRepo from "../db/repositories/projectRepository.js";

/**
 * Express middleware that resolves the active project and attaches it to req.
 * Returns 404 if no active project is found.
 * After this middleware, handlers can access req.activeProject directly.
 */
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export async function resolveActiveProject(req, res, next) {
  try {
    const activeProjectId = projectRepo.getActiveProjectId();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const activeProject = projectRepo.getProjectById(activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Guard: reject writes if the frontend's project doesn't match
    if (WRITE_METHODS.includes(req.method)) {
      const clientProjectId = req.headers["x-project-id"];
      const routeProjectId = req.params?.projectId;

      if (
        (clientProjectId && clientProjectId !== activeProject.id) ||
        (routeProjectId && routeProjectId !== activeProject.id)
      ) {
        return res.status(409).json({
          error: "Project mismatch",
          message: "The active project has changed. Please reload the page.",
          code: "PROJECT_MISMATCH",
        });
      }
    }

    req.activeProject = activeProject;
    // Also expose the resolved scope so handlers can migrate from
    // req.activeProject to the shell-agnostic req.scope. OSS is single-tenant,
    // so the actor is always the local default.
    req.scope = {
      actor: { id: "default", kind: "local" },
      projectId: activeProject.id,
      folderName: activeProject.folderName,
    };
    next();
  } catch (error) {
    next(error);
  }
}
