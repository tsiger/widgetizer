import * as projectRepo from "../db/repositories/projectRepository.js";

/**
 * Express middleware that resolves the active project and attaches it to req.
 * Returns 404 if no active project is found.
 * After this middleware, handlers can access req.activeProject directly.
 */
export async function resolveActiveProject(req, res, next) {
  try {
    const activeProjectId = projectRepo.getActiveProjectId(req.userId);

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const activeProject = projectRepo.getProjectById(activeProjectId, req.userId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    req.activeProject = activeProject;
    next();
  } catch (error) {
    next(error);
  }
}
