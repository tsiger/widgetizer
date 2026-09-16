/**
 * Internal href shapes for uuid-resolved page and collection-item links.
 *
 * The project's Clean URLs setting decides the shape: OFF emits the file name
 * (`about.html`, `rooms/suite.html`), ON emits the extensionless address the
 * host serves (`about`, `rooms/suite`). Depth is applied here too, because the
 * clean home link is a special case `prefixInternalHref` cannot produce: at the
 * root it is `./`, one level deep it is `../` (plain prefixing would give
 * `.././`). Stored data never carries these shapes — menus, link fields and
 * richtext keep `.html` on disk; only render-time emission calls this.
 *
 * Hrefs the engine did NOT resolve from a uuid (custom links typed by the
 * user, theme Liquid, schema defaults) never come through here; they keep
 * going through `prefixInternalHref` exactly as authored.
 */
import { prefixInternalHref } from "./linkPrefixer.js";
import { isHomeSlug, languageFolder, homeHref } from "./contentAddress.js";

export { isHomeSlug };

/**
 * `language` is the target's. `outputPathPrefix` is the rendering page's depth,
 * language folder included, so a cross-language link is plain prefixing.
 *
 * @param {string} slug
 * @param {{ cleanUrls?: boolean, outputPathPrefix?: string, language?: string, defaultLanguage?: string }} [opts]
 * @returns {string}
 */
export function pageHref(slug, { cleanUrls = false, outputPathPrefix = "", language, defaultLanguage } = {}) {
  if (cleanUrls && isHomeSlug(slug)) return homeHref({ cleanUrls, outputPathPrefix, language, defaultLanguage });
  const folder = languageFolder({ language, defaultLanguage });
  const file = `${slug}${cleanUrls ? "" : ".html"}`;
  return prefixInternalHref(folder ? `${folder}/${file}` : file, outputPathPrefix);
}

/**
 * @param {string} slugPrefix
 * @param {string} slug
 * @param {{ cleanUrls?: boolean, outputPathPrefix?: string, language?: string, defaultLanguage?: string }} [opts]
 * @returns {string}
 */
export function itemHref(
  slugPrefix,
  slug,
  { cleanUrls = false, outputPathPrefix = "", language, defaultLanguage } = {},
) {
  const folder = languageFolder({ language, defaultLanguage });
  const file = `${slugPrefix}/${slug}${cleanUrls ? "" : ".html"}`;
  return prefixInternalHref(folder ? `${folder}/${file}` : file, outputPathPrefix);
}

/**
 * The project's Site URL reduced to a normalised *directory* base: origin plus
 * path, always with exactly one trailing slash. Returns "" when the value is
 * unusable as a base (empty, unparseable, not http(s), or carrying a query or
 * fragment), which every caller treats as "no absolute URL can be built" and so
 * omits the output rather than inventing an address.
 *
 * The trailing slash is the whole point. A Site URL may legitimately live in a
 * subfolder (`user.github.io/repo/`), and `new URL(path, base)` resolves
 * relative to the base's *directory*: with `https://e.com/repo` (no slash) it
 * silently drops `repo`, while `https://e.com/repo/` keeps it. Normalising once
 * here means no caller depends on whether the user typed the slash.
 *
 * @param {*} siteUrl
 * @returns {string} e.g. "https://e.com/" or "https://e.com/repo/", else ""
 */
export function siteUrlBase(siteUrl) {
  if (!siteUrl || typeof siteUrl !== "string" || !siteUrl.trim()) return "";
  let url;
  try {
    url = new URL(siteUrl.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  // A query or fragment cannot be part of a base that paths are appended to;
  // `isValidSiteUrl` rejects both, so this only guards values stored earlier.
  if (url.search || url.hash) return "";
  const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${path}`;
}

/**
 * Join a site-relative path onto the Site URL base. `path` is relative to the
 * base directory; a leading slash is stripped so a subfolder Site URL is
 * preserved (`/about.html` under `https://e.com/repo/` is
 * `https://e.com/repo/about.html`, not `https://e.com/about.html`). An empty
 * path yields the base itself — the homepage address. Returns "" when there is
 * no usable base.
 *
 * @param {*} siteUrl
 * @param {string} [path]
 * @returns {string}
 */
export function absoluteSiteUrl(siteUrl, path = "") {
  const base = siteUrlBase(siteUrl);
  if (!base) return "";
  const relative = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  try {
    return new URL(relative, base).href;
  } catch {
    return "";
  }
}

/**
 * The root-relative path of `path` under the Site URL, including the base's own
 * folder — what a robots.txt rule must target, since those paths are resolved
 * against the host root rather than the site's base. `https://e.com/repo/` with
 * "private.html" gives "/repo/private.html". Falls back to a host-root path when
 * there is no usable base.
 *
 * @param {*} siteUrl
 * @param {string} [path]
 * @returns {string}
 */
export function siteUrlPathname(siteUrl, path = "") {
  const relative = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  const absolute = absoluteSiteUrl(siteUrl, relative);
  if (!absolute) return `/${relative}`;
  return new URL(absolute).pathname;
}
