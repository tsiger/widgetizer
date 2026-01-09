import { API_URL } from "../config";
import { getActiveProject } from "./projectManager";

/**
 * Get all themes
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
 * Get the theme screenshot URL
 */
export function getThemeScreenshotUrl(themeId) {
  return API_URL(`/themes/${themeId}/screenshot.png`);
}

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
 * Get the theme widgets
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
 * Get the theme templates
 * @param {string} themeId - The theme id
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
 * Get the theme settings
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
 * Save the theme settings
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
 * Upload a theme zip file
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
