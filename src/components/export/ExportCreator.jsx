import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { exportProjectAPI } from "../../queries/exportManager";
import useProjectStore from "../../stores/projectStore";
import useToastStore from "../../stores/toastStore";
import { Loader2, Package } from "lucide-react";

export default function ExportCreator({
  activeProject,
  lastExport,
  setLastExport,
  loadExportHistory,
  variant = "default",
  title,
  description,
}) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [exportMarkdown, setExportMarkdown] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const isEmptyState = variant === "empty";

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

    const projectIdAtStart = activeProject.id;
    setIsExporting(true);
    setLastExport(null);

    try {
      const result = await exportProjectAPI(projectIdAtStart, { exportMarkdown });

      // Drop the response if the active project changed during the export
      if (useProjectStore.getState().activeProject?.id !== projectIdAtStart) return;

      if (result.success) {
        showToast(result.message || t("exportSite.toasts.exportSuccess"), "success");
        setLastExport(result.exportRecord);
        // Reload export history to show the new export
        loadExportHistory(projectIdAtStart);
      } else {
        showToast(result.message || t("exportSite.toasts.exportError"), "error");
      }
    } catch (err) {
      if (useProjectStore.getState().activeProject?.id !== projectIdAtStart) return;
      console.error("Exporting failed:", err);
      showToast(err.message || t("exportSite.toasts.unknownError"), "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className={isEmptyState ? "flex flex-col items-center px-6 py-16 text-center" : "border-b border-slate-200 pb-6"}>
      {isEmptyState && <Package className="mb-4 text-slate-400" size={48} />}
      <h2 className={isEmptyState ? "mb-2 text-xl font-semibold text-slate-900" : "mb-2 text-lg font-medium text-slate-900"}>
        {title || t("exportSite.creator.title")}
      </h2>
      <p className={`text-slate-600 ${isEmptyState ? "mb-6 max-w-xl" : "mb-4 max-w-3xl"}`}>
        {description || t("exportSite.creator.description")}
      </p>

      <div className={`flex flex-wrap items-center gap-4 ${isEmptyState ? "justify-center" : ""}`}>
        <Button
          onClick={handleExport}
          disabled={isExporting || !activeProject}
          variant="primary"
          icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        >
          {isExporting ? t("exportSite.creator.exporting") : t("exportSite.creator.exportButton")}
        </Button>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={exportMarkdown}
            onChange={(e) => setExportMarkdown(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm text-slate-600">
            {t("exportSite.creator.exportMarkdown", "Also export pages as Markdown (.md)")}
          </span>
        </label>
      </div>

      {lastExport && (
        <div className={`mt-4 rounded-sm border border-green-200 bg-green-50 p-4 ${isEmptyState ? "w-full max-w-md text-left" : ""}`}>
          <p className="text-sm font-medium text-green-800">
            {t("exportSite.creator.successTitle", { version: lastExport.version })}
          </p>
          <p className="mt-1 text-sm text-green-700">
            {t("exportSite.creator.successCreated", { date: formatDate(lastExport.timestamp) })}
          </p>
        </div>
      )}
    </section>
  );
}
