// Pure SEO artifact builders (sitemap.xml + robots.txt) for a published/exported
// site. Extracted from exportController so both the OSS export pipeline and
// hosted's cloud render loop produce identical output from one source.

import { formatXml } from "../utils/htmlProcessor.js";
import { isHomeSlug, siteUrlBase, absoluteSiteUrl, siteUrlPathname } from "@widgetizer/core/internalHref";
import { pageOutputPath, publicPath } from "@widgetizer/core/contentAddress";

const pagedSitePaths = (pageId, pageCounts, cleanUrls) => {
  const paths = [];
  for (let number = 2; number <= (pageCounts.get(pageId) || 1); number += 1) {
    paths.push(publicPath(pageOutputPath(pageId, number), { cleanUrls }));
  }
  return paths;
};

/**
 * Build the formatted sitemap.xml for the given pages, or null when siteUrl is
 * missing/unusable as a base. noindex pages are excluded; the homepage maps to
 * the Site URL base itself (subfolder included) and every other page to
 * `<slug>.html` — or `<slug>` when `cleanUrls` is set, matching the links the
 * pages emit. Collection item pages (from
 * `itemPagesForSeo`) follow the page URLs, grouped by type in listing order;
 * noindex items are excluded.
 * @param {Array<object>} pagesDataArray
 * @param {string} siteUrl
 * @param {Array<{slugPrefix: string, items: Array<object>}>} [itemPagesForSeo]
 * @param {boolean} [cleanUrls=false] - emit extensionless URLs (hosts that publish pages without .html)
 * @param {Map<string, number>} [pageCounts] - page id -> number of paginated copies; 2+ adds `page/<n>` entries
 * @returns {Promise<string|null>}
 */
export async function buildSitemap(pagesDataArray, siteUrl, itemPagesForSeo = [], cleanUrls = false, pageCounts = new Map()) {
  // No usable base means no absolute <loc> can be built, so there is no sitemap
  // to write. `siteUrlBase` is the single gate the canonicals use too.
  if (!siteUrlBase(siteUrl)) return null;

  const ext = cleanUrls ? "" : ".html";
  const sitemapUrls = pagesDataArray
    .filter((page) => !page.seo?.robots?.includes("noindex"))
    .flatMap((page) => {
      const isHomepage = isHomeSlug(page.slug);
      // The homepage is the base itself. `new URL("/", base)` would resolve to
      // the HOST root and silently drop a subfolder Site URL's own path.
      const pageUrl = isHomepage ? absoluteSiteUrl(siteUrl, "") : absoluteSiteUrl(siteUrl, `${page.slug}${ext}`);
      const lastMod = page.updated || page.gcreated || new Date().toISOString();
      const entry = (loc) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>
  </url>`;
      const copies = pagedSitePaths(page.id || page.slug, pageCounts, cleanUrls).map((sitePath) =>
        entry(absoluteSiteUrl(siteUrl, sitePath)),
      );
      return [entry(pageUrl), ...copies];
    });

  const collectionSitemapUrls = [];
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex")) continue;
      const loc = absoluteSiteUrl(siteUrl, `${slugPrefix}/${item.slug}${ext}`);
      const lastMod = item.updated || new Date().toISOString();
      collectionSitemapUrls.push(`
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>
  </url>`);
    }
  }

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.join("")}${collectionSitemapUrls.join("")}
</urlset>`;

  const sitemapResult = await formatXml(sitemapContent);
  return sitemapResult.xml;
}

/**
 * Build robots.txt for the given pages, or null when siteUrl is missing/invalid.
 * noindex pages AND noindex collection items are emitted as Disallow entries
 * (deduplicated); the sitemap is referenced.
 * @param {Array<object>} pagesDataArray
 * @param {string} siteUrl
 * @param {Array<{slugPrefix: string, items: Array<object>}>} [itemPagesForSeo]
 * @param {boolean} [cleanUrls=false] - emit extensionless Disallow paths (they also
 *   prefix-match the .html variants, so both address forms stay blocked)
 * @param {Map<string, number>} [pageCounts] - page id -> number of paginated copies
 * @returns {string|null}
 */
export function buildRobotsTxt(pagesDataArray, siteUrl, itemPagesForSeo = [], cleanUrls = false, pageCounts = new Map()) {
  if (!siteUrlBase(siteUrl)) return null;

  const ext = cleanUrls ? "" : ".html";
  const sitemapUrl = absoluteSiteUrl(siteUrl, "sitemap.xml");
  // Single Set so a page and an item never emit duplicate Disallow lines.
  const disallowSet = new Set();
  for (const page of pagesDataArray) {
    if (!page.seo?.robots?.includes("noindex")) continue;
    const pageId = page.id || page.slug;
    if (!pageId) continue;
    const filename = isHomeSlug(pageId) ? `index${ext || ".html"}` : `${pageId}${ext}`;
    // Robots paths resolve against the HOST root, not the site's base, so a site
    // under /bakery/ must disallow /bakery/private — a bare /private protects
    // nothing.
    disallowSet.add(siteUrlPathname(siteUrl, filename));
    for (const sitePath of pagedSitePaths(pageId, pageCounts, cleanUrls)) {
      disallowSet.add(siteUrlPathname(siteUrl, sitePath));
    }
  }
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex"))
        disallowSet.add(siteUrlPathname(siteUrl, `${slugPrefix}/${item.slug}${ext}`));
    }
  }
  const disallowPaths = Array.from(disallowSet);
  const robotsLines = ["User-agent: *", "Allow: /", ...disallowPaths.map((p) => `Disallow: ${p}`), "", `Sitemap: ${sitemapUrl}`];
  return robotsLines.join("\n");
}
