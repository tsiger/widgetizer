import { Navigate } from "react-router-dom";
import { HOSTED_MODE, PUBLISHER_URL } from "../../config";
import useProjectStore from "../../stores/projectStore";

/**
 * Route guard that redirects away from pages hidden in hosted mode
 * (Dashboard, Projects list, Project edit).
 *
 * In open-source mode, renders children as-is.
 * In hosted mode, redirects to /pages (if active project) or the publisher dashboard (if none).
 */
export default function HostedModeGuard({ children }) {
  const activeProject = useProjectStore((s) => s.activeProject);

  if (!HOSTED_MODE) return children;

  if (activeProject) return <Navigate to="/pages" replace />;

  // No active project — user landed on the editor directly. Send them to the publisher.
  window.location.href = `${PUBLISHER_URL}/dashboard`;
  return null;
}
