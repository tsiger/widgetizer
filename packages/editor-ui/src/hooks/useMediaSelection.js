import { useState } from "react";
import { deleteProjectMedia, deleteMultipleMedia } from "../queries/mediaManager";
import useConfirmationModal from "./useConfirmationModal";

/**
 * Hook for managing media file selection and deletion operations.
 * Supports single and bulk file selection, as well as delete confirmations with usage protection.
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.activeProject - The currently active project
 * @param {Function} params.showToast - Function to display toast notifications
 * @param {Function} params.setFiles - State setter to update the files list after deletion
 * @param {Array} params.filteredFiles - The current filtered list of media files
 * @returns {{
 *   selectedFiles: Array<string>,
 *   setSelectedFiles: Function,
 *   handleFileSelect: (fileId: string) => void,
 *   handleSelectAll: () => void,
 *   openDeleteConfirmation: (fileId: string, fileName: string) => void,
 *   openBulkDeleteConfirmation: () => void,
 *   modalState: Object,
 *   closeModal: () => void,
 *   handleConfirm: () => void
 * }} Selection state and handlers
 * @property {Array<string>} selectedFiles - Array of selected file IDs
 * @property {Function} setSelectedFiles - Directly set the selected files array
 * @property {Function} handleFileSelect - Toggle selection of a single file
 * @property {Function} handleSelectAll - Select or deselect all filtered files
 * @property {Function} openDeleteConfirmation - Show confirmation modal for single file deletion
 * @property {Function} openBulkDeleteConfirmation - Show confirmation modal for bulk deletion
 * @property {Object} modalState - Current state of the confirmation modal
 * @property {Function} closeModal - Close the confirmation modal
 * @property {Function} handleConfirm - Confirm and execute the delete operation
 */
export default function useMediaSelection({ activeProject, showToast, setFiles, filteredFiles }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Handle confirmation actions for delete
  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        const result = await deleteMultipleMedia(activeProject.id, selectedFiles);

        // Check if result has filesInUse (partial deletion scenario)
        if (result.filesInUse && result.filesInUse.length > 0) {
          // Remove successfully deleted files from the list
          const deletedFileIds = selectedFiles.filter((id) => !result.filesInUse.some((file) => file.id === id));
          setFiles((prev) => prev.filter((file) => !deletedFileIds.includes(file.id)));
          setSelectedFiles((prev) => prev.filter((id) => !deletedFileIds.includes(id)));

          // Show informative message about partial deletion
          const inUseFileNames = result.filesInUse
            .map((file) => file.filename)
            .slice(0, 3)
            .join(", ");
          const moreFiles = result.filesInUse.length > 3 ? ` and ${result.filesInUse.length - 3} more` : "";

          if (result.deletedCount > 0) {
            showToast(
              `${result.deletedCount} file${result.deletedCount !== 1 ? "s" : ""} deleted. ${result.filesInUse.length} file${result.filesInUse.length !== 1 ? "s" : ""} (${inUseFileNames}${moreFiles}) could not be deleted because ${result.filesInUse.length !== 1 ? "they are" : "it is"} in use.`,
              "warning",
            );
          } else {
            showToast(
              `Cannot delete files: ${inUseFileNames}${moreFiles} ${result.filesInUse.length !== 1 ? "are" : "is"} currently in use.`,
              "error",
            );
          }
        } else {
          // All files deleted successfully
          setFiles((prev) => prev.filter((file) => !selectedFiles.includes(file.id)));
          setSelectedFiles([]);
          showToast(
            result.message ||
              `Successfully deleted ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""}`,
            "success",
          );
        }
      } else {
        await deleteProjectMedia(activeProject.id, data.fileId);
        setFiles((prev) => prev.filter((file) => file.id !== data.fileId));
        setSelectedFiles((prev) => prev.filter((id) => id !== data.fileId));
        showToast(`File "${data.fileName}" deleted successfully`, "success");
      }
    } catch (error) {
      console.error("Delete error:", error, { selectedFiles, projectId: activeProject?.id });
      // Check if error is related to files being in use
      if (error.message && error.message.includes("currently in use")) {
        showToast(`Cannot delete ${data.isBulkDelete ? "files" : "file"} - currently in use by pages`, "error");
      } else if (error.message && error.message.includes("No matching files")) {
        showToast("Files not found. The media library may be out of sync. Try refreshing the page.", "error");
      } else {
        showToast(error.message || `Failed to delete ${data.isBulkDelete ? "files" : "file"}`, "error");
      }
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

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

  return {
    selectedFiles,
    setSelectedFiles,
    handleFileSelect,
    handleSelectAll,
    openDeleteConfirmation,
    openBulkDeleteConfirmation,
    modalState,
    closeModal,
    handleConfirm,
  };
}
