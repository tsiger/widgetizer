import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import { SettingsPanel } from "../components/settings";

import useToastStore from "../stores/toastStore";
import useThemeStore from "../stores/themeStore";
import useProjectStore from "../stores/projectStore";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function Settings() {
  const { t } = useTranslation();

  const settings = useThemeStore((s) => s.settings);
  const loading = useThemeStore((s) => s.loading);
  const hasChanges = useThemeStore((s) => s.hasUnsavedThemeChanges());
  const { loadSettings, updateThemeSetting, resetThemeSettings, saveSettings } = useThemeStore.getState();

  const { getDirtyTitle } = useGuardedFormPage(hasChanges);
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  useEffect(() => {
    if (!activeProject?.id) {
      useThemeStore.getState().resetForProjectChange();
      return;
    }

    // Only reload if the store is for a different project (or empty).
    // This preserves in-flight drafts when navigating back from the editor.
    const { loadedProjectId } = useThemeStore.getState();
    if (loadedProjectId !== activeProject.id) {
      loadSettings(activeProject.id);
    }
  }, [activeProject?.id, loadSettings]);

  /**
   * Converts nested settings structure to a flat object of values.
   * Needed for the SettingsPanel component which expects a flat values object.
   */
  const extractSettingsValues = (data) => {
    if (!data?.settings?.global) return {};

    const values = {};
    const { global } = data.settings;

    Object.keys(global).forEach((groupKey) => {
      global[groupKey].forEach((setting) => {
        values[setting.id] = setting.value !== undefined ? setting.value : setting.default;
      });
    });

    return values;
  };

  const handleSettingChange = (id, value) => {
    if (!settings) return;

    // Find which group this setting belongs to
    const { global } = settings.settings;
    for (const groupKey of Object.keys(global)) {
      const settingIndex = global[groupKey].findIndex((s) => s.id === id);
      if (settingIndex !== -1) {
        updateThemeSetting(groupKey, id, value);
        return;
      }
    }
  };

  const handleSave = async () => {
    const projectAtSaveStart = useProjectStore.getState().activeProject;
    if (!projectAtSaveStart?.id) return;

    try {
      const result = await saveSettings(projectAtSaveStart.id);

      // Drop the response if the active project changed during the save
      if (useProjectStore.getState().activeProject?.id !== projectAtSaveStart.id) return;

      if (result?.warnings?.length) {
        showToast(result.warnings.join(" "), "warning");
      } else {
        showToast(t("themeSettings.toasts.saveSuccess"), "success");
      }
    } catch (error) {
      if (useProjectStore.getState().activeProject?.id !== projectAtSaveStart.id) return;
      console.error("Failed to save theme settings:", error);
      showToast(t("themeSettings.toasts.saveError"), "error");
    }
  };

  const handleCancel = () => {
    resetThemeSettings();
  };

  if (loading) {
    return (
      <PageLayout title={t("themeSettings.title")}>
        <LoadingSpinner message={t("themeSettings.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={getDirtyTitle(t("themeSettings.title"))}
      additionalButtons={
        <Button onClick={handleCancel} variant="secondary" disabled={!hasChanges}>
          {t("common.reset")}
        </Button>
      }
      buttonProps={{
        onClick: handleSave,
        disabled: loading || !settings || !hasChanges,
        variant: hasChanges ? "dark" : "primary",
        children: (
          <>
            {t("common.save")}
            {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
          </>
        ),
      }}
    >
      <>
        {/* Settings panel container */}
        <div className="bg-white border border-t-0 border-slate-200">
          {settings ? (
            <SettingsPanel
              schema={settings.settings.global}
              values={extractSettingsValues(settings)}
              onChange={handleSettingChange}
            />
          ) : (
            <div className="p-6 text-center text-slate-500">{t("themeSettings.noSettings")}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={handleCancel} variant="secondary" disabled={!hasChanges}>
            {t("common.reset")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !settings || !hasChanges}
            variant={hasChanges ? "dark" : "primary"}
          >
            {t("common.save")}
            {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
          </Button>
        </div>
      </>
    </PageLayout>
  );
}
