import { useState, useEffect } from "react";
import { getAppSettings, saveAppSettings } from "../queries/appSettingsManager.js";
import useToastStore from "../stores/toastStore.js";
import settingsSchema from "../config/appSettings.schema.json";

export default function useAppSettings() {
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Check if settings have changed from original
  useEffect(() => {
    if (settings && originalSettings) {
      setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
    }
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const appSettings = await getAppSettings();

      // Merge with defaults from schema
      const settingsWithDefaults = mergeWithDefaults(appSettings, settingsSchema.settings);

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
