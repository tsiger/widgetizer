import fs from "fs-extra";
import { getProjectsFilePath } from "../config.js";
import { PROJECT_ERROR_CODES } from "./projectErrors.js";

/**
 * Get the folder name for a project by its ID.
 * Reads the projects.json file and finds the matching project.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<string>} The project's folder name
 * @throws {Error} If projects file not found (code: PROJECTS_FILE_MISSING)
 * @throws {Error} If project not found (code: PROJECT_NOT_FOUND)
 * @throws {Error} If file read fails (code: PROJECTS_FILE_READ_FAILED)
 */
export async function getProjectFolderName(projectId) {
  const projectsPath = getProjectsFilePath();
  try {
    if (!(await fs.pathExists(projectsPath))) {
      const error = new Error("Projects file not found");
      error.code = PROJECT_ERROR_CODES.PROJECTS_FILE_MISSING;
      throw error;
    }

    const data = JSON.parse(await fs.readFile(projectsPath, "utf8"));
    const project = data.projects.find((p) => p.id === projectId);
    if (project) return project.folderName;

    const error = new Error(`Project not found for ID ${projectId}`);
    error.code = PROJECT_ERROR_CODES.PROJECT_NOT_FOUND;
    throw error;
  } catch (error) {
    if (
      error.code === PROJECT_ERROR_CODES.PROJECTS_FILE_MISSING ||
      error.code === PROJECT_ERROR_CODES.PROJECT_NOT_FOUND
    ) {
      throw error;
    }

    const wrappedError = new Error(`Failed to resolve project folderName for ID ${projectId}: ${error.message}`);
    wrappedError.code = PROJECT_ERROR_CODES.PROJECTS_FILE_READ_FAILED;
    throw wrappedError;
  }
}
