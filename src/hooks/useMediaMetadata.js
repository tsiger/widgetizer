import { useState } from "react";
import { API_URL } from "../config";
import { apiFetch } from "../lib/apiFetch";

/**
 * Hook for managing media file metadata editing via a drawer interface.
 * Handles opening/closing the metadata drawer, saving metadata changes, and viewing files.
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.activeProject - The currently active project containing the media
 * @param {Function} params.showToast - Function to display toast notifications
 * @param {Function} params.setFiles - State setter to update the files list after metadata changes
 * @returns {{
 *   drawerVisible: boolean,
 *   selectedFileForEdit: Object|null,
 *   isSavingMetadata: boolean,
 *   handleEditMetadata: (file: Object) => void,
 *   handleCloseDrawer: () => void,
 *   handleSaveMetadata: (fileId: string, metadata: Object) => Promise<void>,
 *   handleFileView: (file: Object) => void
 * }} Metadata editing state and handlers
 * @property {boolean} drawerVisible - Whether the metadata editing drawer is open
 * @property {Object|null} selectedFileForEdit - The file currently being edited
 * @property {boolean} isSavingMetadata - Whether metadata is being saved
 * @property {Function} handleEditMetadata - Open the drawer to edit a file's metadata
 * @property {Function} handleCloseDrawer - Close the metadata editing drawer
 * @property {Function} handleSaveMetadata - Save updated metadata for a file
 * @property {Function} handleFileView - Open a file in a new browser tab
 */
export default function useMediaMetadata({ activeProject, showToast, setFiles }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedFileForEdit, setSelectedFileForEdit] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

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
      const response = await apiFetch(`/api/media/projects/${activeProject.id}/media/${fileId}/metadata`, {
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

  // Handler for file view - uses file ID for reliable access to both images and videos
  const handleFileView = (file) => {
    // Use the ID-based route which works for both images and videos
    window.open(API_URL(`/api/media/projects/${activeProject.id}/media/${file.id}`), "_blank");
  };

  return {
    drawerVisible,
    selectedFileForEdit,
    isSavingMetadata,
    handleEditMetadata,
    handleCloseDrawer,
    handleSaveMetadata,
    handleFileView,
  };
}
