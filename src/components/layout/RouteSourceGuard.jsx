import { Outlet, Navigate, useLocation } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import { isPathRestrictedForSource, getDefaultPathForSource } from "../../config/navigation";

/**
 * Route guard that redirects users away from routes hidden for their project's source type.
 * Prevents URL-bar bypass of sidebar filtering.
 *
 * Nests inside RequireActiveProject, so activeProject is guaranteed to exist.
 */
function RouteSourceGuard() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const location = useLocation();
  const source = activeProject?.source;

  if (isPathRestrictedForSource(location.pathname, source)) {
    return <Navigate to={getDefaultPathForSource(source)} replace />;
  }

  return <Outlet />;
}

export default RouteSourceGuard;
