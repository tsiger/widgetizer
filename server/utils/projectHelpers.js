import {
  getProjectFolderName as repoGetFolderName,
  getProjectById,
} from "../db/repositories/projectRepository.js";
import { PROJECT_ERROR_CODES } from "./projectErrors.js";

/**
 * Get the folder name for a project by its ID.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<string>} The project's folder name
 * @throws {Error} If project not found
 */
export async function getProjectFolderName(projectId) {
  const folderName = repoGetFolderName(projectId);
  if (!folderName) {
    const error = new Error(`Project not found for ID ${projectId}`);
    error.code = PROJECT_ERROR_CODES.PROJECT_NOT_FOUND;
    throw error;
  }
  return folderName;
}

/**
 * Get the full project details by its ID.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<object>} The project object
 * @throws {Error} If project not found
 */
export async function getProjectDetails(projectId) {
  const project = getProjectById(projectId);
  if (!project) {
    const error = new Error(`Project not found for ID ${projectId}`);
    error.code = PROJECT_ERROR_CODES.PROJECT_NOT_FOUND;
    throw error;
  }
  return project;
}
