import { useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import usePageStore from "@widgetizer/editor-ui/stores/pageStore";
import useThemeStore from "@widgetizer/editor-ui/stores/themeStore";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import { fetchPreviewToken } from "@widgetizer/editor-ui/queries/previewManager";
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
  const { pageId } = useParams();
  const { setPreview } = useOutletContext();
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const loadPage = usePageStore((state) => state.loadPage);
  const loading = usePageStore((state) => state.loading);
  const error = usePageStore((state) => state.error);
  const page = usePageStore((state) => state.page);

  // Boot-race gate (Electron + web): a freshly opened preview window/tab
  // cold-boots and `activeProject` resolves a beat AFTER first render. Loading
  // the page before that races a not-yet-seeded project (the did-fail-load -3
  // abort we fixed). Gate loadPage on activeProjectId; the effect re-runs and
  // loads once it is seeded.
  useEffect(() => {
    if (!activeProjectId) return;
    loadPage(pageId);
  }, [pageId, activeProjectId, loadPage]);

  useEffect(() => {
    // Hold the layout at its loader until the project is seeded and the page
    // store has finished loading.
    if (!activeProjectId || loading) {
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
        const { token } = await fetchPreviewToken({ ...page, globalWidgets }, themeSettings, "standalone");
        if (!cancelled) setPreview({ src: buildPreviewUrl(token), loading: false, notFound: false });
      } catch {
        if (!cancelled) setPreview({ src: null, loading: false, notFound: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, loading, error, page, setPreview]);

  return null;
}
