/**
 * Maps an in-preview link href to its standalone-preview route, or `null` when
 * the href isn't a navigable internal page/item link.
 *
 *   "about.html"               -> "/preview/about"
 *   "rooms/suite-caldera.html" -> "/preview/collection/rooms/suite-caldera"
 *   "#anchor" / external / "/" -> null
 *
 * Single source of truth, shared across a bundle boundary: `previewRuntime.js`
 * (injected into the no-referrer preview iframe, served raw as an ES module from
 * the `/runtime` static mount → it imports this sibling by relative path) is the
 * runtime consumer. Kept dependency-free (no `window`/`document`) so it stays
 * import-safe for unit tests.
 */
export function getStandalonePreviewTarget(href) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http:") ||
    lower.startsWith("https:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  const previewMatch = withoutQuery.match(/^\/?preview\/([^/]+)$/);
  if (previewMatch) {
    return `/preview/${previewMatch[1]}`;
  }

  const htmlMatch = withoutQuery.match(/^\/?([^/]+)\.html$/);
  if (htmlMatch) {
    return `/preview/${htmlMatch[1]}`;
  }

  // Nested collection item URLs (e.g. "rooms/suite-caldera.html") route to the
  // item preview keyed by slugPrefix; the route resolves prefix -> type.
  const itemMatch = withoutQuery.match(/^\/?([^/]+)\/([^/]+)\.html$/);
  if (itemMatch) {
    return `/preview/collection/${itemMatch[1]}/${itemMatch[2]}`;
  }

  return null;
}
