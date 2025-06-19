import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import { getActiveProject } from "../utils/projectManager";
import {
  exportProjectAPI,
  getExportHistory,
  deleteExportAPI,
  getExportEntryFile,
  downloadExportZip,
} from "../utils/exportManager";
import useToastStore from "../stores/toastStore";
import useConfirmationModal from "../hooks/useConfirmationModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { Loader2, ExternalLink, Trash2, Calendar, Download } from "lucide-react";
import { API_URL } from "../config";

export default function ExportSite() {
  const [activeProject, setActiveProject] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [maxVersionsToKeep, setMaxVersionsToKeep] = useState(10);
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

  // Load export history
  const loadExportHistory = async (projectId) => {
    if (!projectId) return;

    setLoadingHistory(true);
    try {
      const result = await getExportHistory(projectId);
      setExportHistory(result.exports || []);
      if (result.maxVersionsToKeep) {
        setMaxVersionsToKeep(result.maxVersionsToKeep);
      }
    } catch (error) {
      console.error("Failed to load export history:", error);
      // Don't show toast for this as it's not critical
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    async function fetchActiveProject() {
      try {
        const project = await getActiveProject();
        setActiveProject(project);
        if (project?.id) {
          loadExportHistory(project.id);
        }
      } catch (err) {
        console.error("Failed to fetch active project:", err);
        showToast("Could not load active project details.", "error");
      }
    }
    fetchActiveProject();
  }, [showToast]);

  const handleExport = async () => {
    if (!activeProject || !activeProject.id) {
      showToast("Active project ID is not available.", "error");
      return;
    }

    setIsExporting(true);
    setLastExport(null);

    try {
      const result = await exportProjectAPI(activeProject.id);
      if (result.success) {
        showToast(result.message || "Project exported successfully!", "success");
        setLastExport(result.exportRecord);
        // Reload export history to show the new export
        loadExportHistory(activeProject.id);
      } else {
        showToast(result.message || "Exporting failed with an unknown issue.", "error");
      }
    } catch (err) {
      console.error("Exporting failed:", err);
      showToast(err.message || "An unknown error occurred during exporting.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper functions
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
      const exportPath = exportRecord.outputDir.split("/").pop(); // Get just the directory name

      // Smart detection of entry file
      const result = await getExportEntryFile(exportPath);
      const entryFile = result.entryFile || "index.html";

      const viewUrl = API_URL(`/api/export/view/${exportPath}/${entryFile}`);
      window.open(viewUrl, "_blank");
    } catch (error) {
      console.error("Error getting entry file:", error);
      // Fallback to index.html
      const exportPath = exportRecord.outputDir.split("/").pop();
      const viewUrl = API_URL(`/api/export/view/${exportPath}/index.html`);
      window.open(viewUrl, "_blank");
    }
  };

  const handleDownloadExport = (exportRecord) => {
    try {
      const exportPath = exportRecord.outputDir.split("/").pop(); // Get just the directory name
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
    <PageLayout title={`Export Site: ${activeProject?.name || "..."}`}>
      <div className="space-y-6">
        {/* Export Action Section */}
        <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Create New Export</h2>
          <p className="text-slate-600 mb-4">
            Click the button below to generate a static HTML version of your site for export. Each export is assigned a
            version number for easy tracking.
          </p>

          <Button
            onClick={handleExport}
            disabled={isExporting || !activeProject}
            variant="primary"
            icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          >
            {isExporting ? "Exporting..." : "Export Project"}
          </Button>

          {lastExport && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
              <p className="text-sm font-medium text-green-800">
                Export version {lastExport.version} created successfully!
              </p>
              <p className="mt-1 text-sm text-green-700">Created: {formatDate(lastExport.timestamp)}</p>
            </div>
          )}
        </div>

        {/* Export History Section */}
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
                            exportRecord.status === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
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
    </PageLayout>
  );
}
