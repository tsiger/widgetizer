import fs from "fs-extra";
import { getProjectDir } from "../config.js";
import * as projectRepo from "../db/repositories/projectRepository.js";

/**
 * Delete an editor project and its associated local data.
 *
 * Handles: export file cleanup, SQLite deletion (cascades to media_files,
 * media_sizes, media_usage, exports), active-project reassignment, and
 * project directory removal from disk. A directory that cannot be fully
 * removed does not undo the deletion; its path comes back as `folderLeftBehind`.
 *
 * This is the single reusable utility called from:
 *   - projectController.deleteProject()  (editor-initiated delete)
 *
 * @param {string} projectId - Editor project UUID
 * @returns {Promise<{success: boolean, projectName: string, newActiveProjectId: string|null, folderLeftBehind: string|null}|null>}
 *   Returns null if project not found, otherwise the result object. `folderLeftBehind`
 *   is the project folder's path when it could not be fully removed.
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

  // The project is already gone from the database, so a folder that cannot be
  // removed (a file locked by another program, on Windows) does not undo the
  // deletion; the caller reports what was left behind instead of a failure.
  const projectDir = getProjectDir(projectFolderName);
  let folderLeftBehind = null;
  try {
    await fs.remove(projectDir);
  } catch (removeError) {
    console.warn(`[deleteProjectById] Could not fully remove ${projectDir}:`, removeError);
    folderLeftBehind = projectDir;
  }

  return { success: true, projectName, newActiveProjectId, folderLeftBehind };
}
