import {
  getSettings,
  saveSettings,
  getSetting as repoGetSetting,
  defaultSettings,
  deepMerge,
} from "../db/repositories/settingsRepository.js";
import { EDITOR_LIMITS } from "../limits.js";
import { clampToCeiling } from "../utils/limitChecks.js";

/**
 * Reads the application settings (merged with defaults).
 * @param {string} userId - User ID (defaults to "local" for open-source mode)
 * @returns {Promise<object>} The settings object
 */
export async function readAppSettingsFile(userId = "local") {
  return getSettings(userId);
}

/**
 * Retrieves all application settings.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getAppSettings(req, res) {
  try {
    const settings = getSettings(req.userId);
    res.json(settings);
  } catch {
    res.status(500).json({ error: "Failed to get application settings." });
  }
}

/**
 * Updates application settings with validation for media and export options.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function updateAppSettings(req, res) {
  try {
    const settings = req.body;
    const currentSettings = getSettings(req.userId);

    if (typeof settings !== "object" || settings === null) {
      return res.status(400).json({ error: "Invalid request body: Expected an object." });
    }

    const newSettings = deepMerge(currentSettings, settings);

    // Specific validation for maxFileSizeMB
    if (newSettings.media && typeof newSettings.media.maxFileSizeMB !== "number") {
      const parsedSize = parseInt(newSettings.media.maxFileSizeMB, 10);
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return res.status(400).json({ error: "Invalid Max File Size. Must be a positive number." });
      }
      newSettings.media.maxFileSizeMB = parsedSize;
    } else if (!newSettings.media) {
      newSettings.media = defaultSettings.media;
    }

    // Validation for imageProcessing settings
    if (newSettings.media && newSettings.media.imageProcessing) {
      const imgProcessing = newSettings.media.imageProcessing;

      if (typeof imgProcessing.quality !== "undefined") {
        const quality = parseInt(imgProcessing.quality, 10);
        if (isNaN(quality) || quality < 1 || quality > 100) {
          return res.status(400).json({ error: "Invalid image quality. Must be between 1-100." });
        }
        imgProcessing.quality = quality;
      }

      if (imgProcessing.sizes && typeof imgProcessing.sizes === "object") {
        for (const [sizeName, sizeConfig] of Object.entries(imgProcessing.sizes)) {
          if (sizeConfig && typeof sizeConfig === "object") {
            if (typeof sizeConfig.width !== "undefined") {
              const width = parseInt(sizeConfig.width, 10);
              if (isNaN(width) || width <= 0) {
                return res
                  .status(400)
                  .json({ error: `Invalid width for size '${sizeName}'. Must be a positive number.` });
              }
              sizeConfig.width = width;
            }

            if (typeof sizeConfig.enabled !== "undefined" && typeof sizeConfig.enabled !== "boolean") {
              return res.status(400).json({ error: `Invalid enabled flag for size '${sizeName}'. Must be boolean.` });
            }
          }
        }
      }
    }

    // Clamp user-configurable values to platform ceilings (hosted mode only —
    // self-hosted users control their own instance and can set any values).
    if (req.app.locals.hostedMode) {
      if (newSettings.media) {
        newSettings.media.maxFileSizeMB = clampToCeiling(newSettings.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
        newSettings.media.maxVideoSizeMB = clampToCeiling(newSettings.media.maxVideoSizeMB, EDITOR_LIMITS.media.maxVideoSizeMBCeiling);
        newSettings.media.maxAudioSizeMB = clampToCeiling(newSettings.media.maxAudioSizeMB, EDITOR_LIMITS.media.maxAudioSizeMBCeiling);
      }
      if (newSettings.export) {
        newSettings.export.maxImportSizeMB = clampToCeiling(newSettings.export.maxImportSizeMB, EDITOR_LIMITS.maxImportSizeMBCeiling);
        newSettings.export.maxVersionsToKeep = clampToCeiling(newSettings.export.maxVersionsToKeep, EDITOR_LIMITS.maxExportVersionsCeiling);
      }
    }

    saveSettings(newSettings, req.userId);
    res.json({ message: "Settings updated successfully", settings: newSettings });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update application settings." });
  }
}

/**
 * Retrieves a specific setting value by key path (e.g., "media.maxFileSizeMB").
 * @param {string} key
 * @param {string} userId - User ID (defaults to "local" for open-source mode)
 * @returns {Promise<*>}
 */
export async function getSetting(key, userId = "local") {
  return repoGetSetting(key, userId);
}
