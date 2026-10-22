// Preview-window path guard for the Electron main process.
//
// The preview window carries the app preload bridge, so a previewPath arriving
// over IPC is untrusted: only ever open a real in-app /preview/... route (a page
// id, or a collection item). Without this, an absolute or protocol-relative path
// (e.g. "//evil.com/x") resolves to remote content in getRendererUrl and would
// load it into the privileged preview window.
//
// The accepted shapes are the standalone preview routes (app/src/previewRoutes.jsx):
// a page, a numbered copy of one, and a collection item, each with or without a
// language, which is spelled out under `page/` or after `collection/`.
//
// Kept as a pure, electron-free module so the security boundary is unit-testable
// (electron/main.js itself isn't import-safe under Vitest).
const ID = "[A-Za-z0-9_-]+";
const SLUG = "[a-z0-9-]+";
const LANG = "[a-z]{2}(?:-[a-z0-9]{2,8})?";
const PAGE_NUMBER = "[1-9][0-9]*";
export const SAFE_PREVIEW_PATH = new RegExp(
  "^/preview/(?:" +
    [
      ID,
      `paged/${ID}/${PAGE_NUMBER}`,
      `page/${LANG}/${ID}`,
      `page/${LANG}/${ID}/page/${PAGE_NUMBER}`,
      `collection/${SLUG}/${SLUG}`,
      `collection/${LANG}/${SLUG}/${SLUG}`,
    ].join("|") +
    ")$",
);

/**
 * @param {unknown} previewPath
 * @returns {boolean} true only for a safe in-app /preview/... path
 */
export function isSafePreviewPath(previewPath) {
  return typeof previewPath === "string" && SAFE_PREVIEW_PATH.test(previewPath);
}
