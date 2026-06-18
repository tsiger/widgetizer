import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Monitor, Smartphone } from "lucide-react";

import useCollections from "@widgetizer/editor-ui/hooks/useCollections";
import { getCollectionItem, previewCollectionItem } from "@widgetizer/editor-ui/queries/collectionManager";
import { getPreviewRenderBase } from "@widgetizer/editor-ui/lib/previewBase";
import { isStandalonePreviewNavigationUrl } from "@widgetizer/editor-ui/utils/previewLinkUtils";
import LoadingSpinner from "@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx";
import DebugStatePanel from "../components/dev/DebugStatePanel";

// Build the preview URL from a token (mirrors PreviewPanel.buildPreviewUrl): the
// render base defaults to today's behaviour but a nested host can override it, and
// the editor origin rides along so the runtime can target its replies.
function buildPreviewUrl(token) {
  const url = `${getPreviewRenderBase()}/render/${token}`;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}parentOrigin=${encodeURIComponent(window.location.origin)}`;
}

/**
 * Standalone site preview for a collection item page, reached by navigating to
 * `/preview/collection/:prefix/:slug` — either from the editor's item Preview
 * button or by clicking a nested item link while browsing the site preview. It
 * resolves the URL slugPrefix to a collection type via useCollections (only
 * hasItemPages collections qualify), loads the saved item, requests a render
 * token through previewCollectionItem -> /render/:token, and shows it in the same
 * desktop/mobile iframe chrome as the page preview. Cross-origin link clicks in
 * the iframe bubble up as NAVIGATE_PREVIEW and drive in-app navigation.
 */
export default function CollectionItemPagePreview() {
  const { t } = useTranslation();
  const { prefix, slug } = useParams();
  const navigate = useNavigate();
  const { schemas, loading: schemasLoading } = useCollections();

  const [previewMode, setPreviewMode] = useState(() => localStorage.getItem("editorPreviewMode") || "desktop");
  // The resolved render result, tagged with the request `key` it belongs to, so a
  // stale resolve from a previous item never shows after a fast prefix/slug switch.
  // All setState happens inside the async callback (never synchronously in the
  // effect body) — loading/notFound are derived at render time instead.
  const [resolved, setResolved] = useState(null);

  // Resolve the URL slugPrefix (e.g. "rooms") to a collection type (e.g.
  // "accommodation"). Only collections that actually produce item pages qualify.
  const schema = useMemo(
    () => (schemas || []).find((s) => s.slugPrefix === prefix && s.hasItemPages),
    [schemas, prefix],
  );
  const requestKey = schema ? `${schema.type}/${slug}` : null;

  // Resolve the item -> a render token -> the iframe src.
  useEffect(() => {
    if (!requestKey || !schema) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const item = await getCollectionItem(schema.type, slug);
        const { token } = await previewCollectionItem({
          collectionType: schema.type,
          slug: item.slug,
          settings: item.settings || {},
        });
        if (!cancelled) setResolved({ key: requestKey, src: buildPreviewUrl(token) });
      } catch {
        if (!cancelled) setResolved({ key: requestKey, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, schema, slug]);

  // Derive UI state (no effect-driven setState): the resolve only counts when it
  // matches the current request key.
  const matches = resolved && resolved.key === requestKey;
  const previewSrc = matches && !resolved.error ? resolved.src : null;
  const notFound = (!schemasLoading && !schema) || (matches && !!resolved.error);
  const loading = schemasLoading || (!!schema && !matches);

  // Handle cross-origin navigation requests from the preview iframe.
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

  if (notFound || !previewSrc) {
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
      <div className={`flex flex-1 min-h-0 ${previewMode === "desktop" ? "bg-white" : "bg-slate-200"}`}>
        <iframe
          src={previewSrc}
          title={t("pageEditor.preview.title")}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation allow-top-navigation-by-user-activation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className={`w-full h-full border-0 transition-all duration-300 ease-in-out mx-auto ${
            previewMode !== "desktop" ? "shadow-2xl" : ""
          }`}
          style={{ maxWidth: previewMode === "desktop" ? "100%" : "24rem" }}
        />
      </div>
    </div>
  );
}
