import { apiFetch, apiFetchJson, rethrowQueryError, throwApiError } from "../lib/apiFetch";
import { uploadFormData } from "../lib/uploadRequest";

// ---------------------------------------------------------------------------
// Lightweight cache for getAllProjects() — single entry, not project-keyed.
// Mirrors the pattern in mediaManager.js but for a global list query.
// A version counter ensures in-flight fetches started before an invalidation
// cannot write stale data back into the cache.
// ---------------------------------------------------------------------------
let projectsListCache = { data: null, timestamp: 0, promise: null, version: 0 };
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Invalidate the projects list cache.
 * Called automatically by mutation functions after successful writes.
 * Bumps the version so any in-flight fetch from before the invalidation
 * is dropped when it resolves.
 */
export function invalidateProjectsListCache() {
  projectsListCache = { data: null, timestamp: 0, promise: null, version: projectsListCache.version + 1 };
}

/**
 * @typedef {Object} Project
 * @property {string} id - Unique project identifier
 * @property {string} name - Project name
 * @property {string} theme - Theme identifier used by the project
 * @property {string} [description] - Optional project description
 * @property {string} [siteTitle] - Optional site title used for exported metadata
 * @property {boolean} [themeUpdatesEnabled] - Whether theme updates are enabled
 * @property {string} [themeVersion] - Current theme version
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} updatedAt - ISO timestamp of last update
 */

/**
 * @typedef {Object} ThemeUpdateStatus
 * @property {boolean} hasUpdate - Whether a theme update is available
 * @property {string} [currentVersion] - Current theme version
 * @property {string} [latestVersion] - Latest available theme version
 * @property {string} [changelog] - Changelog for the update
 */

/**
 * Fetch all projects from the API with caching and request deduplication.
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<Project[]>} Array of project objects
 * @throws {Error} If the API request fails
 */
export async function getAllProjects({ forceRefresh } = {}) {
  const now = Date.now();

  // Return cached data if valid
  if (!forceRefresh && projectsListCache.data && now - projectsListCache.timestamp < CACHE_DURATION) {
    return projectsListCache.data;
  }

  // Deduplicate: if a fetch is already in flight, share it
  if (projectsListCache.promise) {
    try {
      return await projectsListCache.promise;
    } catch {
      // Cached promise failed — fall through to retry below
    }
  }

  // Capture version before the async fetch so we can detect mid-flight invalidation
  const versionAtStart = projectsListCache.version;

  const fetchPromise = (async () => {
    try {
      const data = await apiFetchJson("/api/projects", {}, { fallbackMessage: "Failed to get projects" });
      // Only populate cache if no invalidation occurred since this fetch started
      if (projectsListCache.version === versionAtStart) {
        projectsListCache = { data, timestamp: Date.now(), promise: null, version: versionAtStart };
      }
      return data;
    } catch (error) {
      if (projectsListCache.version === versionAtStart) {
        projectsListCache = { ...projectsListCache, promise: null };
      }
      throw error;
    }
  })();

  projectsListCache = { ...projectsListCache, promise: fetchPromise };

  try {
    return await fetchPromise;
  } catch (error) {
    rethrowQueryError(error, "Failed to get projects");
  }
}

/**
 * Fetch the currently active project.
 * @returns {Promise<Project|null>} The active project object, or null if none is set
 * @throws {Error} If the API request fails
 */
export async function getActiveProject() {
  try {
    return await apiFetchJson("/api/projects/active", {}, { fallbackMessage: "Failed to get active project" });
  } catch (error) {
    rethrowQueryError(error, "Failed to get active project");
  }
}

/**
 * Create a new project with the provided data.
 * @param {Object} projectData - The project configuration
 * @param {string} projectData.name - Project name (required)
 * @param {string} projectData.theme - Theme identifier to use (required)
 * @param {string} [projectData.description] - Optional project description
 * @returns {Promise<Project>} The newly created project object
 * @throws {Error} If project creation fails or validation errors occur
 */
export async function createProject(projectData) {
  try {
    const result = await apiFetchJson("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    }, { fallbackMessage: "Failed to create project" });
    invalidateProjectsListCache();
    return result;
  } catch (error) {
    rethrowQueryError(error, "Failed to create project");
  }
}

/**
 * Set a project as the active project.
 * @param {string} projectId - The ID of the project to activate
 * @returns {Promise<{success: boolean, project: Project}>} Success status and the activated project
 * @throws {Error} If the project cannot be activated
 */
export async function setActiveProject(projectId) {
  try {
    return await apiFetchJson(`/api/projects/active/${projectId}`, {
      method: "PUT",
    }, { fallbackMessage: "Failed to set active project" });
  } catch (error) {
    rethrowQueryError(error, "Failed to set active project");
  }
}

/**
 * Update an existing project with new data.
 * @param {string} projectId - The ID of the project to update
 * @param {Object} updates - The fields to update
 * @param {string} [updates.name] - New project name
 * @param {string} [updates.theme] - New theme identifier
 * @param {string} [updates.description] - New project description
 * @returns {Promise<Project>} The updated project object
 * @throws {Error} If the update fails or validation errors occur
 */
export async function updateProject(projectId, updates) {
  try {
    const result = await apiFetchJson(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }, { fallbackMessage: "Failed to update project" });
    invalidateProjectsListCache();
    return result;
  } catch (error) {
    rethrowQueryError(error, "Failed to update project");
  }
}

