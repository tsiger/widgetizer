import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "lucide-react";
import { MEDIA_TYPES, API_URL } from "../config";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import MediaToolbar from "../components/media/MediaToolbar";
import FileUploader from "../components/ui/FileUploader";
import MediaGrid from "../components/media/MediaGrid";
import MediaList from "../components/media/MediaList";
import MediaDrawer from "../components/media/MediaDrawer";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Lightbox from "../components/ui/Lightbox";

import useMediaState from "../hooks/useMediaState";
import useMediaUpload from "../hooks/useMediaUpload";
import useMediaSelection from "../hooks/useMediaSelection";
import useMediaMetadata from "../hooks/useMediaMetadata";

export default function Media() {
  const { t } = useTranslation();
  // Use our custom hooks to manage different aspects of media functionality
  const mediaState = useMediaState();

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(-1);

  // Get only image files for lightbox navigation
  const imageFiles = mediaState.filteredFiles.filter((file) => file.type?.startsWith("image/"));

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

  // Handle file view - open lightbox for images, new tab for videos/audio
  const handleFileView = (file) => {
    if (file.type?.startsWith("image/")) {
      const imageIndex = imageFiles.findIndex((f) => f.id === file.id);
      if (imageIndex !== -1) {
        setLightboxImageIndex(imageIndex);
        setLightboxOpen(true);
      }
    } else {
      // For videos/audio, use the original behavior (open in new tab)
      mediaMetadata.handleFileView(file);
    }
  };

  // Lightbox navigation handlers
  const handleLightboxPrevious = () => {
    if (lightboxImageIndex > 0) {
      setLightboxImageIndex(lightboxImageIndex - 1);
    }
  };

  const handleLightboxNext = () => {
    if (lightboxImageIndex < imageFiles.length - 1) {
      setLightboxImageIndex(lightboxImageIndex + 1);
    }
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
    setLightboxImageIndex(-1);
  };

  // Get current lightbox image
  const currentLightboxImage = lightboxImageIndex >= 0 ? imageFiles[lightboxImageIndex] : null;
  const lightboxImageUrl = currentLightboxImage
    ? API_URL(`/api/media/projects/${mediaState.activeProject?.id}${currentLightboxImage.path}`)
    : null;

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
          "image/*": MEDIA_TYPES.image,
          "video/*": MEDIA_TYPES.video,
          "audio/*": MEDIA_TYPES.audio,
        }}
        multiple={true}
        title={t("media.uploader.title")}
        description={t("media.uploader.description")}
        maxSizeText={`${t("components.mediaUploader.supportedImages")} • ${t("components.mediaUploader.supportedVideos")} • ${t("components.mediaUploader.supportedAudio")}`}
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
            filterType={mediaState.filterType}
            onFilterTypeChange={mediaState.setFilterType}
          />

          {mediaState.viewMode === "grid" ? (
            <MediaGrid
              files={mediaState.filteredFiles}
              selectedFiles={mediaSelection.selectedFiles}
              onFileSelect={mediaSelection.handleFileSelect}
              onFileDelete={mediaSelection.openDeleteConfirmation}
              onFileView={handleFileView}
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
              onFileView={handleFileView}
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

      <Lightbox
        isOpen={lightboxOpen}
        onClose={handleLightboxClose}
        imageUrl={lightboxImageUrl}
        imageAlt={currentLightboxImage?.metadata?.alt || currentLightboxImage?.originalName || "Image preview"}
        onPrevious={handleLightboxPrevious}
        onNext={handleLightboxNext}
        hasPrevious={lightboxImageIndex > 0}
        hasNext={lightboxImageIndex < imageFiles.length - 1}
      />
    </PageLayout>
  );
}
