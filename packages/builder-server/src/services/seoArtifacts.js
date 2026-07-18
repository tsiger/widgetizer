// Pure SEO artifact builders (sitemap.xml + robots.txt) for a published/exported
// site. Extracted from exportController so both the OSS export pipeline and
// hosted's cloud render loop produce identical output from one source.

import { formatXml } from "../utils/htmlProcessor.js";

function isValidSiteUrl(siteUrl) {
  if (!siteUrl || siteUrl.trim() === "") return false;
  try {
    new URL(siteUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the formatted sitemap.xml for the given pages, or null when siteUrl is
 * missing/invalid. noindex pages are excluded; the homepage maps to the bare
 * site root and every other page to `<slug>.html`. Collection item pages (from
 * `itemPagesForSeo`) follow the page URLs, grouped by type in listing order;
 * noindex items are excluded.
 * @param {Array<object>} pagesDataArray
 * @param {string} siteUrl
 * @param {Array<{slugPrefix: string, items: Array<object>}>} [itemPagesForSeo]
 * @param {boolean} [cleanUrls=false] - emit extensionless URLs (hosts that publish pages without .html)
 * @returns {Promise<string|null>}
 */
export async function buildSitemap(pagesDataArray, siteUrl, itemPagesForSeo = [], cleanUrls = false) {
  if (!isValidSiteUrl(siteUrl)) return null;

  const ext = cleanUrls ? "" : ".html";
  const sitemapUrls = pagesDataArray
    .filter((page) => !page.seo?.robots?.includes("noindex"))
    .map((page) => {
      const isHomepage = page.slug === "index" || page.slug === "home";
      const pageUrl = isHomepage ? new URL("/", siteUrl).href : new URL(`${page.slug}${ext}`, siteUrl).href;
      const lastMod = page.updated || page.gcreated || new Date().toISOString();
      return `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>
  </url>`;
    });

  const collectionSitemapUrls = [];
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex")) continue;
      const loc = new URL(`${slugPrefix}/${item.slug}${ext}`, siteUrl).href;
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
 * @returns {string|null}
 */
export function buildRobotsTxt(pagesDataArray, siteUrl, itemPagesForSeo = [], cleanUrls = false) {
  if (!isValidSiteUrl(siteUrl)) return null;

  const ext = cleanUrls ? "" : ".html";
  const sitemapUrl = new URL("sitemap.xml", siteUrl).href;
  // Single Set so a page and an item never emit duplicate Disallow lines.
  const disallowSet = new Set();
  for (const page of pagesDataArray) {
    if (!page.seo?.robots?.includes("noindex")) continue;
    const pageId = page.id || page.slug;
    if (!pageId) continue;
    const filename = pageId === "index" || pageId === "home" ? `index${ext || ".html"}` : `${pageId}${ext}`;
    disallowSet.add(`/${filename}`);
  }
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex")) disallowSet.add(`/${slugPrefix}/${item.slug}${ext}`);
    }
  }
  const disallowPaths = Array.from(disallowSet);
  const robotsLines = ["User-agent: *", "Allow: /", ...disallowPaths.map((p) => `Disallow: ${p}`), "", `Sitemap: ${sitemapUrl}`];
  return robotsLines.join("\n");
}
