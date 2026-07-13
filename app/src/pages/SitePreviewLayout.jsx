import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { isStandalonePreviewNavigationUrl } from "@widgetizer/editor-ui/utils/previewLinkUtils";
import PreviewModeToggle from "@widgetizer/editor-ui/components/preview/PreviewModeToggle.jsx";
import PreviewStage, { STANDALONE_SANDBOX } from "@widgetizer/editor-ui/components/preview/PreviewStage.jsx";
import DebugStatePanel from "../components/dev/DebugStatePanel";

/**
 * Persistent shell for the standalone site preview (browse like a visitor). Owns
 * the toolbar, the device toggle, the iframe stage, and link navigation. Child
 * routes (page / collection item) only resolve which render token to show and
 * report it up via the outlet context's setPreview(). Because the toolbar and
 * stage live here, navigating page<->item never remounts them — no flash, one
 * loader, identical look for both kinds of page.
 */
export default function SitePreviewLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [previewMode, setPreviewMode] = useState(() => localStorage.getItem("editorPreviewMode") || "desktop");
  const [preview, setPreview] = useState({ src: null, loading: true, notFound: false });
  const [resolvedPath, setResolvedPath] = useState(location.pathname);

  // On navigation, drop back to a loading state — done during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, so the
  // stage never shows the previous page while the next child resolves its token.
  if (location.pathname !== resolvedPath) {
    setResolvedPath(location.pathname);
    setPreview({ src: null, loading: true, notFound: false });
  }

  // Follow links clicked inside the preview iframe (page<->page, page<->item).
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

  const chooseMode = (mode) => {
    setPreviewMode(mode);
    localStorage.setItem("editorPreviewMode", mode);
  };

  // Stable context value — setPreview from useState is referentially stable.
  const outletContext = useMemo(() => ({ setPreview }), []);

  const isMobile = previewMode === "mobile";
  const { src, loading, notFound } = preview;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <DebugStatePanel />
      <div className="flex items-center justify-center border-b border-slate-200 bg-white p-2">
        <PreviewModeToggle mode={previewMode} onChange={chooseMode} />
      </div>

      <PreviewStage
        src={src}
        loading={loading}
        notFound={notFound}
        isMobile={isMobile}
        title={t("pageEditor.preview.title")}
        sandbox={STANDALONE_SANDBOX}
        loadingMessage={t("pagePreview.loading")}
        notFoundMessage={t("pagePreview.notFound")}
      />

      <Outlet context={outletContext} />
    </div>
  );
}
