import { useState } from "react";
import { deleteProjectMedia, deleteMultipleMedia } from "../utils/mediaManager";
import useConfirmationModal from "./useConfirmationModal";

export default function useMediaSelection({ activeProject, showToast, setFiles, filteredFiles }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Handle confirmation actions for delete
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
      // Check if error is related to files being in use
      if (error.message && error.message.includes("currently in use")) {
        showToast(`Cannot delete ${data.isBulkDelete ? "files" : "file"} - currently in use by pages`, "error");
      } else {
        showToast(`Failed to delete ${data.isBulkDelete ? "files" : "file"}`, "error");
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
