import { useState, useEffect, useRef } from "react";
import { getExportHistory } from "../queries/exportManager";
import { createAsyncRequestGate } from "../lib/asyncRequestGate";
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
 */
export default function useExportState() {
  const [lastExport, setLastExport] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [maxVersionsToKeep, setMaxVersionsToKeep] = useState(10);

  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // Gate for the effect-driven initial load — start/invalidate replaces the
  // closure `stale` boolean so late responses are safely dropped.
  const gateRef = useRef(createAsyncRequestGate());

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
    } finally {
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

    const gate = gateRef.current;
    const token = gate.start();
    const projectId = activeProject.id;

    setLoadingHistory(true);
    getExportHistory(projectId)
      .then((result) => {
        if (!gate.isCurrent(token)) return;
        setExportHistory(result.exports || []);
        if (result.maxVersionsToKeep) {
          setMaxVersionsToKeep(result.maxVersionsToKeep);
        }
      })
      .catch((err) => {
        if (!gate.isCurrent(token)) return;
        console.error("Failed to fetch export history:", err);
        showToast("Could not load active project details.", "error");
      })
      .finally(() => {
        if (gate.isCurrent(token)) setLoadingHistory(false);
      });

    return () => gate.invalidate();
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
