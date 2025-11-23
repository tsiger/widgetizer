import fs from "fs-extra";
import { getProjectsFilePath } from "../config.js";

/**
 * Helper to get project slug from ID
 * @param {string} projectId - The project ID (UUID)
 * @returns {Promise<string>} - The project slug (or ID if slug not found)
 */
export async function getProjectSlug(projectId) {
  const projectsPath = getProjectsFilePath();
  try {
    if (await fs.pathExists(projectsPath)) {
      const data = JSON.parse(await fs.readFile(projectsPath, "utf8"));
      const project = data.projects.find((p) => p.id === projectId);
      if (project) return project.slug || project.id;
    }
  } catch (error) {
    console.error(`Error resolving project slug for ID ${projectId}:`, error);
  }
  return projectId; // Fallback
}
