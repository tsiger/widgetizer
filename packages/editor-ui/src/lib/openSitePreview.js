import { getStandalonePreviewPath, getStandaloneCollectionPreviewPath } from "./previewBase";

/**
 * Single dispatch for every "open a standalone preview" call site (the page-editor
 * top-bar Preview button, the sidebar Preview action, the collection-item Preview).
 * The page/item entry points below resolve the route through the previewBase
 * registries and hand the path here, so the open mechanics — and their security
 * guard — live in exactly one place instead of being re-inlined per call site.
 *
 * Mechanics:
 *  - In the packaged desktop app an in-app `/preview/...` path opens in a dedicated,
 *    privileged Electron window via the exposed IPC bridge (the main process re-checks
 *    the path too).
 *  - Otherwise — web, or an embedding host that points the route at its own surface
 *    (e.g. `/sites/:siteId/preview/...` via setStandalonePreviewPath) — it opens in the
 *    shared "widgetizer-preview" browser window. A host override never installs in the
 *    desktop app, so such a path always falls through to window.open.
 *
 * Security guard: only ever open an app-relative single-slash path (`/...`). A
 * protocol-relative (`//host`), absolute (`http(s):`), or otherwise non-path value is
 * refused. The entry points only pass registry-resolved paths, never arbitrary hrefs
 * (href parsing stays in previewLinkUtils), so this is a trusted-input dispatch.
 *
 * @param {string} previewPath
 */
function openResolvedPreview(previewPath) {
  if (typeof previewPath !== "string" || !previewPath.startsWith("/") || previewPath.startsWith("//")) {
    return;
  }

  // The Electron preview window only serves the in-app /preview/... surface.
  if (previewPath.startsWith("/preview/")) {
    const electronOpenPreview = window.electronUpdater?.openPreviewWindow;
    if (typeof electronOpenPreview === "function") {
      electronOpenPreview(previewPath);
      return;
    }
  }

  const url = new URL(previewPath, window.location.origin).toString();
  window.open(url, "widgetizer-preview")?.focus();
}

/**
 * Open the navigable standalone preview for a PAGE. Resolves the configured page
 * preview path (the OSS default `/preview/:pageId`, or an embedding host's override
 * via setStandalonePreviewPath) and dispatches it. The user lands on that page and can
 * click through the rest of the site.
 *
 * @param {string} pageId
 */
export function openPagePreview(pageId) {
  openResolvedPreview(getStandalonePreviewPath(pageId));
}

/**
 * Open the navigable standalone preview for a collection ITEM page. Resolves the
 * configured item preview path (the OSS default `/preview/collection/:slugPrefix/:slug`,
 * or an embedding host's override via setStandaloneCollectionPreviewPath) and dispatches
 * it — same door, keyed by (slugPrefix, slug) instead of a pageId.
 *
 * @param {string} slugPrefix
 * @param {string} slug
 */
export function openCollectionItemPreview(slugPrefix, slug) {
  openResolvedPreview(getStandaloneCollectionPreviewPath(slugPrefix, slug));
}
