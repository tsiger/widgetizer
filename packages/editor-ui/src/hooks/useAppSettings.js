import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getAppSettings, saveAppSettings } from "../queries/appSettingsManager.js";
import useToastStore from "../stores/toastStore.js";
import settingsSchema from "../config/appSettings.schema.json";

/**
 * Hook for managing application settings with caching, loading, and saving capabilities.
 * Handles fetching settings from the server, merging with schema defaults, and persisting changes.
 *
 * @returns {{
 *   settings: Object|null,
 *   loading: boolean,
 *   isSaving: boolean,
 *   hasChanges: boolean,
 *   schema: Object,
 *   handleInputChange: (settingKey: string, value: any) => void,
 *   handleSave: () => Promise<void>,
 *   handleCancel: () => void
 * }} Application settings state and handlers
 * @property {Object|null} settings - Current settings object (merged with schema defaults)
 * @property {boolean} loading - Whether settings are being fetched
 * @property {boolean} isSaving - Whether settings are being saved
 * @property {boolean} hasChanges - Whether settings differ from the original loaded values
 * @property {Object} schema - The settings schema with field definitions and defaults
 * @property {Function} handleInputChange - Update a setting value by key (supports dot notation)
 * @property {Function} handleSave - Persist current settings to the server
 * @property {Function} handleCancel - Revert settings to the original loaded values
 */

// One copy of the settings for every screen that uses this hook: mounting several
// at once makes one request, and the copy is reused for a minute. It lives at
// module level, outside the hook, so rendering never reads or changes it.
const CACHE_DURATION = 60000;
let cached = null; // { settings, at }
let inFlight = null;

/** The settings (schema defaults filled in), from the cache or the server. */
function loadSettings() {
  if (cached && Date.now() - cached.at < CACHE_DURATION) return Promise.resolve(cached.settings);
  inFlight ??= getAppSettings().then(
    (appSettings) => {
      inFlight = null;
      const settings = mergeWithDefaults(appSettings, settingsSchema.settings);
      cached = { settings, at: Date.now() };
      return settings;
    },
    (error) => {
      inFlight = null;
      throw error;
    },
  );
  return inFlight;
}

/** After a save, so screens mounted later start from what was saved. */
function rememberSettings(settings) {
  cached = { settings, at: Date.now() };
}

// Fill in schema defaults for settings that have no value
function mergeWithDefaults(loadedSettings, schemaSettings) {
  const merged = { ...loadedSettings };

  Object.entries(schemaSettings).forEach(([key, config]) => {
    const value = getNestedValue(merged, key);
    if (value === undefined || value === null) {
      setNestedValue(merged, key, config.default);
    }
  });

  return merged;
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Set nested value in object using dot notation
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  // Create nested structure if it doesn't exist
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

export default function useAppSettings() {
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const { i18n } = useTranslation();

  const hasChanges = useMemo(
    () => Boolean(settings && originalSettings) && JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  );

  useEffect(() => {
    let current = true;
    loadSettings()
      .then((loaded) => {
        if (!current) return;
        setSettings(loaded);
        setOriginalSettings(JSON.parse(JSON.stringify(loaded)));
      })
      .catch((error) => {
        // Every screen mounted together shares the failed request; one toast says so.
        if (current) showToast(error.message || "Failed to load settings", "error", { id: "app-settings-load-error" });
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [showToast]);

  const handleInputChange = (settingKey, value) => {
    setSettings((prev) => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      setNestedValue(newSettings, settingKey, value);
      return newSettings;
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      // Process settings according to schema types
      const processedSettings = processSettingsForSave(settings, settingsSchema.settings);

      const result = await saveAppSettings(processedSettings);
      const savedSettings = result.settings || processedSettings;

      setSettings(savedSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(savedSettings)));
      rememberSettings(savedSettings);

      // Update language if it changed
      if (savedSettings.general?.language) {
        i18n.changeLanguage(savedSettings.general.language);
      }

      showToast(result.message || "Settings saved successfully", "success");
    } catch (error) {
      showToast(error.message || "Failed to save settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
  };

  // Process settings before saving (convert strings to numbers, etc.)
  const processSettingsForSave = (settings, schemaSettings) => {
    const processed = JSON.parse(JSON.stringify(settings));

    Object.entries(schemaSettings).forEach(([key, config]) => {
      const value = getNestedValue(processed, key);

      if (value !== undefined && value !== null) {
        if (config.type === "number") {
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue)) {
            setNestedValue(processed, key, numValue);
          }
        }
      }
    });

    return processed;
  };

  return {
    settings,
    loading,
    isSaving,
    hasChanges,
    schema: settingsSchema,
    handleInputChange,
    handleSave,
    handleCancel,
  };
}
