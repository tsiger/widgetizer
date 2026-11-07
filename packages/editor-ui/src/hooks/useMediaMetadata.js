import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_URL } from "../lib/config";
import { useHookRunner } from "../extension/PluginProvider";
import { saveMediaMetadata } from "../queries/mediaManager";

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
 *   handleSaveMetadata: (fileId: string, metadata: Object, language?: string) => Promise<void>,
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
  const { t } = useTranslation();
  const hooks = useHookRunner();

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
  const handleSaveMetadata = async (fileId, metadata, language) => {
    if (!activeProject || !fileId) return;

    setIsSavingMetadata(true);
    try {
      const updatedFileData = await saveMediaMetadata(activeProject.id, fileId, metadata, language);

      // Update the file in the local state
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId
            ? { ...file, metadata: updatedFileData.file.metadata, translations: updatedFileData.file.translations }
            : file,
        ),
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

  // Opens a file in a new tab by its ID (works for any file type), always
  // without a link back to the editor: an SVG or other active file must not be
  // able to navigate the editor window.
  const handleFileView = async (file) => {
    const projectId = activeProject.id;
    const url = API_URL(`/api/media/projects/${projectId}/media/${file.id}`);
    if (!hooks.has("beforeOpenMediaFile")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // A host has to get ready first, and a tab opened after waiting would be
    // blocked as a pop-up, so a blank tab opens now and gets the file after.
    // (The desktop app never gets here: it registers no hooks, and it refuses
    // window.open and opens the address itself.)
    const tab = window.open("", "_blank");
    if (!tab) {
      showToast(t("media.viewBlocked"), "error");
      return;
    }
    try {
      tab.opener = null;
    } catch {
      // Checked just below.
    }
    if (tab.opener !== null) {
      tab.close();
      showToast(t("media.viewFailed"), "error");
      return;
    }

    try {
      const result = await hooks.runBefore("beforeOpenMediaFile", { projectId, fileId: file.id, url });
      if (tab.closed) return;
      if (!result.proceed) {
        tab.close();
        showToast(result.message || t("media.viewFailed"), "error");
        return;
      }
      // Through a link in the tab itself, so the request sends no referrer
      // (navigating the tab from here would send the editor's address).
      const link = tab.document.createElement("a");
      link.href = new URL(url, window.location.href).href;
      link.rel = "noreferrer";
      link.referrerPolicy = "no-referrer";
      tab.document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Error opening file:", error);
      if (!tab.closed) tab.close();
      showToast(t("media.viewFailed"), "error");
    }
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
