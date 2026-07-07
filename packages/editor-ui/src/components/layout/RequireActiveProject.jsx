import { Navigate, Outlet } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import LoadingSpinner from "../ui/LoadingSpinner";
import WorkspaceLoadFailed from "../ui/WorkspaceLoadFailed";

function RequireActiveProject() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);
  const error = useProjectStore((state) => state.error);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // A failed probe is NOT "no project" — offer retry instead of bouncing to the picker.
  if (error && !activeProject) {
    return <WorkspaceLoadFailed onRetry={fetchActiveProject} />;
  }

  if (!activeProject) {
    return <Navigate to="/projects" replace />;
  }

  // Key by project ID so all project-owned routes remount on project switch.
  // Singleton-store resets are coordinated higher in App.jsx so they also run
  // when the user switches projects from the admin shell.
  return <Outlet key={activeProject.id} />;
}

export default RequireActiveProject;
