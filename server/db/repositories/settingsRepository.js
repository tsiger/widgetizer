import { getDb } from "../index.js";

// Default settings — same as appSettingsController.js
const defaultSettings = {
  general: {
    language: "en",
    dateFormat: "MM/DD/YYYY",
  },
  media: {
    maxFileSizeMB: 5,
    maxVideoSizeMB: 50,
    maxAudioSizeMB: 25,
    imageProcessing: {
      quality: 85,
      sizes: {
        thumb: { width: 150, enabled: true },
        small: { width: 480, enabled: true },
        medium: { width: 1024, enabled: true },
        large: { width: 1920, enabled: true },
      },
    },
  },
  export: {
    maxVersionsToKeep: 10,
    maxImportSizeMB: 500,
  },
  developer: {
    enabled: false,
  },
};

/**
 * Build the per-user settings key.
 * @param {string} userId
 * @returns {string}
 */
function settingsKey(userId) {
  return `config:${userId}`;
}

/**
 * Read application settings for a user, merged with defaults.
 * @param {string} userId - User ID (defaults to "local" for open-source mode)
 * @returns {object} Settings object
 */
export function getSettings(userId = "local") {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(settingsKey(userId));
  if (!row || !row.value) return { ...defaultSettings };

  try {
    const loaded = JSON.parse(row.value);
    return { ...defaultSettings, ...loaded };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Save application settings for a user.
 * @param {object} settings - The full settings object
 * @param {string} userId - User ID (defaults to "local" for open-source mode)
 */
export function saveSettings(settings, userId = "local") {
  const db = getDb();
  const key = settingsKey(userId);
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ key, value: JSON.stringify(settings) });
}

/**
 * Get a specific setting by dot-notation key path.
 * Falls back to defaults if the key doesn't exist.
 * @param {string} key - Dot-notation path (e.g., "media.maxFileSizeMB")
 * @param {string} userId - User ID (defaults to "local" for open-source mode)
 * @returns {*} The setting value
 */
export function getSetting(key, userId = "local") {
  const settings = getSettings(userId);
  const keys = key.split(".");
  let value = settings;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Look up default
      let defaultValue = defaultSettings;
      for (const dk of keys) {
        if (defaultValue && typeof defaultValue === "object" && dk in defaultValue) {
          defaultValue = defaultValue[dk];
        } else {
          return null;
        }
      }
      return defaultValue;
    }
  }
  return value;
}

export { defaultSettings };
