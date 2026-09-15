import { isHomeSlug, absoluteSiteUrl } from "./internalHref.js";
import { pageOutputPath, publicPath } from "./contentAddress.js";

/**
 * The number of the copy being rendered: 1 unless the page is split into
 * numbered copies and this is a later one.
 * @param {object} page
 */
export function currentPageNumber(page) {
  return page?.pagination?.total > 1 ? page.pagination.current : 1;
}

/**
 * The published absolute address of a page (or collection item path) at a copy
 * number, following the project's Site URL and Clean URLs. The homepage is the
 * Site URL itself. "" without a usable Site URL.
 * @param {string} slug
 * @param {number} pageNumber
 * @param {{ siteUrl?: string, cleanUrls?: boolean }} project
 */
export function pageUrlAt(slug, pageNumber, project) {
  const siteUrl = project?.siteUrl;
  const cleanUrls = project?.cleanUrls;
  if (pageNumber > 1) return absoluteSiteUrl(siteUrl, publicPath(pageOutputPath(slug, pageNumber), { cleanUrls }));
  if (isHomeSlug(slug)) return absoluteSiteUrl(siteUrl, "");
  return absoluteSiteUrl(siteUrl, cleanUrls ? slug : `${slug}.html`);
}

/**
 * The page's own published address — the automatic canonical, ignoring any
 * explicit canonical override.
 * @param {object} page
 * @param {object} project
 */
export function pageSelfUrl(page, project) {
  return page?.slug ? pageUrlAt(page.slug, currentPageNumber(page), project) : "";
}

/**
 * Resolve a stored image value to an absolute published URL, the way og:image
 * does: an absolute http(s) value passes through; an upload path becomes
 * `assets/images/<file>` on the Site URL, using the large variant for rasters
 * that have one. "" without a usable Site URL.
 * @param {string} rawValue
 * @param {string} siteUrl
 * @param {object} [mediaFiles] - Media records keyed by filename.
 */
export function publishedImageUrl(rawValue, siteUrl, mediaFiles = {}) {
  if (!rawValue) return "";
  if (rawValue.startsWith("http")) return rawValue;

  const filename = rawValue.split("/").pop();
  return absoluteSiteUrl(siteUrl, `assets/images/${publicImageFilename(filename, mediaFiles)}`);
}

function publicImageFilename(filename, mediaFiles) {
  const mediaFile = mediaFiles?.[filename];
  const isSvg = mediaFile?.type === "image/svg+xml" || filename?.toLowerCase().endsWith(".svg");
  const largePath = mediaFile?.sizes?.large?.path;
  if (!isSvg && largePath) return largePath.split("/").pop();
  return filename;
}
