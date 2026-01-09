import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { exportProjectAPI } from "../../queries/exportManager";
import useToastStore from "../../stores/toastStore";
import { Loader2 } from "lucide-react";

export default function ExportCreator({ activeProject, lastExport, setLastExport, loadExportHistory }) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleExport = async () => {
    if (!activeProject || !activeProject.id) {
      showToast(t("exportSite.toasts.noProjectId"), "error");
      return;
    }

    setIsExporting(true);
    setLastExport(null);

    try {
      const result = await exportProjectAPI(activeProject.id);
      if (result.success) {
        showToast(result.message || t("exportSite.toasts.exportSuccess"), "success");
        setLastExport(result.exportRecord);
        // Reload export history to show the new export
        loadExportHistory(activeProject.id);
      } else {
        showToast(result.message || t("exportSite.toasts.exportError"), "error");
      }
    } catch (err) {
      console.error("Exporting failed:", err);
      showToast(err.message || t("exportSite.toasts.unknownError"), "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900 mb-4">{t("exportSite.creator.title")}</h2>
      <p className="text-slate-600 mb-4">{t("exportSite.creator.description")}</p>

      <Button
        onClick={handleExport}
        disabled={isExporting || !activeProject}
        variant="primary"
        icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      >
        {isExporting ? t("exportSite.creator.exporting") : t("exportSite.creator.exportButton")}
      </Button>

      {lastExport && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
          <p className="text-sm font-medium text-green-800">
            {t("exportSite.creator.successTitle", { version: lastExport.version })}
          </p>
          <p className="mt-1 text-sm text-green-700">
            {t("exportSite.creator.successCreated", { date: formatDate(lastExport.timestamp) })}
          </p>
        </div>
      )}
    </div>
  );
}
