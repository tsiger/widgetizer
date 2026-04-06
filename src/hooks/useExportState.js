import { useState, useEffect } from "react";
import { getExportHistory } from "../queries/exportManager";
import useProjectStore from "../stores/projectStore";
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
  const [lastExport, setLastExport] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [maxVersionsToKeep, setMaxVersionsToKeep] = useState(10);

  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // Load export history — guards against stale responses when called
  // after an export completes and the active project has changed since.
  const loadExportHistory = async (projectId) => {
    if (!projectId) return;

    setLoadingHistory(true);
    try {
      const result = await getExportHistory(projectId);
      // Drop the response if the active project changed during the fetch
      if (useProjectStore.getState().activeProject?.id !== projectId) return;
      setExportHistory(result.exports || []);
      if (result.maxVersionsToKeep) {
        setMaxVersionsToKeep(result.maxVersionsToKeep);
      }
    } catch (error) {
      if (useProjectStore.getState().activeProject?.id !== projectId) return;
      console.error("Failed to load export history:", error);
      // Don't show toast for this as it's not critical
    } finally {
      // Only clear loading if this request is still relevant to the active project
      if (useProjectStore.getState().activeProject?.id === projectId) {
        setLoadingHistory(false);
      }
    }
  };

  useEffect(() => {
    if (!activeProject?.id) {
      setExportHistory([]);
      setLastExport(null);
      setLoadingHistory(false);
      return;
    }

    let stale = false;
    const projectId = activeProject.id;

    setLoadingHistory(true);
    getExportHistory(projectId)
      .then((result) => {
        if (stale) return;
        setExportHistory(result.exports || []);
        if (result.maxVersionsToKeep) {
          setMaxVersionsToKeep(result.maxVersionsToKeep);
        }
      })
      .catch((err) => {
        if (stale) return;
        console.error("Failed to fetch export history:", err);
        showToast("Could not load active project details.", "error");
      })
      .finally(() => {
        if (!stale) setLoadingHistory(false);
      });

    return () => { stale = true; };
  }, [activeProject?.id, showToast]);

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
