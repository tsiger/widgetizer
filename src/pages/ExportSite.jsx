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

  return (
    <PageLayout title={t("exportSite.title", { name: activeProject?.name || "..." })}>
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
    </PageLayout>
  );
}
