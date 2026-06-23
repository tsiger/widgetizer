// Preview-window path guard for the Electron main process.
//
// The preview window carries the app preload bridge, so a previewPath arriving
// over IPC is untrusted: only ever open a real in-app /preview/... route (a page
// id, or a collection item). Without this, an absolute or protocol-relative path
// (e.g. "//evil.com/x") resolves to remote content in getRendererUrl and would
// load it into the privileged preview window.
//
// Kept as a pure, electron-free module so the security boundary is unit-testable
// (electron/main.js itself isn't import-safe under Vitest).
export const SAFE_PREVIEW_PATH = /^\/preview\/(?:collection\/[a-z0-9-]+\/[a-z0-9-]+|[A-Za-z0-9_-]+)$/;

/**
 * @param {unknown} previewPath
 * @returns {boolean} true only for a safe in-app /preview/... path
 */
export function isSafePreviewPath(previewPath) {
  return typeof previewPath === "string" && SAFE_PREVIEW_PATH.test(previewPath);
}
