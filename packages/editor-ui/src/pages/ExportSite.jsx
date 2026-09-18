import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import ExportCreator from "../components/export/ExportCreator";
import ExportHistoryTable from "../components/export/ExportHistoryTable";
import useExportState from "../hooks/useExportState";

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
    maxVersionsToKeep,
    developerMode,
    loadExportHistory,
  } = useExportState();
  const hasExports = exportHistory.length > 0;

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

          <ExportHistoryTable
            exportHistory={exportHistory}
            loadingHistory={loadingHistory}
            maxVersionsToKeep={maxVersionsToKeep}
            developerMode={developerMode}
            activeProject={activeProject}
            setExportHistory={setExportHistory}
          />
        </div>
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
