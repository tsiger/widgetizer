import fs from "fs-extra";
import { getProjectsFilePath } from "../config.js";

/**
 * Helper to get project folderName from ID
 * @param {string} projectId - The project ID (UUID)
 * @returns {Promise<string>} - The project folderName
 */
export async function getProjectFolderName(projectId) {
  const projectsPath = getProjectsFilePath();
  try {
    if (await fs.pathExists(projectsPath)) {
      const data = JSON.parse(await fs.readFile(projectsPath, "utf8"));
      const project = data.projects.find((p) => p.id === projectId);
      if (project) return project.folderName;
    }
  } catch (error) {
    console.error(`Error resolving project folderName for ID ${projectId}:`, error);
  }
  return projectId; // Fallback
}
