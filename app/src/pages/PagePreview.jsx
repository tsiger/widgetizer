import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Monitor, Smartphone } from "lucide-react";

import usePageStore from "@widgetizer/editor-ui/stores/pageStore";
import useThemeStore from "@widgetizer/editor-ui/stores/themeStore";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import PreviewPanel from "@widgetizer/editor-ui/components/pageEditor/PreviewPanel.jsx";
import { isStandalonePreviewNavigationUrl } from "@widgetizer/editor-ui/utils/previewLinkUtils";

import LoadingSpinner from "@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx";
import DebugStatePanel from "../components/dev/DebugStatePanel";

export default function PagePreview() {
  const { t } = useTranslation();
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(() => localStorage.getItem("editorPreviewMode") || "desktop");
  const activeProject = useProjectStore((state) => state.activeProject);

  const { page, loading, error, loadPage } = usePageStore();
  const themeSettings = useThemeStore((s) => s.settings);

  // Load initial data from stores — but only once the active project is seeded.
  // A freshly opened preview window/tab cold-boots and resolves activeProject a
  // beat after first render; loading (and mounting PreviewPanel) before that means
  // the activeProject `undefined → id` flip resets the preview mid-load and aborts
  // the in-flight /render/<token> iframe. Gate on activeProject?.id, as hosted's
  // StandalonePreview already does.
  useEffect(() => {
    if (!activeProject?.id) return;
    loadPage(pageId);
  }, [pageId, activeProject?.id, loadPage]);

  // Handle cross-origin navigation requests from the preview iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const targetUrl = event.data?.payload?.url;
      if (event.data?.type === "NAVIGATE_PREVIEW" && isStandalonePreviewNavigationUrl(targetUrl)) {
        navigate(targetUrl);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  // Hold at the loading gate until the active project is seeded, so PreviewPanel
  // never mounts during the activeProject `undefined → id` window (see the load
  // effect above).
  if (!activeProject || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <LoadingSpinner message={t("pagePreview.loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <p className="text-red-500">Error: {String(error)}</p>
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
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <DebugStatePanel />
      <div className="bg-white border-b border-slate-200 p-2 flex items-center justify-center">
        <div className="flex gap-1 p-1 h-9 bg-slate-200 rounded-md items-center">
          <button
            onClick={() => {
              setPreviewMode("desktop");
              localStorage.setItem("editorPreviewMode", "desktop");
            }}
            title={t("pageEditor.toolbar.desktopView")}
            className={`p-1.5 rounded ${
              previewMode === "desktop" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Monitor size={18} />
          </button>
          <button
            onClick={() => {
              setPreviewMode("mobile");
              localStorage.setItem("editorPreviewMode", "mobile");
            }}
            title={t("pageEditor.toolbar.mobileView")}
            className={`p-1.5 rounded ${
              previewMode === "mobile" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <PreviewPanel
          page={page}
          widgets={page?.widgets || {}}
          themeSettings={themeSettings}
          previewMode={previewMode}
          runtimeMode="standalone"
          showSelectionOverlay={false}
          selectedWidgetId={null}
          selectedBlockId={null}
          selectedGlobalWidgetId={null}
        />
      </div>
    </div>
  );
}
