import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import usePageStore from "../stores/pageStore";
import PreviewPanel from "../components/pageEditor/PreviewPanel";

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
      if (event.data?.type === "NAVIGATE_PREVIEW") {
        navigate(event.data.payload.url);
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
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
  );
}
