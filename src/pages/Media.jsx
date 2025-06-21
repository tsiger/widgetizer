import { AlertCircle, Image } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import MediaToolbar from "../components/media/MediaToolbar";
import MediaUploader from "../components/media/MediaUploader";
import MediaGrid from "../components/media/MediaGrid";
import MediaList from "../components/media/MediaList";
import MediaDrawer from "../components/media/MediaDrawer";
import ConfirmationModal from "../components/ui/ConfirmationModal";

import useMediaState from "../hooks/useMediaState";
import useMediaUpload from "../hooks/useMediaUpload";
import useMediaSelection from "../hooks/useMediaSelection";
import useMediaMetadata from "../hooks/useMediaMetadata";

export default function Media() {
  // Use our custom hooks to manage different aspects of media functionality
  const mediaState = useMediaState();

  const mediaUpload = useMediaUpload({
    activeProject: mediaState.activeProject,
    showToast: mediaState.showToast,
    setFiles: mediaState.setFiles,
  });

  const mediaSelection = useMediaSelection({
    activeProject: mediaState.activeProject,
    showToast: mediaState.showToast,
    setFiles: mediaState.setFiles,
    filteredFiles: mediaState.filteredFiles,
  });

  const mediaMetadata = useMediaMetadata({
    activeProject: mediaState.activeProject,
    showToast: mediaState.showToast,
    setFiles: mediaState.setFiles,
  });

  // Early returns for various states
  if (!mediaState.activeProject) {
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

  if (mediaState.loading) {
    return (
      <PageLayout title="Media">
        <LoadingSpinner message="Loading media files..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Media">
      <MediaUploader
        onUpload={mediaUpload.handleUpload}
        uploading={mediaUpload.uploading}
        uploadProgress={mediaUpload.uploadProgress}
      />

      {mediaState.files.length > 0 && (
        <>
          <MediaToolbar
            viewMode={mediaState.viewMode}
            onViewModeChange={mediaState.setViewMode}
            searchTerm={mediaState.searchTerm}
            onSearchChange={mediaState.setSearchTerm}
            selectedFiles={mediaSelection.selectedFiles}
            onBulkDelete={mediaSelection.openBulkDeleteConfirmation}
            onRefreshUsage={mediaState.handleRefreshUsage}
          />

          {mediaState.viewMode === "grid" ? (
            <MediaGrid
              files={mediaState.filteredFiles}
              selectedFiles={mediaSelection.selectedFiles}
              onFileSelect={mediaSelection.handleFileSelect}
              onFileDelete={mediaSelection.openDeleteConfirmation}
              onFileView={mediaMetadata.handleFileView}
              onFileEdit={mediaMetadata.handleEditMetadata}
              activeProject={mediaState.activeProject}
            />
          ) : (
            <MediaList
              files={mediaState.filteredFiles}
              selectedFiles={mediaSelection.selectedFiles}
              onFileSelect={mediaSelection.handleFileSelect}
              onSelectAll={mediaSelection.handleSelectAll}
              onFileDelete={mediaSelection.openDeleteConfirmation}
              onFileView={mediaMetadata.handleFileView}
              onFileEdit={mediaMetadata.handleEditMetadata}
              activeProject={mediaState.activeProject}
            />
          )}
        </>
      )}

      {mediaState.files.length === 0 && !mediaUpload.uploading && (
        <div className="p-8 text-center">
          <Image className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">No media files yet</h2>
          <p className="text-slate-600 mb-4">Upload some files using the uploader above.</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={mediaSelection.modalState.isOpen}
        onClose={mediaSelection.closeModal}
        onConfirm={mediaSelection.handleConfirm}
        title={mediaSelection.modalState.title}
        message={mediaSelection.modalState.message}
        confirmText={mediaSelection.modalState.confirmText}
        cancelText={mediaSelection.modalState.cancelText}
        variant={mediaSelection.modalState.variant}
      />

      <MediaDrawer
        visible={mediaMetadata.drawerVisible}
        onClose={mediaMetadata.handleCloseDrawer}
        selectedFile={mediaMetadata.selectedFileForEdit}
        onSave={mediaMetadata.handleSaveMetadata}
        loading={mediaMetadata.isSavingMetadata}
        activeProject={mediaState.activeProject}
      />
    </PageLayout>
  );
}
