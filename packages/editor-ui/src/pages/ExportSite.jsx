import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import ExportCreator from "../components/export/ExportCreator";
import ExportHistoryTable from "../components/export/ExportHistoryTable";
import useExportState from "../hooks/useExportState";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { Package } from "lucide-react";

export default function ExportSite() {
  const { t } = useTranslation();
  const {
    activeProject,
    lastExport,
    setLastExport,
    structuredDataSummary,
    setStructuredDataSummary,
    skippedLanguages,
    setSkippedLanguages,
    exportHistory,
    setExportHistory,
    loadingHistory,
    historyFailed,
    maxVersionsToKeep,
    developerMode,
    loadExportHistory,
  } = useExportState();
  const hasExports = exportHistory.length > 0;
  const retryButton = (
    <Button variant="secondary" disabled={loadingHistory} onClick={() => loadExportHistory(activeProject?.id)}>
      {t("exportSite.history.retry")}
    </Button>
  );

  // The first export flips the page from the empty-state branch to the history
  // branch, remounting ExportCreator, so its results live here rather than in it.
  const creatorProps = {
    activeProject,
    lastExport,
    setLastExport,
    structuredDataSummary,
    setStructuredDataSummary,
    skippedLanguages,
    setSkippedLanguages,
    loadExportHistory,
  };

  return (
    <PageLayout title={hasExports ? t("exportSite.title", { name: activeProject?.name || "..." }) : undefined}>
      {hasExports ? (
        <div className="space-y-6">
          <ExportCreator {...creatorProps} />

          {historyFailed && (
            <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{t("exportSite.history.loadFailedStale")}</span>
              {retryButton}
            </div>
          )}

          <ExportHistoryTable
            exportHistory={exportHistory}
            loadingHistory={loadingHistory}
            maxVersionsToKeep={maxVersionsToKeep}
            developerMode={developerMode}
            activeProject={activeProject}
            setExportHistory={setExportHistory}
          />
        </div>
      ) : historyFailed ? (
        // Not "No exports yet": the exports are there, only the list didn't load.
        // Exporting isn't offered until it does.
        <EmptyState
          icon={<Package size={48} />}
          title={t("exportSite.history.loadFailedTitle")}
          description={t("exportSite.history.loadFailedDesc")}
          action={retryButton}
        />
      ) : (
        <ExportCreator
          {...creatorProps}
          variant="empty"
          title={t("exportSite.history.noExportsTitle")}
          description={t("exportSite.history.noExportsDesc")}
        />
      )}
    </PageLayout>
  );
}
