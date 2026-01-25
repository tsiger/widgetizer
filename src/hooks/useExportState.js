import { useState, useEffect } from "react";
import { getActiveProject } from "../queries/projectManager";
import { getExportHistory } from "../queries/exportManager";
import useToastStore from "../stores/toastStore";

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
