// Configurable base for the inline preview iframe's render URL.
//
// PreviewPanel loads the rendered page as an iframe `src` of
// `${base}/render/${token}`. The OSS shell serves that at the origin root
// (`/render/:token`), so the default base reproduces today's behaviour
// (VITE_API_URL when the bundle and API are split in dev, else same-origin "").
//
// A nested host (hosted mounts the editor under /sites/:siteId/edit and serves
// the render endpoint under its project-scoped API) needs the iframe to hit a
// proxied, same-origin `/api/...` path so the session cookie authorizes the
// preview's media/asset subrequests. It calls setPreviewRenderBase() once on
// mount, mirroring setApiBase(). Registry (not context) so PreviewPanel's
// non-hook helper can read it.
let _previewRenderBase = import.meta.env.VITE_API_URL || "";

export function setPreviewRenderBase(base) {
  _previewRenderBase = base ?? "";
}

export function getPreviewRenderBase() {
  return _previewRenderBase;
}

// Builds the URL the top-bar "Preview" button opens (in a new tab) for a given
// page id. The OSS shell serves the standalone preview app at /preview/:pageId,
// which is the default. An embedding host mounts that surface elsewhere (hosted
// uses /sites/:siteId/preview/:pageId) and overrides this so the button — and
// the in-preview link navigation, which routes to the same shape — targets the
// host's route. The standalone preview page itself hosts PreviewPanel in an
// iframe and handles NAVIGATE_PREVIEW (the OSS architecture). Registry (not
// context) so EditorTopBar's click handler can read it without prop-drilling.
let _standalonePreviewPath = (pageId) => `/preview/${pageId}`;

export function setStandalonePreviewPath(builder) {
  _standalonePreviewPath = typeof builder === "function" ? builder : (pageId) => `/preview/${pageId}`;
}

export function getStandalonePreviewPath(pageId) {
  return _standalonePreviewPath(pageId);
}
