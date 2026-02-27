import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import { apiFetch } from "../../lib/apiFetch";
import LoadingSpinner from "../ui/LoadingSpinner";

/**
 * Handles deep-link URL parameters on initial load:
 *
 * 1. ?siteId=xxx  — From publisher "Edit in Editor". Looks up the project
 *    by its published site ID, sets it as active, navigates to /pages.
 *
 * Renders inside Layout, wrapping all child routes.
 * Runs once on initial load — does not interfere with subsequent navigation.
 */
export default function DeepLinkResolver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);
  const siteId = searchParams.get("siteId");
  const [resolving, setResolving] = useState(!!siteId);
  const processedRef = useRef(false);

  useEffect(() => {
    // Only process once, and only after the project store finishes loading
    if (processedRef.current || loading) return;
    processedRef.current = true;

    if (!siteId) return;

    // Deep-link from publisher: look up project by published site ID
    resolveSiteId(siteId).then((project) => {
      if (project) {
        useProjectStore.getState().setActiveProject(project);
        navigate("/pages", { replace: true });
      } else {
        // Project not found — might have been deleted
        navigate("/projects/add", { replace: true });
      }
      setResolving(false);
    });
  }, [loading, siteId, activeProject, navigate]);

  if (loading || resolving) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner message="Setting up your project..." />
      </div>
    );
  }

  return <Outlet />;
}

/**
 * Look up a project by its published site ID and set it as active.
 * @param {string} siteId - The publisher website ID
 * @returns {Promise<object|null>} The project, or null if not found
 */
async function resolveSiteId(siteId) {
  try {
    const response = await apiFetch(`/api/projects/by-site/${encodeURIComponent(siteId)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
