import { apiFetch } from "../lib/apiFetch";

/**
 * @typedef {Object} AppSettings
 * @property {string} [language] - UI language code (e.g., 'en', 'de')
 * @property {string} [theme] - UI theme ('light', 'dark', 'system')
 * @property {boolean} [autoSave] - Whether to auto-save changes
 * @property {number} [autoSaveInterval] - Auto-save interval in milliseconds
 * @property {string} [exportPath] - Default export directory path
 * @property {Object} [editor] - Editor-specific settings
 */

/**
 * Fetch current application settings.
 * @returns {Promise<AppSettings>} The current application settings
 * @throws {Error} If the API request fails
 */
export async function getAppSettings() {
  try {
    const response = await apiFetch("/api/settings");
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch application settings");
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting application settings:", error);
    throw error; // Re-throw for component to handle
  }
}

/**
 * Save application settings.
 * Partial updates are supported - only provided fields will be updated.
 * @param {Partial<AppSettings>} settingsData - The settings to save
 * @returns {Promise<{message: string, settings: AppSettings}>} Save confirmation with updated settings
 * @throws {Error} If the save fails
 */
export async function saveAppSettings(settingsData) {
  try {
    const response = await apiFetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save application settings");
    }

    return await response.json(); // Contains { message, settings }
  } catch (error) {
    console.error("Error saving application settings:", error);
    throw error; // Re-throw for component to handle
  }
}
