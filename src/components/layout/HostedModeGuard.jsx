import { Outlet, Navigate } from "react-router-dom";
import useAppInfoStore from "../../stores/appInfoStore";

/**
 * Route guard that blocks open-source-only routes in hosted mode.
 *
 * In hosted mode the editor is project-scoped (users arrive via deep link).
 * The dashboard / projects list lives in the separate dashboard app, so the
 * editor's own Dashboard, Projects, ProjectsAdd, and ProjectsEdit routes
 * should redirect to /pages.
 *
 * While the appInfo hasn't loaded yet we render nothing (avoids a flash of
 * the Dashboard page followed by a redirect).
 */
function HostedModeGuard() {
  const hostedMode = useAppInfoStore((state) => state.hostedMode);
  const loaded = useAppInfoStore((state) => state.loaded);

  // Wait for the /api/core/info response before deciding
  if (!loaded) return null;

  if (hostedMode) {
    return <Navigate to="/pages" replace />;
  }

  return <Outlet />;
}

export default HostedModeGuard;
