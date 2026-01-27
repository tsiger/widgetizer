import { useState, useEffect } from "react";
import { getActiveProject } from "../queries/projectManager";
import { getExportHistory } from "../queries/exportManager";
import useToastStore from "../stores/toastStore";

/**
 * Hook for managing site export state including active project, export history, and last export info.
 * Automatically loads the active project and its export history on mount.
 *
 * @returns {{
 *   activeProject: Object|null,
 *   lastExport: Object|null,
 *   setLastExport: Function,
 *   exportHistory: Array,
 *   setExportHistory: Function,
 *   loadingHistory: boolean,
 *   maxVersionsToKeep: number,
 *   loadExportHistory: (projectId: string) => Promise<void>
 * }} Export state and actions
 * @property {Object|null} activeProject - The currently active project
 * @property {Object|null} lastExport - The most recent export details
 * @property {Function} setLastExport - Update the last export state
 * @property {Array} exportHistory - List of previous exports for the project
 * @property {Function} setExportHistory - Update the export history list
 * @property {boolean} loadingHistory - Whether export history is being loaded
 * @property {number} maxVersionsToKeep - Maximum number of export versions to retain
 * @property {Function} loadExportHistory - Fetch export history for a given project ID
 */
export default function useExportState() {
  const [activeProject, setActiveProject] = useState(null);
  const [lastExport, setLastExport] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [maxVersionsToKeep, setMaxVersionsToKeep] = useState(10);

  const showToast = useToastStore((state) => state.showToast);

  // Load export history
  const loadExportHistory = async (projectId) => {
    if (!projectId) return;

    setLoadingHistory(true);
    try {
      const result = await getExportHistory(projectId);
      setExportHistory(result.exports || []);
      if (result.maxVersionsToKeep) {
        setMaxVersionsToKeep(result.maxVersionsToKeep);
      }
    } catch (error) {
      console.error("Failed to load export history:", error);
      // Don't show toast for this as it's not critical
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load active project on mount
  useEffect(() => {
    async function fetchActiveProject() {
      try {
        const project = await getActiveProject();
        setActiveProject(project);
        if (project?.id) {
          loadExportHistory(project.id);
        }
      } catch (err) {
        console.error("Failed to fetch active project:", err);
        showToast("Could not load active project details.", "error");
      }
    }
    fetchActiveProject();
  }, [showToast]);

  return {
    activeProject,
    lastExport,
    setLastExport,
    exportHistory,
    setExportHistory,
    loadingHistory,
    maxVersionsToKeep,
    loadExportHistory,
  };
}
