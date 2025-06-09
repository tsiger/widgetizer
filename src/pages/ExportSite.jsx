import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import { getActiveProject } from "../utils/projectManager";
import { exportProjectAPI } from "../utils/exportManager";
import useToastStore from "../stores/toastStore";
import { Loader2 } from "lucide-react";

export default function ExportSite() {
  const [activeProject, setActiveProject] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastOutputDir, setLastOutputDir] = useState(null);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    async function fetchActiveProject() {
      try {
        const project = await getActiveProject();
        setActiveProject(project);
      } catch (err) {
        console.error("Failed to fetch active project:", err);
        showToast("Could not load active project details.", "error");
      }
    }
    fetchActiveProject();
  }, [showToast]);

  const handleExport = async () => {
    if (!activeProject || !activeProject.id) {
      showToast("Active project ID is not available.", "error");
      return;
    }

    setIsExporting(true);
    setLastOutputDir(null);

    try {
      const result = await exportProjectAPI(activeProject.id);
      if (result.success) {
        showToast(result.message || "Project exported successfully!", "success");
        if (result.outputDir) {
          setLastOutputDir(result.outputDir);
        }
      } else {
        showToast(result.message || "Exporting failed with an unknown issue.", "error");
      }
    } catch (err) {
      console.error("Exporting failed:", err);
      showToast(err.message || "An unknown error occurred during exporting.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageLayout title={`Export Site: ${activeProject?.name || "..."}`}>
      <div className="space-y-4 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
        <p className="text-slate-600">
          Click the button below to generate a static HTML version of your site for export.
        </p>
        <p className="text-slate-600">
          The generated files will be placed in a timestamped folder within the application's{" "}
          <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">data/publish</code> directory.
        </p>

        <Button
          onClick={handleExport}
          disabled={isExporting || !activeProject}
          variant="primary"
          icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        >
          {isExporting ? "Exporting..." : "Export Project"}
        </Button>

        {lastOutputDir && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
            <p className="text-sm font-medium text-green-800">Last export successful!</p>
            <p className="mt-1 text-sm text-green-700">
              Output Directory: <code className="bg-green-100 text-green-900 px-1 py-0.5 rounded">{lastOutputDir}</code>
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
