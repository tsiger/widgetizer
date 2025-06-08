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

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        media: {
          ...settings.media,
          maxFileSizeMB: parseInt(settings.media?.maxFileSizeMB || "1", 10) || 1,
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

        <div className="pt-4 border-t border-slate-200">
          <Button onClick={handleSave} disabled={isSaving} variant="primary">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
