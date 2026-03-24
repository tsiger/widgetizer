import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import usePageStore from "../stores/pageStore";
import PreviewPanel from "../components/pageEditor/PreviewPanel";
import { isStandalonePreviewNavigationUrl } from "../utils/previewLinkUtils";

import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function PagePreview() {
  const { t } = useTranslation();
  const { pageId } = useParams();
  const navigate = useNavigate();

  const { page, loading, error, loadPage, themeSettings } = usePageStore();

  // Load initial data from stores
  useEffect(() => {
    loadPage(pageId);
  }, [pageId, loadPage]);

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

  if (loading) {
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
      <div className="bg-white border-b border-slate-200 p-2 flex items-center">
        <button
          onClick={() => navigate(`/page-editor?pageId=${pageId}`)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm hover:bg-slate-100 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={18} />
          {t("pagePreview.backToEditor")}
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <PreviewPanel
          page={page}
          widgets={page?.widgets || {}}
          themeSettings={themeSettings}
          previewMode="desktop"
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
