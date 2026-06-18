import { getStandaloneCollectionPreviewPath } from "./previewBase";

/**
 * Open the navigable site preview at a given preview path — `/preview/{pageId}` for a
 * page, or `/preview/collection/{slugPrefix}/{slug}` for a collection item. One door for
 * both: the user lands on that page/item and can click through the rest of the site.
 *
 * In the packaged desktop app the preview lives in a dedicated Electron window (link
 * navigation is routed through the main process), so we hand the path to the exposed IPC
 * bridge; on the web we open it in the shared "widgetizer-preview" browser window.
 *
 * @param {string} previewPath - An absolute app path under `/preview/...`.
 */
export function openSitePreview(previewPath) {
  // Only ever open in-app /preview/... routes — never an absolute or protocol-relative
  // URL (the Electron preview window is privileged; the main process re-checks this too).
  if (typeof previewPath !== "string" || !previewPath.startsWith("/preview/")) return;

  const electronOpenPreview = window.electronUpdater?.openPreviewWindow;
  if (typeof electronOpenPreview === "function") {
    electronOpenPreview(previewPath);
    return;
  }

  const url = new URL(previewPath, window.location.origin).toString();
  window.open(url, "widgetizer-preview")?.focus();
}

/**
 * Open the standalone preview for a collection ITEM page. Resolves the configured
 * preview path (the OSS default `/preview/collection/:slugPrefix/:slug`, or an
 * embedding host's override via setStandaloneCollectionPreviewPath). The default
 * stays under `/preview/...` and so routes through openSitePreview — keeping the
 * Electron preview-window bridge + its re-check. A host that points the path at
 * its own surface (e.g. `/sites/:siteId/preview/collection/...`) opens it directly
 * in the shared web preview tab.
 *
 * @param {string} slugPrefix
 * @param {string} slug
 */
export function openCollectionItemPreview(slugPrefix, slug) {
  const previewPath = getStandaloneCollectionPreviewPath(slugPrefix, slug);
  if (typeof previewPath !== "string" || !previewPath) return;
  if (previewPath.startsWith("/preview/")) {
    openSitePreview(previewPath);
    return;
  }
  const url = new URL(previewPath, window.location.origin).toString();
  window.open(url, "widgetizer-preview")?.focus();
}
