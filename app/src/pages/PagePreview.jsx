import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import usePageStore from "@widgetizer/editor-ui/stores/pageStore";
import useThemeStore from "@widgetizer/editor-ui/stores/themeStore";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import { fetchPreviewToken } from "@widgetizer/editor-ui/queries/previewManager";
import { getPage } from "@widgetizer/editor-ui/queries/pageManager";
import { buildPreviewUrl } from "@widgetizer/editor-ui/lib/previewBase";

/**
 * Standalone site preview for a normal page. A thin child of SitePreviewLayout:
 * it loads the saved page (plus its global widgets and theme settings) into the
 * page store, requests a standalone render token, and reports the resulting iframe
 * src up to the layout. All chrome (toolbar, loader, iframe) lives in the layout.
 *
 * Unlike the editor, this is a *one-shot* render — there is no live editing in a
 * standalone preview window, so it does not mount PreviewPanel's diff/morph
 * machinery; it just resolves the saved page to a render token once.
 */
export default function PagePreview() {
  const { pageId, pageNumber, lang } = useParams();
  const { setPreview } = useOutletContext();
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const loadPage = usePageStore((state) => state.loadPage);
  const loading = usePageStore((state) => state.loading);
  const error = usePageStore((state) => state.error);
  const page = usePageStore((state) => state.page);
  // The slug this route resolved to, kept with the route it belongs to. While
  // the current route is still being resolved it is null, so a render for the
  // previous route cannot be reported under this one.
  const routeKey = `${lang ?? ""}/${pageId}`;
  const [resolved, setResolved] = useState(null);
  const resolvedSlug = resolved?.routeKey === routeKey ? resolved.slug : null;

  // Boot-race gate (Electron + web): a freshly opened preview window/tab
  // cold-boots and `activeProject` resolves a beat AFTER first render. Loading
  // the page before that races a not-yet-seeded project (the did-fail-load -3
  // abort we fixed). Gate loadPage on activeProjectId; the effect re-runs and
  // loads once it is seeded.
  useEffect(() => {
    if (!activeProjectId) return undefined;
    let cancelled = false;
    (async () => {
      // A homepage stored as `home` publishes as index.html like `index` does, so
      // links to it arrive here as "index". Only a missing index means that; any
      // other failure is left for the load below to report.
      let slug = pageId;
      if (pageId === "index") {
        try {
          await getPage("index", lang);
        } catch (error) {
          if (error?.status === 404) slug = "home";
        }
      }
      if (cancelled) return;
      // A slug is unique per language, so the route says which one. Without it the
      // flat route still means the default language.
      setResolved({ routeKey: `${lang ?? ""}/${pageId}`, slug });
      loadPage(slug, lang);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId, lang, activeProjectId, loadPage]);

  useEffect(() => {
    // Hold the layout at its loader until the project is seeded and the page
    // store has finished loading.
    if (!activeProjectId || loading || !resolvedSlug) {
      setPreview({ src: null, loading: true, notFound: false });
      return undefined;
    }
    if (error || !page) {
      setPreview({ src: null, loading: false, notFound: true });
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const { globalWidgets } = usePageStore.getState();
        const themeSettings = useThemeStore.getState().settings;
        const { token } = await fetchPreviewToken(
          { ...page, globalWidgets },
          themeSettings,
          "standalone",
          Number(pageNumber) || 1,
        );
        if (!cancelled) setPreview({ src: buildPreviewUrl(token), loading: false, notFound: false });
      } catch {
        if (!cancelled) setPreview({ src: null, loading: false, notFound: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, loading, error, page, pageNumber, resolvedSlug, setPreview]);

  return null;
}
