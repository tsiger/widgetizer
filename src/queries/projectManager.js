import { apiFetch } from "../lib/apiFetch";

/**
 * @typedef {Object} Project
 * @property {string} id - Unique project identifier
 * @property {string} name - Project name
 * @property {string} theme - Theme identifier used by the project
 * @property {string} [description] - Optional project description
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
 * Fetch all projects from the API.
 * @returns {Promise<Project[]>} Array of project objects
 * @throws {Error} If the API request fails
 */
export async function getAllProjects() {
  try {
    const response = await apiFetch("/api/projects");
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get projects");
  }
}

/**
 * Fetch the currently active project.
 * @returns {Promise<Project|null>} The active project object, or null if none is set
 * @throws {Error} If the API request fails
 */
export async function getActiveProject() {
  try {
    const response = await apiFetch("/api/projects/active");
    if (!response.ok) {
      throw new Error("Failed to fetch active project");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get active project");
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
    const response = await apiFetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle express-validator format: { errors: [{msg, param}, ...] }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw new Error(errorData.errors.map((e) => e.msg).join("; "));
      }
      throw new Error(errorData.error || "Failed to create project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to create project");
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
    const response = await apiFetch(`/api/projects/active/${projectId}`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error("Failed to set active project");
    }
    const result = await response.json();
    return result;
  } catch {
    throw new Error("Failed to set active project");
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
    const response = await apiFetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle express-validator format: { errors: [{msg, param}, ...] }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw new Error(errorData.errors.map((e) => e.msg).join("; "));
      }
      throw new Error(errorData.error || "Failed to update project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to update project");
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
    const response = await apiFetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete project");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to delete project");
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
    const response = await apiFetch(`/api/projects/${projectId}/duplicate`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to duplicate project");
    }

    return await response.json();
  } catch (error) {
    console.error("Error duplicating project:", error);
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to duplicate project");
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export project");
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
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to export project");
  }
}

/**
 * Import a project from a ZIP file previously exported from the application.
 * @param {File} file - The ZIP file to import (from file input or drag-drop)
 * @returns {Promise<Project>} The imported project object
 * @throws {Error} If import fails or the ZIP is invalid
 */
export async function importProject(file) {
  try {
    const formData = new FormData();
    formData.append("projectZip", file);

    const response = await apiFetch("/api/projects/import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to import project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
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
    const response = await apiFetch(`/api/projects/${projectId}/theme-updates/status`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to check theme updates");
    }
    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to check theme updates");
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
    const response = await apiFetch(`/api/projects/${projectId}/theme-updates`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to toggle theme updates");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to toggle theme updates");
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
    const response = await apiFetch(`/api/projects/${projectId}/theme-updates/apply`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to apply theme update");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to apply theme update");
  }
}
