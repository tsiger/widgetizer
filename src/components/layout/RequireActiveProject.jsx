import { Navigate, Outlet } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import LoadingSpinner from "../ui/LoadingSpinner";

function RequireActiveProject() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeProject) {
    return <Navigate to="/projects" replace />;
  }

  return <Outlet />;
}

export default RequireActiveProject;
