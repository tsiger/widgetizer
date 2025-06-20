import React from "react";
import Button from "../ui/Button";
import { getExportEntryFile, downloadExportZip, deleteExportAPI } from "../../utils/exportManager";
import useToastStore from "../../stores/toastStore";
import useConfirmationModal from "../../hooks/useConfirmationModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import { Loader2, ExternalLink, Trash2, Calendar, Download } from "lucide-react";
import { API_URL } from "../../config";

export default function ExportHistoryTable({
  exportHistory,
  loadingHistory,
  maxVersionsToKeep,
  activeProject,
  setExportHistory,
}) {
  const showToast = useToastStore((state) => state.showToast);

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
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
        ) : exportHistory.length > 0 ? (
          <div className="overflow-hidden rounded-sm border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {exportHistory.map((exportRecord) => (
                  <tr key={exportRecord.version} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-900">v{exportRecord.version}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(exportRecord.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          exportRecord.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {exportRecord.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {exportRecord.status === "success" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewExport(exportRecord)}
                              icon={<ExternalLink className="h-4 w-4" />}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadExport(exportRecord)}
                              icon={<Download className="h-4 w-4" />}
                            >
                              Download
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteConfirmation(exportRecord)}
                          icon={<Trash2 className="h-4 w-4" />}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No exports yet. Create your first export above!</p>
          </div>
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
