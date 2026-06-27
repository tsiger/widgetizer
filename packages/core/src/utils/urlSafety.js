/**
 * URL href safety — shared by the server-side link/menu/collection sanitization
 * and the `safe_url` Liquid filter. Lives under @widgetizer/core so the filter
 * (also core) can import it without reaching into a backend module.
 *
 * NOTE: the depth-aware link prefixer (added with the collections feature, in
 * builder-server) carries a parallel `normalize` used for URL *classification*
 * (prefixing + canonicalPath). This copy is the *security* normalizer; both
 * implement the same WHATWG URL preprocessing but serve different layers — keep
 * them in step if the interpretation changes.
 */

// Dangerous URL schemes blocked in author-controlled hrefs.
const DANGEROUS_PROTOCOLS = /^\s*(javascript|data|vbscript)\s*:/i;

/**
 * Preprocess an href the way a browser does before resolving its scheme: remove
 * embedded tab (9) / LF (10) / CR (13), then trim leading/trailing
 * C0-control-or-space (code point <= 0x20). Implemented with numeric char codes
 * (no control-char regex escapes) for portability.
 * @param {string} href
 * @returns {string}
 */
export function normalize(href) {
  if (typeof href !== "string") return "";
  const kept = [];
  for (const ch of href) {
    const code = ch.charCodeAt(0);
    if (code !== 9 && code !== 10 && code !== 13) kept.push(ch);
  }
  let start = 0;
  let end = kept.length;
  while (start < end && kept[start].charCodeAt(0) <= 0x20) start += 1;
  while (end > start && kept[end - 1].charCodeAt(0) <= 0x20) end -= 1;
  return kept.slice(start, end).join("");
}

/**
 * Return the href if safe, or "" if it carries a dangerous scheme
 * (javascript:/data:/vbscript:). The href is tested against its
 * browser-preprocessed form (see normalize) so obfuscated schemes — an embedded
 * tab inside "javascript", or a leading control char — cannot bypass the
 * contiguous-scheme test.
 * @param {string} href
 * @returns {string}
 */
export function sanitizeHref(href) {
  if (typeof href !== "string") return href;
  return DANGEROUS_PROTOCOLS.test(normalize(href)) ? "" : href;
}

/**
 * Whether a value is acceptable as an optional site URL. Empty is allowed
 * (the field is optional). Otherwise it must be a proper public web address:
 * an http/https URL written with an authority (`scheme://host`) and a dotted
 * host. Plain `new URL()` is intentionally not enough — the WHATWG parser is
 * lenient with special schemes and accepts garbage like `https:cssigniter.com`
 * (no `//`), `https://localhost`, or `https://foo`, which we reject here.
 * Shared by the project form's inline validation and the controller's
 * server-side check so the two never drift.
 * @param {*} value
 * @returns {boolean}
 */
export function isValidSiteUrl(value) {
  if (!value || typeof value !== "string" || value.trim() === "") return true;
  const trimmed = value.trim();
  // Require an explicit http(s):// authority — rejects the lenient `https:host` form.
  if (!/^https?:\/\//i.test(trimmed)) return false;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // Require a dotted host so single-label hosts (localhost, foo) are rejected.
  return url.hostname.includes(".");
}
