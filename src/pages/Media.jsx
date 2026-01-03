import { useTranslation } from "react-i18next";
import { Image } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import MediaToolbar from "../components/media/MediaToolbar";
import FileUploader from "../components/ui/FileUploader";
import MediaGrid from "../components/media/MediaGrid";
import MediaList from "../components/media/MediaList";
import MediaDrawer from "../components/media/MediaDrawer";
import ConfirmationModal from "../components/ui/ConfirmationModal";

import useMediaState from "../hooks/useMediaState";
import useMediaUpload from "../hooks/useMediaUpload";
import useMediaSelection from "../hooks/useMediaSelection";
import useMediaMetadata from "../hooks/useMediaMetadata";

export default function Media() {
  const { t } = useTranslation();
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
  if (mediaState.loading) {
    return (
      <PageLayout title={t("media.title")}>
        <LoadingSpinner message={t("media.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("media.title")}>
      <FileUploader
        onUpload={mediaUpload.handleUpload}
        uploading={mediaUpload.uploading}
        uploadProgress={mediaUpload.uploadProgress}
        accept={{
          "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
          "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
        }}
        multiple={true}
        title={t("media.uploader.title")}
        description={t("media.uploader.description")}
        maxSizeText={`${t("components.mediaUploader.supportedImages")} • ${t("components.mediaUploader.supportedVideos")}`}
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
          <h2 className="text-xl font-semibold mb-2">{t("media.emptyTitle")}</h2>
          <p className="text-slate-600 mb-4">{t("media.emptyDesc")}</p>
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
