import { API_URL } from "../config";
import { getActiveProject } from "./projectManager";

/**
 * @typedef {Object} Theme
 * @property {string} id - Unique theme identifier
 * @property {string} name - Theme display name
 * @property {string} [description] - Theme description
 * @property {string} version - Current theme version
 * @property {string} [author] - Theme author
 * @property {boolean} [hasUpdate] - Whether an update is available
 * @property {string} [latestVersion] - Latest available version
 * @property {string} screenshotUrl - URL to theme screenshot
 */

/**
 * @typedef {Object} Widget
 * @property {string} id - Widget identifier
 * @property {string} name - Widget display name
 * @property {string} [description] - Widget description
 * @property {Object} schema - JSON schema for widget settings
 * @property {string} [icon] - Widget icon identifier
 */

/**
 * @typedef {Object} Template
 * @property {string} id - Template identifier
 * @property {string} name - Template display name
 * @property {string} [description] - Template description
 * @property {string[]} [regions] - Available content regions
 */

/**
 * @typedef {Object} ThemeSettings
 * @property {Object} colors - Color configuration
 * @property {Object} typography - Typography settings
 * @property {Object} layout - Layout options
 * @property {Object} [custom] - Theme-specific custom settings
 */

/**
 * Fetch all available themes.
 * @returns {Promise<Theme[]>} Array of theme objects
 * @throws {Error} If the API request fails
 */
export async function getAllThemes() {
  try {
    const response = await fetch(API_URL("/api/themes"));
    if (!response.ok) {
      throw new Error("Failed to fetch themes");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting themes:", error);
    throw new Error("Failed to get themes");
  }
}

/**
 * Generate the URL for a theme's screenshot image.
 * @param {string} themeId - The ID of the theme
 * @returns {string} The full URL to the theme screenshot
 */
export function getThemeScreenshotUrl(themeId) {
  return API_URL(`/themes/${themeId}/screenshot.png`);
}

/**
 * Fetch a specific theme by its ID.
 * @param {string} themeId - The ID of the theme to retrieve
 * @returns {Promise<Theme>} The theme object with full details
 * @throws {Error} If the theme is not found or request fails
 */
export async function getTheme(themeId) {
  try {
    const response = await fetch(API_URL(`/api/themes/${themeId}`));
    if (!response.ok) {
      throw new Error("Failed to fetch theme");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting theme:", error);
    throw new Error("Failed to get theme");
  }
}

/**
 * Fetch available widgets for a theme.
 * Widgets are the building blocks for page content.
 * @param {string} [themeId] - The theme ID (uses active project's theme if not provided)
 * @returns {Promise<Widget[]>} Array of widget definitions with schemas
 * @throws {Error} If the API request fails
 */
export async function getThemeWidgets(themeId) {
  try {
    // If no themeId is provided, use the active project's theme
    const response = await fetch(API_URL(`/api/themes/${themeId || "default"}/widgets`));
    if (!response.ok) {
      throw new Error("Failed to fetch theme widgets");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting theme widgets:", error);
    throw new Error("Failed to get theme widgets");
  }
}

/**
 * Fetch available page templates for a theme.
 * Templates define page layouts and available content regions.
 * @param {string} [themeId] - The theme ID (uses default if not provided)
 * @returns {Promise<Template[]>} Array of template definitions
 * @throws {Error} If the API request fails
 */
export async function getThemeTemplates(themeId) {
  try {
    const response = await fetch(API_URL(`/api/themes/${themeId || "default"}/templates`));
    if (!response.ok) {
      throw new Error("Failed to fetch theme templates");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting theme templates:", error);
    throw new Error("Failed to get theme templates");
  }
}

/**
 * Fetch the theme settings for the active project.
 * Includes colors, typography, layout, and custom options.
 * @returns {Promise<ThemeSettings>} The current theme settings
 * @throws {Error} If no active project or request fails
 */
export async function getThemeSettings() {
  try {
    const activeProject = await getActiveProject();

    if (!activeProject) {
      throw new Error("No active project");
    }

    const response = await fetch(API_URL(`/api/themes/project/${activeProject.id}`));

    if (!response.ok) {
      throw new Error("Failed to fetch theme settings");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching theme settings:", error);
    throw error;
  }
}

/**
 * Save theme settings for the active project.
 * @param {ThemeSettings} data - The theme settings to save
 * @returns {Promise<{success: boolean, settings: ThemeSettings}>} Save confirmation with updated settings
 * @throws {Error} If no active project or save fails
 */
export async function saveThemeSettings(data) {
  try {
    const activeProject = await getActiveProject();

    if (!activeProject) {
      throw new Error("No active project");
    }

    const response = await fetch(API_URL(`/api/themes/project/${activeProject.id}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to save theme settings");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving theme settings:", error);
    throw error;
  }
}

/**
 * Upload and install a theme from a ZIP file.
 * The ZIP should contain a valid theme structure with config and templates.
 * @param {File} zipFile - The theme ZIP file to upload
 * @returns {Promise<{message: string, theme: Theme|null}>} Upload result with installed theme
 * @throws {Error} If the ZIP is invalid or upload fails
 */
export async function uploadThemeZip(zipFile) {
  const formData = new FormData();
  formData.append("themeZip", zipFile);

  try {
    const response = await fetch(API_URL("/api/themes/upload"), {
      method: "POST",
      body: formData,
      // Note: Don't set Content-Type header when using FormData,
      // the browser will set it correctly with the boundary
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to upload theme");
    }

    // The response now contains { message: string, theme: object | null }
    return await response.json();
  } catch (error) {
    console.error("Error uploading theme zip:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
  // TODO: Implement actual progress tracking
}

/**
 * Fetch all available versions for a theme.
 * @param {string} themeId - The ID of the theme
 * @returns {Promise<Array<{version: string, createdAt: string, changelog?: string}>>} Array of version info
 * @throws {Error} If the API request fails
 */
export async function getThemeVersions(themeId) {
  try {
    const response = await fetch(API_URL(`/api/themes/${themeId}/versions`));
    if (!response.ok) {
      throw new Error("Failed to fetch theme versions");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting theme versions:", error);
    throw new Error("Failed to get theme versions");
  }
}

/**
 * Get the count of themes that have updates available.
 * Used for displaying update badges in the UI.
 * @returns {Promise<{count: number}>} Object with update count
 */
export async function getThemeUpdateCount() {
  try {
    const response = await fetch(API_URL("/api/themes/update-count"));
    if (!response.ok) {
      throw new Error("Failed to fetch theme update count");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting theme update count:", error);
    return { count: 0 };
  }
}

/**
 * Update a theme to the latest version.
 * Builds a new snapshot from the latest theme files.
 * @param {string} themeId - The ID of the theme to update
 * @returns {Promise<{success: boolean, theme: Theme, previousVersion: string, newVersion: string}>} Update result
 * @throws {Error} If the update fails
 */
export async function updateTheme(themeId) {
  try {
    const response = await fetch(API_URL(`/api/themes/${themeId}/update`), {
      method: "POST",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update theme");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating theme:", error);
    throw error;
  }
}

/**
 * Delete a theme from the system.
 * Prevents deletion if the theme is currently in use by any projects.
 * @param {string} themeId - The ID of the theme to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion result
 * @throws {Error} If theme is in use (409) or deletion fails
 */
export async function deleteTheme(themeId) {
  try {
    const response = await fetch(API_URL(`/api/themes/${themeId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || "Failed to delete theme");
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting theme:", error);
    throw error;
  }
}
