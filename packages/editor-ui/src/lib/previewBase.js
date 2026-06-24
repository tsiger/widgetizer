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

// Single builder for a preview iframe's render URL: `${base}/render/${token}`
// plus the editor origin as `parentOrigin`. The preview runtime serves a
// no-referrer document, so the URL is the only channel through which it learns
// which origin to target its reply postMessages at. Replaces the copies that
// lived in PreviewPanel and the OSS/hosted standalone preview pages.
export function buildPreviewUrl(token) {
  const url = `${getPreviewRenderBase()}/render/${token}`;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}parentOrigin=${encodeURIComponent(window.location.origin)}`;
}

// The concrete origin the inline preview iframe runs on, derived from the render
// base. Editor→preview postMessage targets this instead of "*", so a message
// can't be delivered to an unexpected origin if the iframe ever navigates away.
// A relative/empty base (same-origin prod + OSS standalone) resolves to this
// window's origin; an absolute base (split dev via VITE_API_URL) to that origin.
// Falls back to "*" only if the base can't be parsed, so a misconfig can never
// silence the bridge.
export function getPreviewTargetOrigin() {
  try {
    return new URL(_previewRenderBase || "", window.location.href).origin;
  } catch {
    return "*";
  }
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

// Same mechanism for a collection ITEM page's standalone preview. The OSS shell
// serves it at /preview/collection/:slugPrefix/:slug (the default); an embedding
// host overrides it (hosted uses /sites/:siteId/preview/collection/...). Kept
// separate from the page builder because the path is keyed by (slugPrefix, slug),
// not a pageId. Registry (not context) so the collection pages' click handlers
// can read it without prop-drilling.
const DEFAULT_COLLECTION_PREVIEW_PATH = (slugPrefix, slug) => `/preview/collection/${slugPrefix}/${slug}`;
let _standaloneCollectionPreviewPath = DEFAULT_COLLECTION_PREVIEW_PATH;

export function setStandaloneCollectionPreviewPath(builder) {
  _standaloneCollectionPreviewPath = typeof builder === "function" ? builder : DEFAULT_COLLECTION_PREVIEW_PATH;
}

export function getStandaloneCollectionPreviewPath(slugPrefix, slug) {
  return _standaloneCollectionPreviewPath(slugPrefix, slug);
}
