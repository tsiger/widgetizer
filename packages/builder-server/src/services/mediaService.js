import { getProjectFolderName } from "../utils/projectHelpers.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";

/**
 * Reads media metadata from SQLite for a project.
 * Validates the project exists before querying.
 * @param {string} projectId - The project UUID
 * @returns {Promise<{files: Array<object>}>} The media metadata object
 */
export async function readMediaFile(projectId) {
  // Validate project exists (throws if not found)
  await getProjectFolderName(projectId);
  return mediaRepo.getMediaFiles(projectId);
}
