import { API_URL } from "../config";

/**
 * Get current application settings
 */
export async function getAppSettings() {
  try {
    const response = await fetch(API_URL("/api/settings"));
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
 * Save application settings
 */
export async function saveAppSettings(settingsData) {
  try {
    const response = await fetch(API_URL("/api/settings"), {
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
