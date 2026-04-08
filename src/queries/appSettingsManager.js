import { apiFetchJson, rethrowQueryError } from "../lib/apiFetch";

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
    return await apiFetchJson("/api/settings", {}, {
      fallbackMessage: "Failed to fetch application settings",
    });
  } catch (error) {
    console.error("Error getting application settings:", error);
    rethrowQueryError(error, "Failed to fetch application settings");
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
    return await apiFetchJson("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settingsData),
    }, { fallbackMessage: "Failed to save application settings" });
  } catch (error) {
    console.error("Error saving application settings:", error);
    rethrowQueryError(error, "Failed to save application settings");
  }
}
