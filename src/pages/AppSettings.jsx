import PageLayout from "../components/layout/PageLayout.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import Button from "../components/ui/Button.jsx";
import AppSettingsPanel from "../components/settings/AppSettingsPanel.jsx";
import useAppSettings from "../hooks/useAppSettings.js";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";
import { useTranslation } from "react-i18next";

export default function AppSettings() {
  const { t } = useTranslation();
  const { settings, loading, isSaving, hasChanges, schema, handleInputChange, handleSave, handleCancel } =
    useAppSettings();

  // Add navigation guard
  useFormNavigationGuard(hasChanges);

  if (loading) {
    return (
      <PageLayout title={t("settings.title")}>
        <LoadingSpinner message={t("common.loading")} />
      </PageLayout>
    );
  }

  if (!settings) {
    return (
      <PageLayout title={t("settings.title")}>
        <div className="text-center py-8">
          <p className="text-red-500">{t("common.error")}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={
      <span className="flex items-center gap-2">
        {t("settings.title")}
        {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
      </span>
    }>
      <>
        {/* App Settings panel */}
        <div className="bg-white rounded-md border border-t-0 border-slate-200">
          <AppSettingsPanel schema={schema} settings={settings} onChange={handleInputChange} />
        </div>

        {/* Save/Cancel buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {hasChanges && (
            <Button onClick={handleCancel} disabled={isSaving} variant="secondary">
              {t("common.reset")}
            </Button>
          )}

          <Button onClick={handleSave} disabled={isSaving || !hasChanges} variant={hasChanges ? "dark" : "primary"}>
            {isSaving ? t("common.loading") : t("common.save")}
            {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
          </Button>
        </div>
      </>
    </PageLayout>
  );
}
