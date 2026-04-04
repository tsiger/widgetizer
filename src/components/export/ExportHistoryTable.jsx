import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "../ui/Button";
import { getExportEntryFile, downloadExportZip, deleteExportAPI } from "../../queries/exportManager";
import useToastStore from "../../stores/toastStore";
import useConfirmationModal from "../../hooks/useConfirmationModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import Table from "../ui/Table";
import Badge from "../ui/Badge";
import { Loader2, ExternalLink, Trash2, Calendar, Download, Package, MoreVertical } from "lucide-react";
import { API_URL } from "../../config";
import { formatDate as formatDateUtil } from "../../utils/dateFormatter";
import useAppSettings from "../../hooks/useAppSettings";

export default function ExportHistoryTable({
  exportHistory,
  loadingHistory,
  maxVersionsToKeep,
  activeProject,
  setExportHistory,
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [openMenuVersion, setOpenMenuVersion] = useState(null);
  const menuRef = useRef(null);

  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuVersion(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenMenuVersion(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle confirmation actions for delete
  const handleDelete = async (data) => {
    try {
      await deleteExportAPI(activeProject.id, data.version);
      setExportHistory((prev) => prev.filter((exp) => exp.version !== data.version));
      showToast(t("exportSite.history.toasts.deleteSuccess", { version: data.version }), "success");
    } catch (error) {
      showToast(t("exportSite.history.toasts.deleteError", { message: error.message }), "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  const formatDate = (isoString) => {
    const dateFormat = appSettings?.general?.dateFormat || "MMMM D, YYYY h:mm A";
    return formatDateUtil(isoString, dateFormat);
  };

  const handleViewExport = async (exportRecord) => {
    try {
      // Extract just the directory name - handle both Windows and Unix paths
      const exportPath = exportRecord.outputDir.split(/[/\\]/).pop();

      // Smart detection of entry file
      const result = await getExportEntryFile(exportPath);
      const entryFile = result.entryFile || "index.html";

      const viewUrl = API_URL(`/api/export/view/${exportPath}/${entryFile}`);
      window.open(viewUrl, "_blank");
    } catch (error) {
      console.error("Error getting entry file:", error);
      // Fallback to index.html - handle both Windows and Unix paths
      const exportPath = exportRecord.outputDir.split(/[/\\]/).pop();
      const viewUrl = API_URL(`/api/export/view/${exportPath}/index.html`);
      window.open(viewUrl, "_blank");
    }
  };

  const handleDownloadExport = (exportRecord) => {
    try {
      // Extract just the directory name - handle both Windows and Unix paths
      const exportPath = exportRecord.outputDir.split(/[/\\]/).pop();
      downloadExportZip(exportPath);
      showToast(t("exportSite.history.toasts.downloadStart", { version: exportRecord.version }), "success");
    } catch (error) {
      console.error("Error downloading export:", error);
      showToast(t("exportSite.history.toasts.downloadError", { message: error.message }), "error");
    }
  };

  const openDeleteConfirmation = (exportRecord) => {
    openModal({
      title: t("exportSite.history.deleteModal.title"),
      message: t("exportSite.history.deleteModal.message", { version: exportRecord.version }),
      confirmText: t("exportSite.history.deleteModal.confirm"),
      cancelText: t("exportSite.history.deleteModal.cancel"),
      variant: "danger",
      data: { version: exportRecord.version },
    });
  };

  return (
    <>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">{t("exportSite.history.title")}</h2>
          <span className="text-sm text-slate-500">
            {t("exportSite.history.keepingVersions", { count: maxVersionsToKeep })}
          </span>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">{t("exportSite.history.loading")}</span>
          </div>
        ) : (
          <Table
            headers={[
              t("exportSite.history.headers.version"),
              t("exportSite.history.headers.created"),
              t("exportSite.history.headers.status"),
              t("exportSite.history.headers.actions"),
            ]}
            data={exportHistory}
            emptyMessage={
              <div className="text-center py-4">
                <Package className="mx-auto mb-2 text-slate-400" size={32} />
                <div className="font-medium">{t("exportSite.history.noExportsTitle")}</div>
                <div className="text-sm text-slate-500">{t("exportSite.history.noExportsDesc")}</div>
              </div>
            }
            renderRow={(exportRecord) => (
              <>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900">Version {exportRecord.version}</span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-slate-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(exportRecord.timestamp)}
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <Badge
                    variant={exportRecord.status === "success" ? "success" : "error"}
                    className="inline-flex whitespace-nowrap px-3 py-0.5 text-xs font-semibold"
                  >
                    {exportRecord.status.charAt(0).toUpperCase() + exportRecord.status.slice(1)}
                  </Badge>
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-right">
                  <div className="relative inline-flex items-center justify-end" ref={openMenuVersion === exportRecord.version ? menuRef : null}>
                    <IconButton
                      variant="neutral"
                      size="sm"
                      onClick={() => setOpenMenuVersion(openMenuVersion === exportRecord.version ? null : exportRecord.version)}
                      className={`border transition-all ${
                        openMenuVersion === exportRecord.version
                          ? "border-pink-200 bg-pink-50 text-pink-600"
                          : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      }`}
                      aria-label={t("exportSite.history.actionsMenu", "Export actions")}
                      aria-haspopup="menu"
                      aria-expanded={openMenuVersion === exportRecord.version}
                    >
                      <MoreVertical size={18} />
                    </IconButton>

                    {openMenuVersion === exportRecord.version && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                        {exportRecord.status === "success" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuVersion(null);
                                handleViewExport(exportRecord);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <ExternalLink size={14} />
                              {t("exportSite.history.tooltips.view")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuVersion(null);
                                handleDownloadExport(exportRecord);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <Download size={14} />
                              {t("exportSite.history.tooltips.download")}
                            </button>
                            <div className="my-1 border-t border-slate-200" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuVersion(null);
                            openDeleteConfirmation(exportRecord);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          {t("exportSite.history.tooltips.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </>
            )}
          />
        )}
      </section>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
      />
    </>
  );
}
