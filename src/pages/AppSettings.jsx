import PageLayout from "../components/layout/PageLayout.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import Button from "../components/ui/Button.jsx";
import AppSettingsPanel from "../components/settings/AppSettingsPanel.jsx";
import useAppSettings from "../hooks/useAppSettings.js";

export default function AppSettings() {
  const { settings, loading, isSaving, hasChanges, schema, handleInputChange, handleSave, handleCancel } =
    useAppSettings();

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
        <div className="text-center py-8">
          <p className="text-red-500">Could not load settings.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="General Settings">
      <>
        {/* App Settings panel */}
        <div className="bg-white rounded-md border border-t-0 border-slate-200">
          <AppSettingsPanel schema={schema} settings={settings} onChange={handleInputChange} />
        </div>

        {/* Save/Cancel buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {hasChanges && (
            <Button onClick={handleCancel} disabled={isSaving} variant="secondary">
              Cancel
            </Button>
          )}

          <Button onClick={handleSave} disabled={isSaving || !hasChanges} variant="primary">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>

          {hasChanges && <span className="text-sm text-amber-600 self-center ml-2">You have unsaved changes</span>}
        </div>
      </>
    </PageLayout>
  );
}
