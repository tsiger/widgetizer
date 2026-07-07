import { Navigate } from "react-router-dom";
import LoadingSpinner from "@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx";
import WorkspaceLoadFailed from "@widgetizer/editor-ui/components/ui/WorkspaceLoadFailed.jsx";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";

export default function HomeRedirect() {
  const { activeProject, loading, error, fetchActiveProject } = useProjectStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  // A failed probe is NOT "no project" — offer retry instead of bouncing to the picker.
  if (error && !activeProject) {
    return <WorkspaceLoadFailed onRetry={fetchActiveProject} />;
  }

  return <Navigate to={activeProject ? "/pages" : "/projects"} replace />;
}
