import { editorFetchJson, rethrowQueryError } from "../lib/apiFetch";
import { getApiBase } from "../lib/apiBase";
import { API_URL } from "../lib/config";

/**
 * Absolute URL for a browser navigation to an exported file (View links + the
 * dev-mode issues report).
 *
 * View/Download are real browser navigations (window.open / <a download>), not
 * editorFetch calls, so they must be ABSOLUTE: the relative apiBase ("/api")
 * resolves against the Vite dev origin — which has no API proxy — and returns
 * the SPA shell (404 / corrupt zip). API_URL prepends the configured host
 * (VITE_API_URL in dev, "" same-origin in prod); getApiBase() supplies the
 * scope prefix (OSS "/api", hosted "/api/projects/:id").
 *
 * @param {string} exportDir - The export directory name
 * @param {string} filePath - File within the export (e.g. "index.html")
 * @returns {string} Absolute URL
 */
export function getExportViewUrl(exportDir, filePath) {
  return API_URL(`${getApiBase()}/export/view/${exportDir}/${filePath}`);
}

/**
 * Absolute URL for downloading an export as a ZIP. Absolute for the same reason
 * as {@link getExportViewUrl}.
 * @param {string} exportDir - The export directory name
 * @returns {string} Absolute URL
 */
export function getExportDownloadUrl(exportDir) {
  return API_URL(`${getApiBase()}/export/download/${exportDir}`);
}

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
    return await editorFetchJson("/export", {
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
    return await editorFetchJson("/export/history", {
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
    return await editorFetchJson(`/export/${version}`, {
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
    return await editorFetchJson(`/export/files/${exportDir}`, {
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
  const downloadUrl = getExportDownloadUrl(exportDir);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${exportDir}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
