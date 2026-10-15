import { absoluteSiteUrl } from "../utils/internalHref.js";

// Characters the WHATWG parser would silently repair or encode (a backslash
// becomes "/", controls are dropped), leaving an id that no longer matches the
// address it names.
function hasUnsafeUrlChar(url) {
  if (/\s/.test(url)) return true;
  for (const char of url) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || char === "\\" || char === "<" || char === ">" || char === '"') return true;
  }
  return false;
}

/**
 * A site-wide node id: the Site URL base plus a fragment ("https://x.com/#website").
 * "" when the Site URL is unusable.
 * @param {string} siteUrl
 * @param {string} fragment
 */
export function siteNodeId(siteUrl, fragment) {
  const base = absoluteSiteUrl(siteUrl, "");
  return base ? `${base}#${fragment}` : "";
}

/**
 * A node id anchored on an absolute address ("https://x.com/about.html#webpage").
 * Any fragment already on the address is dropped; the rest is kept as given, so
 * the id matches the canonical URL text. "" unless it is a well-formed http(s)
 * address with a host.
 * @param {string} url
 * @param {string} fragment
 */
export function urlNodeId(url, fragment) {
  if (typeof url !== "string" || !/^https?:\/\/[^/]/i.test(url) || hasUnsafeUrlChar(url)) return "";
  const address = url.split("#")[0];
  try {
    const parsed = new URL(address);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) return "";
  } catch {
    return "";
  }
  return `${address}#${fragment}`;
}
