import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
 *   structuredDataSummary: Object|null,
 *   setStructuredDataSummary: Function,
 *   skippedLanguages: Array,
 *   setSkippedLanguages: Function,
 *   exportHistory: Array,
 *   setExportHistory: Function,
 *   loadingHistory: boolean,
 *   historyFailed: boolean,
 *   maxVersionsToKeep: number,
 *   developerMode: boolean,
 *   loadExportHistory: (projectId: string) => Promise<void>
 * }} Export state and actions
 */
export default function useExportState() {
  const [lastExport, setLastExport] = useState(null);
  const [structuredDataSummary, setStructuredDataSummary] = useState(null);
  const [skippedLanguages, setSkippedLanguages] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // The last load failed, so the list shown is empty or out of date, not the history.
  const [historyFailed, setHistoryFailed] = useState(false);
  const { t } = useTranslation();
  const [maxVersionsToKeep, setMaxVersionsToKeep] = useState(10);
  const [developerMode, setDeveloperMode] = useState(false);

  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // One gate for every history load (the page opening, Try again, the refresh
  // after an export): each load takes a token, and only the newest one's result
  // is applied, so an older load that settles late, failed or not, can't
  // overwrite it. A project switch invalidates the gate too.
  const gateRef = useRef(createAsyncRequestGate());

  // Load export history (Try again, and the refresh after an export completes).
  const loadExportHistory = async (projectId) => {
    if (!projectId) return;

    const gate = gateRef.current;
    const token = gate.start();
    // The project check stays: an export started in one project can finish
    // after the user switched to another.
    const isCurrent = () => gate.isCurrent(token) && useProjectStore.getState().activeProject?.id === projectId;
    setLoadingHistory(true);
    try {
      const result = await getExportHistory(projectId);
      if (!isCurrent()) return;
      setExportHistory(result.exports || []);
      if (result.maxVersionsToKeep) {
        setMaxVersionsToKeep(result.maxVersionsToKeep);
      }
      setDeveloperMode(Boolean(result.developerMode));
      setHistoryFailed(false);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Failed to load export history:", error);
      setHistoryFailed(true);
      showToast(t("exportSite.history.loadError"), "error");
    } finally {
      if (isCurrent()) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!activeProject?.id) {
      setExportHistory([]);
      setLastExport(null);
      setStructuredDataSummary(null);
      setSkippedLanguages([]);
      setLoadingHistory(false);
      setHistoryFailed(false);
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
        setDeveloperMode(Boolean(result.developerMode));
        setHistoryFailed(false);
      })
      .catch((err) => {
        if (!gate.isCurrent(token)) return;
        console.error("Failed to fetch export history:", err);
        setHistoryFailed(true);
        showToast(t("exportSite.history.loadError"), "error");
      })
      .finally(() => {
        if (gate.isCurrent(token)) setLoadingHistory(false);
      });

    return () => gate.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` changing must not refetch the history
  }, [activeProject?.id, showToast]);

  return {
    activeProject,
    lastExport,
    setLastExport,
    structuredDataSummary,
    setStructuredDataSummary,
    skippedLanguages,
    setSkippedLanguages,
    exportHistory,
    setExportHistory,
    loadingHistory,
    historyFailed,
    maxVersionsToKeep,
    developerMode,
    loadExportHistory,
  };
}
