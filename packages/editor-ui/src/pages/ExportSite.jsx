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
    exportHistory,
    setExportHistory,
    loadingHistory,
    maxVersionsToKeep,
    loadExportHistory,
  } = useExportState();
  const hasExports = exportHistory.length > 0;

  return (
    <PageLayout title={hasExports ? t("exportSite.title", { name: activeProject?.name || "..." }) : undefined}>
      {hasExports ? (
        <div className="space-y-6">
          <ExportCreator
            activeProject={activeProject}
            lastExport={lastExport}
            setLastExport={setLastExport}
            loadExportHistory={loadExportHistory}
          />

          <ExportHistoryTable
            exportHistory={exportHistory}
            loadingHistory={loadingHistory}
            maxVersionsToKeep={maxVersionsToKeep}
            activeProject={activeProject}
            setExportHistory={setExportHistory}
          />
        </div>
      ) : (
        <ExportCreator
          activeProject={activeProject}
          lastExport={lastExport}
          setLastExport={setLastExport}
          loadExportHistory={loadExportHistory}
          variant="empty"
          title={t("exportSite.history.noExportsTitle")}
          description={t("exportSite.history.noExportsDesc")}
        />
      )}
    </PageLayout>
  );
}
