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
    const clientProjectId = req.headers["x-project-id"];
    if (WRITE_METHODS.includes(req.method) && clientProjectId && clientProjectId !== activeProject.id) {
      return res.status(409).json({
        error: "Project mismatch",
        message: "The active project has changed. Please reload the page.",
        code: "PROJECT_MISMATCH",
      });
    }

    req.activeProject = activeProject;
    next();
  } catch (error) {
    next(error);
  }
}
