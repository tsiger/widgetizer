import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import { API_URL } from "../config";
import useProjectStore from "../stores/projectStore";
import usePageStore from "../stores/pageStore";
import useThemeStore from "../stores/themeStore";
import { fetchPreview } from "../queries/previewManager";

import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function PagePreview() {
  const { pageId } = useParams();
  const iframeRef = useRef(null);

  // Get data from stores, mimicking PageEditor
  const { page, globalWidgets, loading: pageLoading, error: pageError, loadPage } = usePageStore();
  const { settings: themeSettings, loadSettings } = useThemeStore();
  const { activeProject } = useProjectStore();

  const [previewHtml, setPreviewHtml] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(true);
  const [htmlError, setHtmlError] = useState(null);

  // Load initial data from stores
  useEffect(() => {
    loadPage(pageId);
    loadSettings();
  }, [pageId, loadPage, loadSettings]);

  // Fetch the rendered HTML from the server
  useEffect(() => {
    if (page && themeSettings && globalWidgets) {
      const loadPreviewHtml = async () => {
        try {
          setLoadingHtml(true);
          setHtmlError(null);

          // Create enhanced page data with global widgets for preview (same as PreviewPanel)
          const enhancedPageData = {
            ...page,
            // Add global widgets back for server rendering
            globalWidgets: globalWidgets,
          };

          const html = await fetchPreview(enhancedPageData, themeSettings);
          setPreviewHtml(html);
        } catch (err) {
          setHtmlError(err.message || "Failed to load preview.");
        } finally {
          setLoadingHtml(false);
        }
      };
      loadPreviewHtml();
    }
  }, [page, themeSettings, globalWidgets]);

  // Update iframe content when HTML changes
  useEffect(() => {
    if (!iframeRef.current || !previewHtml || !activeProject) return;

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        iframeDoc.open();
        const transformedHtml = previewHtml.replace(
          /src="\/uploads\/images\//g,
          `src="${API_URL("/api/media/projects/")}${activeProject.id}/uploads/images/"`,
        );
        iframeDoc.write(transformedHtml);
        iframeDoc.close();
      }
    } catch (e) {
      console.error("Error writing to iframe:", e);
      setHtmlError("Failed to render preview.");
    }
  }, [previewHtml, activeProject]);

  const isLoading = pageLoading || loadingHtml;
  const anyError = pageError || htmlError;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <LoadingSpinner message="Loading Preview..." />
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <p className="text-red-500">Error: {String(anyError)}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <p className="text-yellow-500">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <iframe ref={iframeRef} title={page.name || "Page Preview"} className="h-full w-full border-0" />
    </div>
  );
}
