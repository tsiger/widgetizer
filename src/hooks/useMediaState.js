import { useState, useEffect } from "react";
import { getProjectMedia, refreshMediaUsage, invalidateMediaCache } from "../queries/mediaManager";
import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";

/**
 * Hook for managing the media library state including files, view mode, filtering, and search.
 * Automatically loads media files when the active project changes and persists view mode preference.
 *
 * @returns {{
 *   files: Array,
 *   setFiles: Function,
 *   loading: boolean,
 *   viewMode: string,
 *   setViewMode: Function,
 *   searchTerm: string,
 *   setSearchTerm: Function,
 *   filterType: string,
 *   setFilterType: Function,
 *   filteredFiles: Array,
 *   activeProject: Object|null,
 *   showToast: Function,
 *   loadMediaFiles: (forceRefresh?: boolean) => Promise<void>,
 *   handleRefreshUsage: () => Promise<void>
 * }} Media state and actions
 * @property {Array} files - All media files for the active project
 * @property {Function} setFiles - Update the files array
 * @property {boolean} loading - Whether media files are being loaded
 * @property {string} viewMode - Current view mode ('grid' or 'list')
 * @property {Function} setViewMode - Change the view mode
 * @property {string} searchTerm - Current search filter text
 * @property {Function} setSearchTerm - Update the search filter
 * @property {string} filterType - Current type filter ('all', 'image', 'video', 'audio')
 * @property {Function} setFilterType - Update the type filter
 * @property {Array} filteredFiles - Files filtered by search term and type
 * @property {Object|null} activeProject - The currently active project
 * @property {Function} showToast - Function to display toast notifications
 * @property {Function} loadMediaFiles - Reload media files, optionally forcing cache refresh
 * @property {Function} handleRefreshUsage - Refresh media usage tracking data
 */
export default function useMediaState() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("mediaViewMode") || "grid";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Get active project from the store
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // Load media files when active project changes
  useEffect(() => {
    if (activeProject) {
      loadMediaFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject]);

  // Update localStorage when viewMode changes
  useEffect(() => {
    localStorage.setItem("mediaViewMode", viewMode);
  }, [viewMode]);

  const loadMediaFiles = async (forceRefresh = false) => {
    if (!activeProject) return;
    setLoading(true);

    try {
      // If forcing refresh, invalidate cache first
      if (forceRefresh) {
        invalidateMediaCache(activeProject.id);
      }
      const data = await getProjectMedia(activeProject.id, forceRefresh);
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
      await loadMediaFiles(true); // Force reload to get updated usage data
      showToast("Media usage tracking refreshed", "success");
    } catch {
      showToast("Failed to refresh media usage tracking", "error");
    }
  };

  // Filter files based on search term and type
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all"
        ? true
        : filterType === "image"
        ? file.type.startsWith("image/")
        : filterType === "video"
        ? file.type.startsWith("video/")
        : filterType === "audio"
        ? file.type.startsWith("audio/")
        : true;

    return matchesSearch && matchesType;
  });

  return {
    // State
    files,
    setFiles,
    loading,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filteredFiles,
    activeProject,
    showToast,

    // Actions
    loadMediaFiles,
    handleRefreshUsage,
  };
}
