import { readProjectsFile } from "../controllers/projectController.js";

/**
 * Express middleware that resolves the active project and attaches it to req.
 * Returns 404 if no active project is found.
 * After this middleware, handlers can access req.activeProject directly.
 */
export async function resolveActiveProject(req, res, next) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    req.activeProject = activeProject;
    next();
  } catch (error) {
    next(error);
  }
}
