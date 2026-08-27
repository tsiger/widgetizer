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

/** The two slugs that render as the site root (`index.html`). */
export function isHomeSlug(slug) {
  return slug === "index" || slug === "home";
}

/**
 * @param {string} slug
 * @param {{ cleanUrls?: boolean, outputPathPrefix?: string }} [opts]
 * @returns {string}
 */
export function pageHref(slug, { cleanUrls = false, outputPathPrefix = "" } = {}) {
  if (cleanUrls && isHomeSlug(slug)) return outputPathPrefix || "./";
  return prefixInternalHref(`${slug}${cleanUrls ? "" : ".html"}`, outputPathPrefix);
}

/**
 * @param {string} slugPrefix
 * @param {string} slug
 * @param {{ cleanUrls?: boolean, outputPathPrefix?: string }} [opts]
 * @returns {string}
 */
export function itemHref(slugPrefix, slug, { cleanUrls = false, outputPathPrefix = "" } = {}) {
  return prefixInternalHref(`${slugPrefix}/${slug}${cleanUrls ? "" : ".html"}`, outputPathPrefix);
}
