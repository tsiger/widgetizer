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

export function isStandalonePreviewNavigationUrl(url) {
  // Accept flat page routes (/preview/about) and nested collection item routes
  // (/preview/collection/rooms/suite-caldera). Query strings and hashes are still
  // rejected.
  return typeof url === "string" && /^\/preview\/(?:[^/?#]+|collection\/[^/?#]+\/[^/?#]+)$/.test(url);
}
