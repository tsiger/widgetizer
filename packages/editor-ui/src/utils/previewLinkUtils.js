// NOTE: the in-preview href → preview-route mapper (`getStandalonePreviewTarget`)
// lives in `@widgetizer/core/src/runtime/standalonePreviewTarget.js` — its only
// consumer is the injected preview runtime (`previewRuntime.js`, served raw to the
// preview iframe), which can't import this package.

export function isStandalonePreviewNavigationUrl(url) {
  // Accept flat page routes (/preview/about) and nested collection item routes
  // (/preview/collection/rooms/suite-caldera). Query strings and hashes are still
  // rejected.
  return typeof url === "string" && /^\/preview\/(?:[^/?#]+|collection\/[^/?#]+\/[^/?#]+)$/.test(url);
}
