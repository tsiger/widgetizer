import { useState, useEffect } from "react";
import { getProjectMedia, refreshMediaUsage } from "../queries/mediaManager";
import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";

export default function useMediaState() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("mediaViewMode") || "grid";
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Get active project from the store
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

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
    } catch {
      showToast("Failed to load media files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshUsage = async () => {
    if (!activeProject) return;

    try {
      await refreshMediaUsage(activeProject.id);
      await loadMediaFiles(); // Reload to get updated usage data
      showToast("Media usage tracking refreshed", "success");
    } catch {
      showToast("Failed to refresh media usage tracking", "error");
    }
  };

  // Filter files based on search term
  const filteredFiles = files.filter((file) => file.originalName.toLowerCase().includes(searchTerm.toLowerCase()));

  return {
    // State
    files,
    setFiles,
    loading,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filteredFiles,
    activeProject,
    showToast,

    // Actions
    loadMediaFiles,
    handleRefreshUsage,
  };
}
