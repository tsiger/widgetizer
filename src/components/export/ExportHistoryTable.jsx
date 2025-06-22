import React from "react";
import { IconButton } from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import { getExportEntryFile, downloadExportZip, deleteExportAPI } from "../../utils/exportManager";
import useToastStore from "../../stores/toastStore";
import useConfirmationModal from "../../hooks/useConfirmationModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import Table from "../ui/Table";
import { Loader2, ExternalLink, Trash2, Calendar, Download, Package } from "lucide-react";
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
  const showToast = useToastStore((state) => state.showToast);

  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

  // Handle confirmation actions for delete
  const handleDelete = async (data) => {
    try {
      await deleteExportAPI(activeProject.id, data.version);
      setExportHistory((prev) => prev.filter((exp) => exp.version !== data.version));
      showToast(`Export version ${data.version} deleted successfully`, "success");
    } catch (error) {
      showToast(`Failed to delete export: ${error.message}`, "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  const formatDate = (isoString) => {
    const dateFormat = appSettings?.general?.dateFormat || "MM/DD/YYYY";
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
      showToast(`Download started for version ${exportRecord.version}`, "success");
    } catch (error) {
      console.error("Error downloading export:", error);
      showToast(`Failed to download export: ${error.message}`, "error");
    }
  };

  const openDeleteConfirmation = (exportRecord) => {
    openModal({
      title: "Delete Export",
      message: `Are you sure you want to delete export version ${exportRecord.version}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { version: exportRecord.version },
    });
  };

  return (
    <>
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-900">Export History</h2>
          <span className="text-sm text-slate-500">
            Keeping latest {maxVersionsToKeep} version{maxVersionsToKeep !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading export history...</span>
          </div>
        ) : (
          <Table
            headers={["Version", "Created", "Status", "Actions"]}
            data={exportHistory}
            emptyMessage={
              <div className="text-center py-4">
                <Package className="mx-auto mb-2 text-slate-400" size={32} />
                <div className="font-medium">No exports yet</div>
                <div className="text-sm text-slate-500">Create your first export above!</div>
              </div>
            }
            renderRow={(exportRecord) => (
              <>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900">v{exportRecord.version}</span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-slate-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(exportRecord.timestamp)}
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      exportRecord.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {exportRecord.status}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {exportRecord.status === "success" && (
                      <>
                        <Tooltip content="View export">
                          <IconButton variant="neutral" size="sm" onClick={() => handleViewExport(exportRecord)}>
                            <ExternalLink size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Download export">
                          <IconButton variant="neutral" size="sm" onClick={() => handleDownloadExport(exportRecord)}>
                            <Download size={18} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip content="Delete export">
                      <IconButton variant="danger" size="sm" onClick={() => openDeleteConfirmation(exportRecord)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </td>
              </>
            )}
          />
        )}
      </div>

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
