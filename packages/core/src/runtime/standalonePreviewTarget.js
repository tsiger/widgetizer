/**
 * Maps an in-preview link href to its standalone-preview route, or `null` when
 * the href isn't a navigable internal page/item link.
 *
 * A rendered href is relative to the page it sits on, so it is resolved against
 * that page's own output path before anything is read out of it. On a
 * single-language site that path is just `about.html` and nothing changes; on a
 * translated one it is `el/about.html`, and a sibling link means the Greek page,
 * while `../contact.html` means the English one.
 *
 *   "about.html"      on "index.html"     -> "/preview/page/en/about"
 *   "about.html"      on "el/index.html"  -> "/preview/page/el/about"
 *   "../about.html"   on "el/index.html"  -> "/preview/page/en/about"
 *   "el/contact.html" on "index.html"     -> "/preview/page/el/contact"
 *   "rooms/suite.html"                    -> "/preview/collection/en/rooms/suite"
 *   "blog/page/2.html"                    -> "/preview/page/en/blog/page/2"
 *   "./" / "../"                          -> that language's home page
 *   "#anchor" / external / "/"            -> null
 *
 * Single source of truth, shared across a bundle boundary: `previewRuntime.js`
 * (injected into the no-referrer preview iframe, served raw as an ES module from
 * the `/runtime` static mount → it imports this sibling by relative path) is the
 * runtime consumer. Only these two files are served there, so this one stays
 * self-contained — it spells the route shapes that `contentAddress.previewRoute`
 * builds rather than importing it, and a test holds the two to each other.
 */
const LANGUAGE_SEGMENT = /^[a-z]{2}(-[a-z0-9]{2,8})?$/;

/** Resolve `href` against the directory of `outputPath`, as a browser would. */
function resolveAgainst(outputPath, href) {
  const base = String(outputPath || "").split("/").slice(0, -1);
  const segments = href.startsWith("/") ? [] : base.slice();
  for (const segment of href.replace(/^\//, "").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  // A trailing slash (Clean URLs home) leaves the directory itself.
  return { segments, isDirectory: href === "" || href.endsWith("/") };
}

export function getStandalonePreviewTarget(
  href,
  { collectionPrefixes = [], outputPath = "", languages = [], defaultLanguage = "en" } = {},
) {
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
  // The site root itself is not a page — it is whatever the host serves there.
  if (withoutQuery === "/") return null;

  // An already-namespaced preview route passes straight through.
  const namespaced = withoutQuery.match(/^\/?preview\/(page|collection)\/(.+)$/);
  if (namespaced) return `/preview/${namespaced[1]}/${namespaced[2]}`;

  // The flat route an older link may still carry means the default language.
  const flat = withoutQuery.match(/^\/?preview\/([^/]+)$/);
  if (flat) return `/preview/page/${defaultLanguage}/${flat[1]}`;

  const { segments, isDirectory } = resolveAgainst(outputPath, withoutQuery);

  // A leading language folder names the target's language; anything else is the
  // default language, which owns the root.
  let language = defaultLanguage;
  let rest = segments;
  if (segments.length > 0 && LANGUAGE_SEGMENT.test(segments[0]) && languages.includes(segments[0])) {
    language = segments[0];
    rest = segments.slice(1);
  }

  const page = (slug, pageNumber) =>
    pageNumber > 1 ? `/preview/page/${language}/${slug}/page/${pageNumber}` : `/preview/page/${language}/${slug}`;

  // Clean URLs home: "./" at the root, "../" from an item page, "el/" across.
  if (isDirectory && rest.length === 0) return page("index");
  if (rest.length === 0) return null;

  const rel = rest.join("/");

  const pagedMatch = rel.match(/^(?:([^/.]+)\/)?page\/([1-9]\d*)(?:\.html)?$/);
  if (pagedMatch && (pagedMatch[1] || !collectionPrefixes.includes("page"))) {
    return page(pagedMatch[1] || "index", Number(pagedMatch[2]));
  }

  const htmlMatch = rel.match(/^([^/]+)\.html$/);
  if (htmlMatch) return page(htmlMatch[1]);

  // Nested collection item URLs (e.g. "rooms/suite-caldera.html") route to the
  // item preview keyed by slugPrefix; the route resolves prefix -> type.
  const itemMatch = rel.match(/^([^/]+)\/([^/]+)\.html$/);
  if (itemMatch) return `/preview/collection/${language}/${itemMatch[1]}/${itemMatch[2]}`;

  // Extensionless forms (project Clean URLs on): "about", "rooms/suite".
  const cleanPageMatch = rel.match(/^([^/.]+)$/);
  if (cleanPageMatch) return page(cleanPageMatch[1]);

  const cleanItemMatch = rel.match(/^([^/.]+)\/([^/.]+)$/);
  if (cleanItemMatch) return `/preview/collection/${language}/${cleanItemMatch[1]}/${cleanItemMatch[2]}`;

  return null;
}
