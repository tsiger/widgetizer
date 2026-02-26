import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import { HOSTED_MODE, PUBLISHER_URL } from "../../config";
import { apiFetch } from "../../lib/apiFetch";
import { deepLinkCreateProject } from "../../queries/projectManager";
import LoadingSpinner from "../ui/LoadingSpinner";

/**
 * Handles deep-link URL parameters on initial load:
 *
 * 1. ?siteId=xxx  — From publisher "Edit in Editor". Looks up the project
 *    by its published site ID, sets it as active, navigates to /pages.
 *
 * 2. ?theme=xxx&preset=xxx&source=xxx  — From marketing site theme gallery.
 *    Finds existing project by name or creates a new one (find-or-create).
 *    Always sets as active, navigates to /pages. Only in HOSTED_MODE.
 *
 * 3. First-run fallback (HOSTED_MODE only) — If no params and no active
 *    project after loading, redirects to /projects/add.
 *
 * Renders inside Layout, wrapping all child routes.
 * Runs once on initial load — does not interfere with subsequent navigation.
 */
export default function DeepLinkResolver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);
  const [resolving, setResolving] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    // Only process once, and only after the project store finishes loading
    if (processedRef.current || loading) return;

    const siteId = searchParams.get("siteId");
    const theme = searchParams.get("theme");
    const preset = searchParams.get("preset");
    const source = searchParams.get("source");

    if (siteId) {
      // Deep-link from publisher: look up project by published site ID
      processedRef.current = true;
      setResolving(true);
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
    } else if (theme && HOSTED_MODE) {
      // Deep-link from marketing site: create project and activate it
      processedRef.current = true;
      setResolving(true);
      const name = searchParams.get("name") || "My Website";
      deepLinkCreateProject({ name, theme, preset: preset || undefined, source: source || "theme" })
        .then((project) => {
          // Backend already set this as active — sync the store
          useProjectStore.getState().setActiveProject(project);
          navigate("/pages", { replace: true });
          setResolving(false);
        })
        .catch(() => {
          // Failed — fall back to manual creation
          navigate("/projects/add", { replace: true });
          setResolving(false);
        });
    } else if (HOSTED_MODE && !activeProject) {
      // No deep-link params and no active project — user landed on the editor directly.
      // Send them to the publisher dashboard.
      processedRef.current = true;
      window.location.href = `${PUBLISHER_URL}/dashboard`;
    } else {
      // Normal navigation — no deep-link params
      processedRef.current = true;
    }
  }, [loading, searchParams, activeProject, navigate]);

  // Show spinner while:
  // - Store is loading (waiting for active project fetch)
  // - Actively resolving a deep-link (API call in progress)
  // - Deep-link params are present but effect hasn't processed them yet
  //   (closes the race between useEffect and synchronous child renders like HostedModeGuard)
  const hasUnprocessedDeepLink =
    !processedRef.current && (searchParams.has("siteId") || (searchParams.has("theme") && HOSTED_MODE));

  if (loading || resolving || hasUnprocessedDeepLink) {
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
