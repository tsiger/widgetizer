import fs from "fs-extra";
import { validationResult } from "express-validator";
import { getAppSettingsPath } from "../config.js";

// Get the settings file path from centralized config
const settingsFilePath = getAppSettingsPath();

// Default settings in case the file is missing or corrupted
const defaultSettings = {
  general: {
    language: "en",
    dateFormat: "MM/DD/YYYY",
  },
  media: {
    maxFileSizeMB: 5,
    maxVideoSizeMB: 50, // Separate size limit for videos
    maxAudioSizeMB: 25, // Separate size limit for audio (MP3)
    imageProcessing: {
      quality: 85, // Single quality setting for all sizes (1-100)
      sizes: {
        thumb: { width: 150, enabled: true },
        small: { width: 480, enabled: true },
        medium: { width: 1024, enabled: true },
        large: { width: 1920, enabled: true },
      },
    },
  },
  export: {
    maxVersionsToKeep: 10, // Maximum number of export versions to keep per project
    maxImportSizeMB: 500, // Maximum size for project import ZIP files (in MB)
  },
};

/**
 * Reads the application settings file.
 * @returns {Promise<object>} The settings object.
 */
export async function readAppSettingsFile() {
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

/**
 * Retrieves all application settings.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAppSettings(req, res) {
  try {
    const settings = await readAppSettingsFile();
    res.json(settings);
  } catch {
    // Error handling is mostly done in readAppSettingsFile, this is a fallback
    res.status(500).json({ error: "Failed to get application settings." });
  }
}

/**
 * Updates application settings with validation for media and export options.
 * @param {import('express').Request} req - Express request object with settings in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateAppSettings(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const settings = req.body;
    const currentSettings = await readAppSettingsFile();
    // Basic validation: Ensure request body is an object
    if (typeof settings !== "object" || settings === null) {
      return res.status(400).json({ error: "Invalid request body: Expected an object." });
    }

    // Merge new settings - simple merge, could be deeper if needed
    // TODO: Add more robust validation/sanitization based on expected structure
    const newSettings = { ...currentSettings, ...settings };

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

    // Validation for imageProcessing settings
    if (newSettings.media && newSettings.media.imageProcessing) {
      const imgProcessing = newSettings.media.imageProcessing;

      // Validate quality (1-100)
      if (typeof imgProcessing.quality !== "undefined") {
        const quality = parseInt(imgProcessing.quality, 10);
        if (isNaN(quality) || quality < 1 || quality > 100) {
          return res.status(400).json({ error: "Invalid image quality. Must be between 1-100." });
        }
        imgProcessing.quality = quality;
      }

      // Validate sizes
      if (imgProcessing.sizes && typeof imgProcessing.sizes === "object") {
        for (const [sizeName, sizeConfig] of Object.entries(imgProcessing.sizes)) {
          if (sizeConfig && typeof sizeConfig === "object") {
            // Validate width
            if (typeof sizeConfig.width !== "undefined") {
              const width = parseInt(sizeConfig.width, 10);
              if (isNaN(width) || width <= 0) {
                return res
                  .status(400)
                  .json({ error: `Invalid width for size '${sizeName}'. Must be a positive number.` });
              }
              sizeConfig.width = width;
            }

            // Validate enabled flag
            if (typeof sizeConfig.enabled !== "undefined" && typeof sizeConfig.enabled !== "boolean") {
              return res.status(400).json({ error: `Invalid enabled flag for size '${sizeName}'. Must be boolean.` });
            }
          }
        }
      }
    }

    await writeAppSettingsFile(newSettings);
    res.json({ message: "Settings updated successfully", settings: newSettings });
  } catch (error) {
    // writeAppSettingsFile throws an error already
    res.status(500).json({ error: error.message || "Failed to update application settings." });
  }
}

/**
 * Retrieves a specific setting value by key path (e.g., "media.maxFileSizeMB").
 * Returns the default value if the key doesn't exist in settings.
 * @param {string} key - The dot-notation path to the setting
 * @returns {Promise<*>} The setting value or default
 */
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
