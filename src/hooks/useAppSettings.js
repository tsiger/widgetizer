import { useState, useEffect } from "react";
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

// Cache for settings to prevent multiple simultaneous fetches
let settingsCache = null;
let settingsCachePromise = null;
let settingsCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export default function useAppSettings() {
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if settings have changed from original
  useEffect(() => {
    if (settings && originalSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
    }
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    // Check cache first
    const now = Date.now();
    if (settingsCache && now - settingsCacheTime < CACHE_DURATION) {
      setSettings(settingsCache);
      setOriginalSettings(JSON.parse(JSON.stringify(settingsCache)));
      setLoading(false);
      return;
    }

    // If there's already a fetch in progress, wait for it
    if (settingsCachePromise) {
      try {
        const cachedSettings = await settingsCachePromise;
        setSettings(cachedSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(cachedSettings)));
        setLoading(false);
        return;
      } catch {
        // If cached promise fails, continue to fetch
      }
    }

    setLoading(true);

    // Create a shared promise for concurrent requests
    settingsCachePromise = (async () => {
      try {
        const appSettings = await getAppSettings();

        // Merge with defaults from schema
        const settingsWithDefaults = mergeWithDefaults(appSettings, settingsSchema.settings);

        // Update cache
        settingsCache = settingsWithDefaults;
        settingsCacheTime = Date.now();
        settingsCachePromise = null;

        return settingsWithDefaults;
      } catch (error) {
        settingsCachePromise = null;
        throw error;
      }
    })();

    try {
      const settingsWithDefaults = await settingsCachePromise;
      setSettings(settingsWithDefaults);
      setOriginalSettings(JSON.parse(JSON.stringify(settingsWithDefaults)));
    } catch (error) {
      showToast(error.message || "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  // Merge loaded settings with schema defaults
  const mergeWithDefaults = (loadedSettings, schemaSettings) => {
    const merged = { ...loadedSettings };

    Object.entries(schemaSettings).forEach(([key, config]) => {
      const value = getNestedValue(merged, key);
      if (value === undefined || value === null) {
        setNestedValue(merged, key, config.default);
      }
    });

    return merged;
  };

  // Get nested value from object using dot notation
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  // Set nested value in object using dot notation
  const setNestedValue = (obj, path, value) => {
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
  };

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
      setHasChanges(false);

      // Invalidate cache so other components get fresh data
      settingsCache = savedSettings;
      settingsCacheTime = Date.now();

      // Update language if it changed
      if (savedSettings.general?.language) {
        import("../i18n").then((module) => {
          module.default.changeLanguage(savedSettings.general.language);
        });
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
    setHasChanges(false);
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
