import { API_URL } from "../config";
import { apiFetchJson, rethrowQueryError } from "../lib/apiFetch";

/**
 * @typedef {Object} ExportResult
 * @property {boolean} success - Whether export completed successfully
 * @property {string} message - Status message
 * @property {string} outputDir - Directory name of the export
 * @property {number} version - Export version number
 */

/**
 * @typedef {Object} ExportHistoryEntry
 * @property {number} version - Export version number
 * @property {string} outputDir - Directory name
 * @property {string} createdAt - ISO timestamp of export
 * @property {number} size - Total export size in bytes
 */

/**
 * Trigger the export process for a project.
 * Generates static HTML/CSS/JS files from the project.
 * @param {string} projectId - The ID of the project to export
 * @param {Object} [options] - Export options
 * @param {boolean} [options.exportMarkdown=false] - Also export pages as markdown
 * @returns {Promise<ExportResult>} Export result with output directory and version
 * @throws {Error} If projectId is missing or export fails
 */
export async function exportProjectAPI(projectId, options = {}) {
  if (!projectId) {
    throw new Error("Project ID is required to export.");
  }

  try {
    return await apiFetchJson(`/api/export/${projectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exportMarkdown: options.exportMarkdown || false,
      }),
    }, { fallbackMessage: "Failed to export project" });
  } catch (error) {
    console.error("Export API Error:", error);
    rethrowQueryError(error, "Failed to export project");
  }
}

/**
 * Fetch the export history for a project.
 * Returns all previous exports with version numbers and timestamps.
 * @param {string} projectId - The ID of the project
 * @returns {Promise<{success: boolean, exports: ExportHistoryEntry[], totalExports: number}>} Export history
 * @throws {Error} If projectId is missing or request fails
 */
export async function getExportHistory(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to get export history.");
  }

  try {
    return await apiFetchJson(`/api/export/history/${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }, { fallbackMessage: "Failed to get export history" });
  } catch (error) {
    console.error("Export History API Error:", error);
    rethrowQueryError(error, "Failed to get export history");
  }
}

/**
 * Delete a specific export version from a project.
 * @param {string} projectId - The ID of the project
 * @param {number} version - The version number to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If projectId/version missing or deletion fails
 */
export async function deleteExportAPI(projectId, version) {
  if (!projectId || !version) {
    throw new Error("Project ID and version are required to delete export.");
  }

  try {
    return await apiFetchJson(`/api/export/${projectId}/${version}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }, { fallbackMessage: "Failed to delete export" });
  } catch (error) {
    console.error("Delete Export API Error:", error);
    rethrowQueryError(error, "Failed to delete export");
  }
}

/**
 * Get the entry file for an export directory.
 * Uses smart detection to find index.html or the first HTML file.
 * @param {string} exportDir - The export directory name
 * @returns {Promise<{success: boolean, entryFile: string}>} Entry file information
 * @throws {Error} If exportDir is missing or no entry file found
 */
export async function getExportEntryFile(exportDir) {
  if (!exportDir) {
    throw new Error("Export directory is required.");
  }

  try {
    return await apiFetchJson(`/api/export/files/${exportDir}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }, { fallbackMessage: "Failed to get export entry file" });
  } catch (error) {
    console.error("Export Files API Error:", error);
    rethrowQueryError(error, "Failed to get export entry file");
  }
}

/**
 * Trigger a browser download of an export as a ZIP file.
 * Creates a temporary link and initiates the download.
 * @param {string} exportDir - The export directory name to download
 * @returns {void}
 * @throws {Error} If exportDir is missing
 */
export function downloadExportZip(exportDir) {
  if (!exportDir) {
    throw new Error("Export directory is required to download.");
  }

  // Create a temporary link to trigger download
  const downloadUrl = API_URL(`/api/export/download/${exportDir}`);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${exportDir}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
