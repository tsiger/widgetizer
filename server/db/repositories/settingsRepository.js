import { getDb } from "../index.js";

/**
 * Deep merge two plain objects. Source values override target values.
 * Arrays and non-plain-objects are replaced, not merged.
 * @param {object} target
 * @param {object} source
 * @returns {object} New merged object
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) &&
      tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}

// Default settings — same as appSettingsController.js
const defaultSettings = {
  general: {
    language: "en",
    dateFormat: "MMMM D, YYYY h:mm A",
  },
  media: {
    maxFileSizeMB: 5,
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

const SETTINGS_KEY = "config:local";

/**
 * Read application settings, merged with defaults.
 * @returns {object} Settings object
 */
export function getSettings() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(SETTINGS_KEY);
  if (!row || !row.value) return deepMerge({}, defaultSettings);

  try {
    const loaded = JSON.parse(row.value);
    return deepMerge(defaultSettings, loaded);
  } catch {
    return deepMerge({}, defaultSettings);
  }
}

/**
 * Save application settings.
 * @param {object} settings - The full settings object
 */
export function saveSettings(settings) {
  const db = getDb();
  const key = SETTINGS_KEY;
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ key, value: JSON.stringify(settings) });
}

/**
 * Get a specific setting by dot-notation key path.
 * Falls back to defaults if the key doesn't exist.
 * @param {string} key - Dot-notation path (e.g., "media.maxFileSizeMB")
 * @returns {*} The setting value
 */
export function getSetting(key) {
  const settings = getSettings();
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