/**
 * Permanently delete a project and all its associated data.
 * @param {string} projectId - The ID of the project to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If the project cannot be deleted
 */
export async function deleteProject(projectId) {
  try {
    const result = await apiFetchJson(`/api/projects/${projectId}`, {
      method: "DELETE",
    }, { fallbackMessage: "Failed to delete project" });
    invalidateProjectsListCache();
    return result;
  } catch (error) {
    rethrowQueryError(error, "Failed to delete project");
  }
}

/**
 * Create a duplicate copy of an existing project including all pages, menus, and media.
 * @param {string} projectId - The ID of the project to duplicate
 * @returns {Promise<Project>} The newly created duplicate project
 * @throws {Error} If duplication fails
 */
export async function duplicateProject(projectId) {
  try {
    const result = await apiFetchJson(`/api/projects/${projectId}/duplicate`, {
      method: "POST",
    }, { fallbackMessage: "Failed to duplicate project" });
    invalidateProjectsListCache();
    return result;
  } catch (error) {
    console.error("Error duplicating project:", error);
    rethrowQueryError(error, "Failed to duplicate project");
  }
}

/**
 * Export a project as a ZIP file and trigger browser download.
 * The ZIP contains all project data for backup or transfer purposes.
 * @param {string} projectId - The ID of the project to export
 * @returns {Promise<void>} Resolves when download is triggered
 * @throws {Error} If export fails
 */
export async function exportProject(projectId) {
  try {
    const response = await apiFetch(`/api/projects/${projectId}/export`, {
      method: "POST",
    });

    if (!response.ok) {
      await throwApiError(response, "Failed to export project");
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "project-export.zip";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    rethrowQueryError(error, "Failed to export project");
  }
}

/**
 * Import a project from a ZIP file previously exported from the application.
 * @param {File} file - The ZIP file to import (from file input or drag-drop)
 * @param {function(number): void|{onProgress?: function(number): void, signal?: AbortSignal}} [optionsOrProgress] - Progress callback or options
 * @returns {Promise<Project>} The imported project object
 * @throws {Error} If import fails or the ZIP is invalid
 */
export async function importProject(file, optionsOrProgress) {
  const options =
    typeof optionsOrProgress === "function" ? { onProgress: optionsOrProgress } : (optionsOrProgress ?? {});
  const { onProgress, signal } = options;

  try {
    const formData = new FormData();
    formData.append("projectZip", file);

    const response = await uploadFormData("/api/projects/import", formData, { onProgress, signal });
    const data = response.data || {};

    invalidateProjectsListCache();
    return {
      ...data,
      processedFiles: data?.id ? [data] : [],
      rejectedFiles: [],
      error: null,
      status: response.status,
    };
  } catch (error) {
    if (error?.message || error?.status || error?.data || error?.aborted) {
      const normalizedError = new Error(error?.message || "Failed to import project");
      normalizedError.status = error.status;
      normalizedError.data = error.data;
      normalizedError.name = error.name || normalizedError.name;
      normalizedError.aborted = error.aborted;
      throw normalizedError;
    }
    throw new Error("Failed to import project");
  }
}

// ============================================================================
// Theme Update Functions
// ============================================================================

/**
 * Check if theme updates are available for a project.
 * Compares the project's current theme version against the latest available.
 * @param {string} projectId - The ID of the project to check
 * @returns {Promise<ThemeUpdateStatus>} Update status including version info
 * @throws {Error} If the check fails
 */
export async function checkThemeUpdates(projectId) {
  try {
    return await apiFetchJson(`/api/projects/${projectId}/theme-updates/status`, {}, {
      fallbackMessage: "Failed to check theme updates",
    });
  } catch (error) {
    rethrowQueryError(error, "Failed to check theme updates");
  }
}

/**
 * Enable or disable automatic theme update notifications for a project.
 * @param {string} projectId - The ID of the project to configure
 * @param {boolean} enabled - Whether to enable theme update notifications
 * @returns {Promise<{success: boolean, themeUpdatesEnabled: boolean}>} Updated preference status
 * @throws {Error} If the toggle fails
 */
export async function toggleThemeUpdates(projectId, enabled) {
  try {
    return await apiFetchJson(`/api/projects/${projectId}/theme-updates`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    }, { fallbackMessage: "Failed to toggle theme updates" });
  } catch (error) {
    rethrowQueryError(error, "Failed to toggle theme updates");
  }
}

/**
 * Apply an available theme update to a project.
 * Updates the project's theme to the latest version.
 * @param {string} projectId - The ID of the project to update
 * @returns {Promise<{success: boolean, previousVersion: string, newVersion: string}>} Update result
 * @throws {Error} If the update fails or no update is available
 */
export async function applyThemeUpdate(projectId) {
  try {
    const result = await apiFetchJson(`/api/projects/${projectId}/theme-updates/apply`, {
      method: "POST",
    }, { fallbackMessage: "Failed to apply theme update" });
    // Theme updates change project metadata (themeVersion), so invalidate the list
    invalidateProjectsListCache();
    return result;
  } catch (error) {
    rethrowQueryError(error, "Failed to apply theme update");
  }
}
