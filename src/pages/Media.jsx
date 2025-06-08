import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { API_URL } from "../config";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import MediaToolbar from "../components/media/MediaToolbar";
import MediaUploader from "../components/media/MediaUploader";
import MediaGrid from "../components/media/MediaGrid";
import MediaList from "../components/media/MediaList";
import MediaDrawer from "../components/media/MediaDrawer";

import useConfirmationModal from "../hooks/useConfirmationModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { getProjectMedia, uploadProjectMedia, deleteProjectMedia, deleteMultipleMedia } from "../utils/mediaManager";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";

export default function Media() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("mediaViewMode") || "grid";
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  // State for the drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedFileForEdit, setSelectedFileForEdit] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Get active project from the store
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // Handle confirmation actions
  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        await deleteMultipleMedia(activeProject.id, selectedFiles);
        setFiles((prev) => prev.filter((file) => !selectedFiles.includes(file.id)));
        setSelectedFiles([]);
        showToast(`Successfully deleted ${selectedFiles.length} files`, "success");
      } else {
        await deleteProjectMedia(activeProject.id, data.fileId);
        setFiles((prev) => prev.filter((file) => file.id !== data.fileId));
        setSelectedFiles((prev) => prev.filter((id) => id !== data.fileId));
        showToast(`File "${data.fileName}" deleted successfully`, "success");
      }
    } catch (error) {
      showToast(`Failed to delete ${data.isBulkDelete ? "files" : "file"}`, "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  // Load media files when active project changes
  useEffect(() => {
    if (activeProject) {
      loadMediaFiles();
    }
  }, [activeProject]);

  // Update localStorage when viewMode changes
  useEffect(() => {
    localStorage.setItem("mediaViewMode", viewMode);
  }, [viewMode]);

  const loadMediaFiles = async () => {
    if (!activeProject) return;
    setLoading(true);

    try {
      const data = await getProjectMedia(activeProject.id);
      // Ensure all files have a metadata object
      const filesWithMetadata = (data.files || []).map((file) => ({
        ...file,
        metadata: file.metadata || { alt: "", title: "" },
      }));
      setFiles(filesWithMetadata);
    } catch (error) {
      showToast("Failed to load media files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (acceptedFiles) => {
    if (!activeProject) {
      showToast("No active project selected. Please select a project first.", "error");
      return;
    }

    setUploading(true);
    acceptedFiles.forEach((file) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
    });

    try {
      const result = await uploadProjectMedia(activeProject.id, acceptedFiles, (progress) => {
        acceptedFiles.forEach((file) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });
      });

      const processed = result.processedFiles || [];
      const rejected = result.rejectedFiles || [];

      console.log("Upload Result:", result);
      console.log("Processed Files:", processed);
      console.log("Rejected Files:", rejected);

      // Update state ONLY with successfully processed files from this batch
      if (processed.length > 0) {
        const newFilesWithMetadata = processed.map((file) => ({
          ...file,
          metadata: file.metadata || { alt: "", title: "" },
        }));
        console.log("Files state BEFORE direct update:", files);
        const updatedFiles = [...files, ...newFilesWithMetadata];
        console.log("Calculated updated files array:", updatedFiles);
        setFiles(updatedFiles);
      } else {
        console.log("No files processed successfully in this batch.");
      }

      // --- Toast Logic with Robust Unique IDs ---
      const uniqueTimestamp = Date.now(); // Capture timestamp once for the batch

      if (processed.length > 0 && rejected.length === 0) {
        // All successful
        showToast(`Successfully uploaded ${processed.length} file(s).`, "success", {
          id: `success-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
        });
      } else if (processed.length > 0 && rejected.length > 0) {
        // Partial success - Summary Toast
        showToast(`Uploaded ${processed.length} file(s). ${rejected.length} file(s) rejected.`, "warning", {
          duration: 5000,
          id: `summary-partial-${uniqueTimestamp}`, // Unique ID for summary
        });
        // Individual Rejection Toasts
        rejected.forEach((rf, index) =>
          showToast(`${rf.originalName}: ${rf.reason}`, "error", {
            duration: 7000,
            // ID combines filename, timestamp, and index for uniqueness within the batch
            id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
          }),
        );
        console.warn("Rejected files details:", rejected);
      } else if (processed.length === 0 && rejected.length > 0) {
        // All rejected - Summary Toast
        showToast(`Upload failed. ${rejected.length} file(s) rejected.`, "error", {
          duration: 5000,
          id: `summary-rejected-${uniqueTimestamp}`, // Unique ID for summary
        });
        // Individual Rejection Toasts
        rejected.forEach((rf, index) =>
          showToast(`${rf.originalName}: ${rf.reason}`, "error", {
            duration: 7000,
            // ID combines filename, timestamp, and index for uniqueness within the batch
            id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
          }),
        );
        console.error("Rejected files details:", rejected);
      } else if (result.status >= 400 && result.error) {
        // Other backend errors
        showToast(result.error, "error", {
          id: `error-backend-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
        });
        console.error("Upload Error from Backend:", result);
      } else if (result.status >= 400) {
        // Unknown server error
        showToast("Upload failed with an unknown server error.", "error", {
          id: `error-unknown-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
        });
        console.error("Unknown Upload Error:", result);
      }
      // --- End Toast Logic ---
    } catch (error) {
      // Catch network errors or errors from mediaManager itself
      const uniqueTimestamp = Date.now();
      showToast(error?.message || "Failed to upload files due to a network or client error.", "error", {
        id: `error-client-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
      });
      console.error("Upload Client/Network Error:", error);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleFileSelect = (fileId) => {
    setSelectedFiles((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      }
      return [...prev, fileId];
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map((file) => file.id));
    }
  };

  const openDeleteConfirmation = (fileId, fileName) => {
    openModal({
      title: "Delete File",
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { fileId, fileName, isBulkDelete: false },
    });
  };

  const openBulkDeleteConfirmation = () => {
    if (selectedFiles.length === 0) return;

    openModal({
      title: "Delete Files",
      message: `Are you sure you want to delete ${selectedFiles.length} selected file(s)? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { isBulkDelete: true },
    });
  };

  // Filter files based on search term
  const filteredFiles = files.filter((file) => file.originalName.toLowerCase().includes(searchTerm.toLowerCase()));

  // Handler to open the drawer
  const handleEditMetadata = (file) => {
    setSelectedFileForEdit(file);
    setDrawerVisible(true);
  };

  // Handler to close the drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedFileForEdit(null);
  };

  // Handler to save metadata changes
  const handleSaveMetadata = async (fileId, metadata) => {
    if (!activeProject || !fileId) return;

    setIsSavingMetadata(true);
    try {
      const response = await fetch(API_URL(`/api/media/projects/${activeProject.id}/media/${fileId}/metadata`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update metadata");
      }

      const updatedFileData = await response.json();

      // Update the file in the local state
      setFiles((prevFiles) =>
        prevFiles.map((file) => (file.id === fileId ? { ...file, metadata: updatedFileData.file.metadata } : file)),
      );

      showToast("Metadata updated successfully", "success");
      handleCloseDrawer(); // Close drawer on successful save
    } catch (error) {
      console.error("Error updating metadata:", error);
      showToast(error.message || "Failed to update metadata", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Existing handler for file view - unchanged
  const handleFileView = (file) => {
    // Add /api/media prefix and remove the file.path prefix if it exists
    const imagePath = file.path.startsWith("/") ? file.path : `/${file.path}`;
    window.open(API_URL(`/api/media/projects/${activeProject.id}${imagePath}`), "_blank");
  };

  if (!activeProject) {
    return (
      <PageLayout title="Media">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage media files.</p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout title="Media">
        <LoadingSpinner message="Loading media files..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Media">
      <MediaUploader onUpload={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />

      {files.length > 0 && (
        <>
          <MediaToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedFiles={selectedFiles}
            onBulkDelete={openBulkDeleteConfirmation}
          />

          {viewMode === "grid" ? (
            <MediaGrid
              files={filteredFiles}
              selectedFiles={selectedFiles}
              onFileSelect={handleFileSelect}
              onFileDelete={openDeleteConfirmation}
              onFileView={handleFileView}
              onFileEdit={handleEditMetadata}
              activeProject={activeProject}
            />
          ) : (
            <MediaList
              files={filteredFiles}
              selectedFiles={selectedFiles}
              onFileSelect={handleFileSelect}
              onSelectAll={handleSelectAll}
              onFileDelete={openDeleteConfirmation}
              onFileView={handleFileView}
              onFileEdit={handleEditMetadata}
              activeProject={activeProject}
            />
          )}
        </>
      )}

      {files.length === 0 && !uploading && (
        <EmptyState
          title="No media files yet"
          description="Upload some files using the uploader above."
          className="mt-4"
        />
      )}

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

      {/* Render the drawer */}
      <MediaDrawer
        visible={drawerVisible}
        onClose={handleCloseDrawer}
        selectedFile={selectedFileForEdit}
        onSave={handleSaveMetadata}
        loading={isSavingMetadata}
        activeProject={activeProject}
      />
    </PageLayout>
  );
}
