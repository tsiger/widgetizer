import fs from "fs-extra";
import { getProjectDir } from "../config.js";
import * as projectRepo from "../db/repositories/projectRepository.js";

/**
 * Delete an editor project and all associated local data.
 *
 * Handles: export file cleanup, SQLite deletion (cascades to media_files,
 * media_sizes, media_usage, exports), active-project reassignment, and
 * project directory removal from disk.
 *
 * This is the single reusable utility called from:
 *   - projectController.deleteProject()  (editor-initiated delete)
 *   - websites.js DELETE route           (dashboard cascade delete)
 *   - deepLinkCreateProject() rollback   (draft registration failure)
 *   - reconciliation orphan cleanup      (stale local projects)
 *
 * @param {string} projectId - Editor project UUID
 * @param {string} userId    - Owner's user ID
 * @returns {Promise<{success: boolean, projectName: string, newActiveProjectId: string|null}|null>}
 *   Returns null if project not found, otherwise the result object.
 */
export async function deleteProjectById(projectId, userId) {
  const project = projectRepo.getProjectById(projectId, userId);
  if (!project) {
    return null;
  }

  const projectName = project.name;
  const projectFolderName = project.folderName;

  // Clean up export files BEFORE DB deletion (ON DELETE CASCADE would remove
  // export records, making it impossible to find export directories).
  try {
    const { cleanupProjectExports } = await import("../controllers/exportController.js");
    await cleanupProjectExports(projectId, userId);
  } catch (exportCleanupError) {
    console.warn(`[deleteProjectById] Export cleanup failed for ${projectId}:`, exportCleanupError);
    // Non-fatal: proceed with deletion even if export cleanup fails
  }

  // Delete from SQLite (cascades to media_files, media_sizes, media_usage, exports)
  projectRepo.deleteProject(projectId, userId);

  // Reassign active project if the deleted one was active
  let newActiveProjectId = projectRepo.getActiveProjectId(userId);
  if (newActiveProjectId === projectId || !newActiveProjectId) {
    const remainingProjects = projectRepo.getAllProjects(userId);
    newActiveProjectId = remainingProjects[0]?.id || null;
    projectRepo.setActiveProjectId(newActiveProjectId, userId);
  }

  // Delete project directory from disk
  const projectDir = getProjectDir(projectFolderName, userId);
  await fs.remove(projectDir);

  return { success: true, projectName, newActiveProjectId };
}
