import { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout.jsx";
import SettingsField from "../components/settings/SettingsField.jsx";
import TextInput from "../components/settings/inputs/TextInput.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import Button from "../components/ui/Button.jsx";
import useToastStore from "../stores/toastStore.js";
import { getAppSettings, saveAppSettings } from "../utils/appSettingsManager.js";

export default function AppSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const appSettings = await getAppSettings();
      setSettings(appSettings);
    } catch (error) {
      showToast(error.message || "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value, name) => {
    const keys = name.split(".");
    setSettings((prev) => {
      const newSettings = { ...prev };
      let currentLevel = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        currentLevel[keys[i]] = { ...currentLevel[keys[i]] };
        currentLevel = currentLevel[keys[i]];
      }
      currentLevel[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleSizeToggle = (sizeName, enabled) => {
    setSettings((prev) => {
      const currentSizes = prev.media?.imageProcessing?.sizes || {};
      const defaultSizes = {
        thumb: { width: 150, enabled: true },
        small: { width: 480, enabled: true },
        medium: { width: 1024, enabled: true },
        large: { width: 1920, enabled: true },
      };

      return {
        ...prev,
        media: {
          ...prev.media,
          imageProcessing: {
            ...prev.media?.imageProcessing,
            sizes: {
              ...currentSizes,
              [sizeName]: {
                width: currentSizes[sizeName]?.width || defaultSizes[sizeName]?.width || 150,
                enabled,
              },
            },
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      // Ensure complete size configurations
      const defaultSizes = {
        thumb: { width: 150, enabled: true },
        small: { width: 480, enabled: true },
        medium: { width: 1024, enabled: true },
        large: { width: 1920, enabled: true },
      };

      const currentSizes = settings.media?.imageProcessing?.sizes || {};
      const completeSizes = {};

      // Merge defaults with current settings to ensure complete configs
      Object.keys(defaultSizes).forEach((sizeName) => {
        completeSizes[sizeName] = {
          width: parseInt(currentSizes[sizeName]?.width || defaultSizes[sizeName].width, 10),
          enabled: currentSizes[sizeName]?.enabled !== false, // default to true
        };
      });

      const settingsToSave = {
        ...settings,
        media: {
          ...settings.media,
          maxFileSizeMB: parseInt(settings.media?.maxFileSizeMB || "1", 10) || 1,
          imageProcessing: {
            quality: parseInt(settings.media?.imageProcessing?.quality || "85", 10) || 85,
            sizes: completeSizes,
          },
        },
      };

      const result = await saveAppSettings(settingsToSave);
      setSettings(result.settings);
      showToast(result.message || "Settings saved successfully", "success");
    } catch (error) {
      showToast(error.message || "Failed to save settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="General Settings">
        <LoadingSpinner message="Loading settings..." />
      </PageLayout>
    );
  }

  if (!settings) {
    return (
      <PageLayout title="General Settings">
        <p className="text-red-500">Could not load settings.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="General Settings">
      <div className="space-y-6 bg-white p-6 border border-slate-200 rounded-sm">
        <SettingsField
          id="maxFileSize"
          label="Max Upload File Size (MB)"
          description="Set the maximum size for individual file uploads across all projects."
        >
          <TextInput
            type="number"
            id="maxFileSize"
            name="media.maxFileSizeMB"
            value={settings.media?.maxFileSizeMB || ""}
            onChange={(newValue) => handleInputChange(newValue, "media.maxFileSizeMB")}
            min="1"
          />
        </SettingsField>

        {/* Image Processing Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">Image Processing</h3>

          <SettingsField
            id="imageQuality"
            label="Image Quality"
            description="Quality setting for all generated image sizes (1-100). Higher values mean better quality but larger file sizes."
          >
            <TextInput
              type="number"
              id="imageQuality"
              name="media.imageProcessing.quality"
              value={settings.media?.imageProcessing?.quality || "85"}
              onChange={(newValue) => handleInputChange(newValue, "media.imageProcessing.quality")}
              min="1"
              max="100"
            />
          </SettingsField>

          <SettingsField
            id="imageSizes"
            label="Image Sizes"
            description="Configure the different image sizes generated during upload. Toggle sizes on/off and adjust their maximum width."
          >
            <div className="space-y-3">
              {(() => {
                // Always show all sizes, merge with defaults
                const defaultSizes = {
                  thumb: { width: 150, enabled: true },
                  small: { width: 480, enabled: true },
                  medium: { width: 1024, enabled: true },
                  large: { width: 1920, enabled: true },
                };

                const currentSizes = settings.media?.imageProcessing?.sizes || {};
                const allSizes = { ...defaultSizes };

                // Merge current settings with defaults
                Object.keys(defaultSizes).forEach((sizeName) => {
                  if (currentSizes[sizeName]) {
                    allSizes[sizeName] = {
                      ...defaultSizes[sizeName],
                      ...currentSizes[sizeName],
                    };
                  }
                });

                return Object.entries(allSizes).map(([sizeName, sizeConfig]) => (
                  <div
                    key={sizeName}
                    className={`flex items-center gap-4 p-3 border rounded transition-opacity ${
                      sizeConfig.enabled !== false
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`size-${sizeName}`}
                        checked={sizeConfig.enabled !== false}
                        onChange={(e) => handleSizeToggle(sizeName, e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`size-${sizeName}`} className="font-medium text-slate-700 capitalize min-w-16">
                        {sizeName}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Width:</label>
                      <TextInput
                        type="number"
                        name={`media.imageProcessing.sizes.${sizeName}.width`}
                        value={sizeConfig.width || ""}
                        onChange={(newValue) =>
                          handleInputChange(newValue, `media.imageProcessing.sizes.${sizeName}.width`)
                        }
                        min="1"
                        disabled={sizeConfig.enabled === false}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-500">px</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </SettingsField>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <Button onClick={handleSave} disabled={isSaving} variant="primary">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
