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
 * site root and every other page to `<slug>.html`.
 * @param {Array<object>} pagesDataArray
 * @param {string} siteUrl
 * @returns {Promise<string|null>}
 */
export async function buildSitemap(pagesDataArray, siteUrl) {
  if (!isValidSiteUrl(siteUrl)) return null;

  const sitemapUrls = pagesDataArray
    .filter((page) => !page.seo?.robots?.includes("noindex"))
    .map((page) => {
      const isHomepage = page.slug === "index" || page.slug === "home";
      const pageUrl = isHomepage ? new URL("/", siteUrl).href : new URL(`${page.slug}.html`, siteUrl).href;
      const lastMod = page.updated || page.gcreated || new Date().toISOString();
      return `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>
  </url>`;
    });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.join("")}
</urlset>`;

  const sitemapResult = await formatXml(sitemapContent);
  return sitemapResult.xml;
}

/**
 * Build robots.txt for the given pages, or null when siteUrl is missing/invalid.
 * noindex pages are emitted as Disallow entries; the sitemap is referenced.
 * @param {Array<object>} pagesDataArray
 * @param {string} siteUrl
 * @returns {string|null}
 */
export function buildRobotsTxt(pagesDataArray, siteUrl) {
  if (!isValidSiteUrl(siteUrl)) return null;

  const sitemapUrl = new URL("sitemap.xml", siteUrl).href;
  const disallowPaths = Array.from(
    new Set(
      pagesDataArray
        .filter((page) => page.seo?.robots?.includes("noindex"))
        .map((page) => {
          const pageId = page.id || page.slug;
          if (!pageId) return null;
          const filename = pageId === "index" || pageId === "home" ? "index.html" : `${pageId}.html`;
          return `/${filename}`;
        })
        .filter(Boolean),
    ),
  );
  const robotsLines = ["User-agent: *", "Allow: /", ...disallowPaths.map((p) => `Disallow: ${p}`), "", `Sitemap: ${sitemapUrl}`];
  return robotsLines.join("\n");
}
