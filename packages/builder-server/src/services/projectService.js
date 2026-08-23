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
 *
 * @param {string} projectId - Editor project UUID
 * @returns {Promise<{success: boolean, projectName: string, newActiveProjectId: string|null}|null>}
 *   Returns null if project not found, otherwise the result object.
 */
export async function deleteProjectById(projectId) {
  const project = projectRepo.getProjectById(projectId);
  if (!project) {
    return null;
  }

  const projectName = project.name;
  const projectFolderName = project.folderName;

  // Export cleanup and the project-row removal run under one per-project
  // export lock: cleanup must precede the DB deletion (ON DELETE CASCADE would
  // remove export records, making it impossible to find export directories),
  // and the row must be gone before the lock releases — otherwise an export
  // queued behind the cleanup still sees a valid project and leaves an orphan
  // bundle after the deletion completes.
  const { withExportOpLock, cleanupProjectExports } = await import("../controllers/exportController.js");
  let newActiveProjectId = null;
  await withExportOpLock(projectId, async () => {
    try {
      await cleanupProjectExports(projectId, { withinLock: true });
    } catch (exportCleanupError) {
      console.warn(`[deleteProjectById] Export cleanup failed for ${projectId}:`, exportCleanupError);
      // Non-fatal: proceed with deletion even if export cleanup fails
    }

    // Delete from SQLite (cascades to media_files, media_sizes, media_usage,
    // exports) and reassign the active project in one transaction.
    newActiveProjectId = projectRepo.deleteProjectAndReassignActive(projectId);
  });

  // Delete project directory from disk
  const projectDir = getProjectDir(projectFolderName);
  await fs.remove(projectDir);

  return { success: true, projectName, newActiveProjectId };
}
