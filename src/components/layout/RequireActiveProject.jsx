import { Navigate, Outlet } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { Rocket } from "lucide-react";
import { Link } from "react-router-dom";
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
    return (
      <EmptyState
        icon={<Rocket />}
        title="No Active Project"
        description="Please create or select a project to continue."
      >
        <Button asChild>
          <Link to="/projects">Go to Projects</Link>
        </Button>
      </EmptyState>
    );
  }

  return <Outlet />;
}

export default RequireActiveProject;
