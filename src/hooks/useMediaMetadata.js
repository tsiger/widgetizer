import { useState } from "react";
import { API_URL } from "../config";

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
