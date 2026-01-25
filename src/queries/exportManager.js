import { API_URL } from "../config";

/**
 * Calls the backend API to trigger the exporting process for a project.
 */
export async function exportProjectAPI(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to export.");
  }

  const response = await fetch(API_URL(`/api/export/${projectId}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add any other necessary headers like authorization if needed
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || `HTTP error! status: ${response.status}`;
    console.error("Export API Error:", result);
    throw new Error(errorMessage);
  }

  return result; // Should contain { success: true, message: "...", outputDir: "...", version: N }
}

/**
 * Gets the export history for a project.
 */
export async function getExportHistory(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to get export history.");
  }

  const response = await fetch(API_URL(`/api/export/history/${projectId}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || `HTTP error! status: ${response.status}`;
    console.error("Export History API Error:", result);
    throw new Error(errorMessage);
  }

  return result; // Should contain { success: true, exports: [...], totalExports: N }
}

/**
 * Deletes a specific export version.
 */
export async function deleteExportAPI(projectId, version) {
  if (!projectId || !version) {
    throw new Error("Project ID and version are required to delete export.");
  }

  const response = await fetch(API_URL(`/api/export/${projectId}/${version}`), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || `HTTP error! status: ${response.status}`;
    console.error("Delete Export API Error:", result);
    throw new Error(errorMessage);
  }

  return result; // Should contain { success: true, message: "..." }
}

/**
 * Gets the entry file for an export (smart detection of index.html or first HTML file).
 */
export async function getExportEntryFile(exportDir) {
  if (!exportDir) {
    throw new Error("Export directory is required.");
  }

  const response = await fetch(API_URL(`/api/export/files/${exportDir}`), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || `HTTP error! status: ${response.status}`;
    console.error("Export Files API Error:", result);
    throw new Error(errorMessage);
  }

  return result; // Should contain { success: true, entryFile: "filename.html" }
}

/**
 * Downloads an export as a ZIP file.
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
