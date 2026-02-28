import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import ExportCreator from "../components/export/ExportCreator";
import ExportHistoryTable from "../components/export/ExportHistoryTable";
import PublishSection from "../components/export/PublishSection";
import useExportState from "../hooks/useExportState";
import useAppInfoStore from "../stores/appInfoStore";

export default function ExportSite() {
  const { t } = useTranslation();
  const hostedMode = useAppInfoStore((state) => state.hostedMode);
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
        {hostedMode ? (
          <PublishSection activeProject={activeProject} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </PageLayout>
  );
}
