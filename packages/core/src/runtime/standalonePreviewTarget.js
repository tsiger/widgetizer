/**
 * Maps an in-preview link href to its standalone-preview route, or `null` when
 * the href isn't a navigable internal page/item link.
 *
 *   "about.html"               -> "/preview/about"
 *   "rooms/suite-caldera.html" -> "/preview/collection/rooms/suite-caldera"
 *   "about"                    -> "/preview/about"
 *   "rooms/suite"              -> "/preview/collection/rooms/suite"
 *   "./" / "../"               -> "/preview/index"
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

  // Any URI scheme (RFC 3986 `scheme:`) is external — http(s), mailto, tel,
  // javascript, but also sms/webcal/urn/data. An extensionless internal link
  // never contains a colon, so this must run before the extensionless matches.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
    return null;
  }

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  const previewMatch = withoutQuery.match(/^\/?preview\/([^/]+)$/);
  if (previewMatch) {
    return `/preview/${previewMatch[1]}`;
  }

  // Clean URLs home shapes: "./" at the root, "../" from an item page.
  if (/^(\.\.?\/)+$/.test(withoutQuery)) return "/preview/index";

  // Drop leading "./" / "../" depth segments and a leading slash; what remains
  // is the site-relative path in one of four shapes.
  const rel = withoutQuery.replace(/^(\.\.?\/)+/, "").replace(/^\//, "");

  const htmlMatch = rel.match(/^([^/]+)\.html$/);
  if (htmlMatch) {
    return `/preview/${htmlMatch[1]}`;
  }

  // Nested collection item URLs (e.g. "rooms/suite-caldera.html") route to the
  // item preview keyed by slugPrefix; the route resolves prefix -> type.
  const itemMatch = rel.match(/^([^/]+)\/([^/]+)\.html$/);
  if (itemMatch) {
    return `/preview/collection/${itemMatch[1]}/${itemMatch[2]}`;
  }

  // Extensionless forms (project Clean URLs on): "about", "rooms/suite".
  const cleanPageMatch = rel.match(/^([^/.]+)$/);
  if (cleanPageMatch) {
    return `/preview/${cleanPageMatch[1]}`;
  }
  const cleanItemMatch = rel.match(/^([^/.]+)\/([^/.]+)$/);
  if (cleanItemMatch) {
    return `/preview/collection/${cleanItemMatch[1]}/${cleanItemMatch[2]}`;
  }

  return null;
}
