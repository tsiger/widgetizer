import { useState, useEffect } from "react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import { SettingsPanel } from "../components/settings";

import useToastStore from "../stores/toastStore";

import { getThemeSettings, saveThemeSettings } from "../queries/themeManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function Settings() {
  const [themeData, setThemeData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Add navigation guard
  useFormNavigationGuard(hasChanges);

  // Get the showToast function from the toast store
  const showToast = useToastStore((state) => state.showToast);

  // Load theme settings
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        setLoading(true);

        // Load theme data
        const data = await getThemeSettings();
        setThemeData(data);
        setOriginalData(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
      } catch {
        showToast("Failed to load theme settings. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadThemeSettings();
  }, [showToast]);

  // Track changes
  useEffect(() => {
    if (themeData && originalData) {
      setHasChanges(JSON.stringify(themeData) !== JSON.stringify(originalData));
    }
  }, [themeData, originalData]);

  /**
   * Converts nested settings structure to a flat object of values
   * This is needed for the SettingsPanel component which expects a flat values object
   */
  const extractSettingsValues = (data) => {
    if (!data || !data.settings || !data.settings.global) return {};

    const values = {};
    const { global } = data.settings;

    Object.keys(global).forEach((groupKey) => {
      global[groupKey].forEach((setting) => {
        values[setting.id] = setting.value !== undefined ? setting.value : setting.default;
      });
    });

    return values;
  };

  /**
   * Updates a single setting value in the theme data state
   * Called when user changes a setting in the UI
   */
  const handleSettingChange = (id, value) => {
    if (!themeData) return;

    setThemeData((prevData) => {
      const newData = { ...prevData };
      const { global } = newData.settings;

      // Find and update the setting in the nested structure
      Object.keys(global).forEach((groupKey) => {
        const settingIndex = global[groupKey].findIndex((s) => s.id === id);
        if (settingIndex !== -1) {
          global[groupKey][settingIndex].value = value;
        }
      });

      return newData;
    });
  };

  /**
   * Saves all theme settings to the server
   * Displays success/error notifications
   */
  const handleSave = async () => {
    try {
      await saveThemeSettings(themeData);
      setOriginalData(JSON.parse(JSON.stringify(themeData))); // Update original data
      setHasChanges(false);
      showToast("Theme settings saved successfully!", "success");
    } catch {
      showToast("Failed to save theme settings. Please try again.", "error");
    }
  };

  const handleCancel = () => {
    setThemeData(JSON.parse(JSON.stringify(originalData)));
    setHasChanges(false);
  };

  if (loading) {
    return (
      <PageLayout title="Theme settings">
        <LoadingSpinner message="Loading settings..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Theme settings">
      <>
        {/* Settings panel container */}
        <div className="bg-white rounded-md border border-t-0 border-slate-200">
          {themeData ? (
            <SettingsPanel
              schema={themeData.settings.global}
              values={extractSettingsValues(themeData)}
              onChange={handleSettingChange}
            />
          ) : (
            <div className="p-6 text-center text-slate-500">No theme settings available</div>
          )}
        </div>

        {/* Save button */}
        <div className="mt-6 flex justify-end gap-3">
          {hasChanges && (
            <Button onClick={handleCancel} variant="secondary">
              Cancel
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={loading || !themeData || !hasChanges} variant="primary">
            Save Settings
          </Button>
          
          {hasChanges && (
            <span className="text-sm text-amber-600 self-center ml-2">
              You have unsaved changes
            </span>
          )}
        </div>
      </>
    </PageLayout>
  );
}
