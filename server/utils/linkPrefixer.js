/**
 * Depth-aware href prefixing for static export (Collections spec Section 6).
 *
 * In publish mode, content one directory deep (e.g. a collection item page at
 * `{slugPrefix}/{slug}.html`) needs relative hrefs rewritten with an
 * `outputPathPrefix` (e.g. `../`) so they resolve from the nested location.
 * Only genuinely-relative internal links are rewritten; anything carrying a URI
 * scheme, protocol-relative `//`, an anchor, a query, or a root-absolute `/` is
 * left exactly as the user wrote it.
 */

// RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ), anchored,
// case-insensitive. Matches any URI with a scheme regardless of what it is.
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// WHATWG URL preprocessing, step 1: strip leading/trailing C0 controls
// (U+0000–U+001F) and U+0020 SPACE.
// eslint-disable-next-line no-control-regex -- intentional C0 control matching per WHATWG URL spec
const LEADING_TRAILING_C0_OR_SPACE = /^[\x00-\x20]+|[\x00-\x20]+$/g;
// step 2: remove all embedded tab (U+0009), LF (U+000A), CR (U+000D).
// eslint-disable-next-line no-control-regex -- intentional control matching per WHATWG URL spec
const EMBEDDED_TAB_OR_NEWLINE = /[\x09\x0A\x0D]/g;

/**
 * Normalize an href the way a browser preprocesses one before parsing, so our
 * classification matches what the browser will actually do with it.
 * @param {string} href
 * @returns {string}
 */
export function normalize(href) {
  return href.replace(LEADING_TRAILING_C0_OR_SPACE, "").replace(EMBEDDED_TAB_OR_NEWLINE, "");
}

/**
 * Prefix a relative internal href with `outputPathPrefix`; pass everything else
 * through unchanged. Non-string input is returned as-is (never coerced).
 *
 * @param {*} href
 * @param {string} outputPathPrefix - "" at the export root, "../" one level deep
 * @returns {*}
 */
export function prefixInternalHref(href, outputPathPrefix) {
  if (typeof href !== "string") return href;
  const normalized = normalize(href);
  // Empty after normalize, or nothing to prefix (root pages): preserve original.
  if (!normalized || !outputPathPrefix) return href;

  if (URI_SCHEME.test(normalized)) return normalized; // any scheme (browser-normalized form)
  if (normalized.startsWith("//")) return normalized; // protocol-relative
  if (normalized.startsWith("#")) return normalized; // same-page anchor
  if (normalized.startsWith("?")) return normalized; // query-only
  if (normalized.startsWith("/")) return normalized; // root-absolute (user opted in)
  return `${outputPathPrefix}${normalized}`;
}
