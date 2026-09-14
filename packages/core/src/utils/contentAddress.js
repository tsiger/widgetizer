import { isHomeSlug, pageHref } from "./internalHref.js";
import { prefixInternalHref } from "./linkPrefixer.js";

const RESERVED_PAGE_SLUGS = new Set(["page"]);
const RESERVED_ITEM_SLUGS = new Set(["index", "page"]);
const RESERVED_SLUG_PREFIXES = new Set(["assets"]);

export function isReservedPageSlug(slug) {
  return RESERVED_PAGE_SLUGS.has(slug);
}

export function isReservedItemSlug(slug) {
  return RESERVED_ITEM_SLUGS.has(slug);
}

export function isReservedSlugPrefix(prefix) {
  return RESERVED_SLUG_PREFIXES.has(prefix);
}

export function pageOutputPath(slug, pageNumber = 1) {
  if (pageNumber > 1) return isHomeSlug(slug) ? `page/${pageNumber}.html` : `${slug}/page/${pageNumber}.html`;
  return isHomeSlug(slug) ? "index.html" : `${slug}.html`;
}

export function itemOutputPath(slugPrefix, slug) {
  return `${slugPrefix}/${slug}.html`;
}

export function publicPath(outputPath, { cleanUrls = false } = {}) {
  if (!cleanUrls) return outputPath;
  if (outputPath === "index.html") return "";
  return outputPath.replace(/\.html$/, "");
}

export function pagedHref(slug, pageNumber, { cleanUrls = false, outputPathPrefix = "" } = {}) {
  if (!(pageNumber > 1)) return pageHref(isHomeSlug(slug) ? "index" : slug, { cleanUrls, outputPathPrefix });
  return prefixInternalHref(publicPath(pageOutputPath(slug, pageNumber), { cleanUrls }), outputPathPrefix);
}

export function parsePagedPath(path) {
  const match = /^(?:([a-z0-9-]+)\/)?page\/([1-9]\d*)(?:\.html)?$/.exec(path || "");
  if (!match) return null;
  return { slug: match[1] || "index", pageNumber: Number(match[2]) };
}

export function pagedPreviewPath(slug, pageNumber) {
  return pageNumber > 1 ? `/preview/paged/${slug}/${pageNumber}` : `/preview/${slug}`;
}
