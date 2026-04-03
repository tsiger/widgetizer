import { Navigate } from "react-router-dom";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import useProjectStore from "../stores/projectStore";

export default function HomeRedirect() {
  const { activeProject, loading } = useProjectStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  return <Navigate to={activeProject ? "/pages" : "/projects"} replace />;
}
