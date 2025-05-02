import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Helper to get the path to the settings file
// TODO: Fixed path. Maybe add it in config.js?
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const settingsFilePath = path.join(__dirname, "../../data/appSettings.json");

// Default settings in case the file is missing or corrupted
const defaultSettings = {
  media: {
    maxFileSizeMB: 5,
  },
};

/**
 * Reads the application settings file.
 * @returns {Promise<object>} The settings object.
 */
async function readAppSettingsFile() {
  try {
    // Ensure the file exists, create with defaults if not
    if (!(await fs.pathExists(settingsFilePath))) {
      await fs.outputFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    const data = await fs.readFile(settingsFilePath, "utf8");
    // Combine defaults with loaded settings to ensure all keys exist
    const loadedSettings = JSON.parse(data);
    return { ...defaultSettings, ...loadedSettings };
  } catch (error) {
    console.error("Error reading app settings file:", error);
    // Return defaults in case of read/parse error
    return defaultSettings;
  }
}

/**
 * Writes data to the application settings file.
 * @param {object} settingsData - The settings object to save.
 * @returns {Promise<void>}
 */
async function writeAppSettingsFile(settingsData) {
  try {
    await fs.outputFile(settingsFilePath, JSON.stringify(settingsData, null, 2));
  } catch (error) {
    console.error("Error writing app settings file:", error);
    throw new Error("Failed to write application settings.");
  }
}

// Controller function to get settings
export async function getAppSettings(req, res) {
  try {
    const settings = await readAppSettingsFile();
    res.json(settings);
  } catch (error) {
    // Error handling is mostly done in readAppSettingsFile, this is a fallback
    res.status(500).json({ error: "Failed to get application settings." });
  }
}

// Controller function to update settings
export async function updateAppSettings(req, res) {
  try {
    const currentSettings = await readAppSettingsFile();
    // Basic validation: Ensure request body is an object
    if (typeof req.body !== "object" || req.body === null) {
      return res.status(400).json({ error: "Invalid request body: Expected an object." });
    }

    // Merge new settings - simple merge, could be deeper if needed
    // TODO: Add more robust validation/sanitization based on expected structure
    const newSettings = { ...currentSettings, ...req.body };

    // Specific validation for maxFileSizeMB
    if (newSettings.media && typeof newSettings.media.maxFileSizeMB !== "number") {
      // Attempt to parse if it's a string number
      const parsedSize = parseInt(newSettings.media.maxFileSizeMB, 10);
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return res.status(400).json({ error: "Invalid Max File Size. Must be a positive number." });
      }
      newSettings.media.maxFileSizeMB = parsedSize;
    } else if (!newSettings.media) {
      // Ensure media object exists if body only contained other keys
      newSettings.media = defaultSettings.media;
    }

    await writeAppSettingsFile(newSettings);
    res.json({ message: "Settings updated successfully", settings: newSettings });
  } catch (error) {
    // writeAppSettingsFile throws an error already
    res.status(500).json({ error: error.message || "Failed to update application settings." });
  }
}

// Helper function to get a specific setting value (useful for other controllers)
// Reads the file every time to ensure freshness, could be cached if needed
export async function getSetting(key) {
  const settings = await readAppSettingsFile();
  // Basic dot notation access, could be made more robust
  const keys = key.split(".");
  let value = settings;
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Return null or default if key path doesn't exist
      // Look up default based on key path
      let defaultValue = defaultSettings;
      for (const dk of keys) {
        if (defaultValue && typeof defaultValue === "object" && dk in defaultValue) {
          defaultValue = defaultValue[dk];
        } else {
          return null; // Key path not even in defaults
        }
      }
      return defaultValue;
    }
  }
  return value;
}
