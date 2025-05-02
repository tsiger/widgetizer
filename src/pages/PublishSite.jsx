import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import { getActiveProject } from "../utils/projectManager";
import { publishProjectAPI } from "../utils/publishManager";
import useToastStore from "../stores/toastStore";
import { Loader2 } from "lucide-react";

export default function PublishSite() {
  const [activeProject, setActiveProject] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
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

  const handlePublish = async () => {
    if (!activeProject || !activeProject.id) {
      showToast("Active project ID is not available.", "error");
      return;
    }

    setIsPublishing(true);
    setLastOutputDir(null);

    try {
      const result = await publishProjectAPI(activeProject.id);
      if (result.success) {
        showToast(result.message || "Project published successfully!", "success");
        if (result.outputDir) {
          setLastOutputDir(result.outputDir);
        }
      } else {
        showToast(result.message || "Publishing failed with an unknown issue.", "error");
      }
    } catch (err) {
      console.error("Publishing failed:", err);
      showToast(err.message || "An unknown error occurred during publishing.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const buttonClasses =
    "px-4 py-2 bg-pink-600 text-white rounded-sm hover:bg-pink-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center";

  return (
    <PageLayout title={`Publish Site: ${activeProject?.name || "..."}`}>
      <div className="space-y-4 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
        <p className="text-slate-600">Click the button below to generate a static HTML version of your site.</p>
        <p className="text-slate-600">
          The generated files will be placed in a timestamped folder within the application's{" "}
          <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">data/publish</code> directory.
        </p>

        <button onClick={handlePublish} disabled={isPublishing || !activeProject} className={buttonClasses}>
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
            </>
          ) : (
            "Publish Project"
          )}
        </button>

        {lastOutputDir && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
            <p className="text-sm font-medium text-green-800">Last publish successful!</p>
            <p className="mt-1 text-sm text-green-700">
              Output Directory: <code className="bg-green-100 text-green-900 px-1 py-0.5 rounded">{lastOutputDir}</code>
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
