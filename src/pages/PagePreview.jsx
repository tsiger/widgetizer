import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import usePageStore from "../stores/pageStore";
import PreviewPanel from "../components/pageEditor/PreviewPanel";

import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function PagePreview() {
  const { t } = useTranslation();
  const { pageId } = useParams();

  const { page, loading, error, loadPage, themeSettings } = usePageStore();

  // Load initial data from stores
  useEffect(() => {
    loadPage(pageId);
  }, [pageId, loadPage]);

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
        includeBaseTag={false}
        showSelectionOverlay={false}
        selectedWidgetId={null}
        selectedBlockId={null}
        selectedGlobalWidgetId={null}
      />
    </div>
  );
}
