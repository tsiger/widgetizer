// Pure SEO artifact builders (sitemap.xml + robots.txt) for a published/exported
// site. Extracted from exportController so both the OSS export pipeline and
// hosted's cloud render loop produce identical output from one source.

import { formatXml } from "../utils/htmlProcessor.js";
import { isHomeSlug, siteUrlBase, absoluteSiteUrl, siteUrlPathname } from "@widgetizer/core/internalHref";
import { pageOutputPath, publicPath, itemOutputPath, languageFolder } from "@widgetizer/core/contentAddress";
import { itemUrlAt } from "@widgetizer/core/publishedUrls";

// Pagination plans are keyed by the language-qualified path of page one, because
// a slug is not unique across languages.
const pagedSitePaths = (pageId, pageCounts, cleanUrls, lang) => {
  const paths = [];
  const key = pageOutputPath(pageId, 1, lang);
  for (let number = 2; number <= (pageCounts.get(key) || pageCounts.get(pageId) || 1); number += 1) {
    paths.push(publicPath(pageOutputPath(pageId, number, lang), { cleanUrls }));
  }
  return paths;
};

// A page's own address, and the addresses of its translations. The homepage is
// the base itself (or the language's folder): `new URL("/", base)` would resolve
// to the HOST root and silently drop a subfolder Site URL's own path.
const addressOf = (slug, siteUrl, cleanUrls, lang) => {
  const folder = languageFolder(lang);
  if (isHomeSlug(slug)) return absoluteSiteUrl(siteUrl, folder ? `${folder}/` : "");
  return absoluteSiteUrl(siteUrl, publicPath(pageOutputPath(slug, 1, lang), { cleanUrls }));
};

// The alternates a sitemap entry carries, in the same shape and by the same
// rules as the hreflang link tags (§7d): every non-fallback, indexable entry,
// plus x-default at the default language. Nothing at all for one language.
// A noindex sibling is left out here too — the sitemap is a list of URLs the
// site is asking to have crawled, and naming one it has told crawlers to skip
// is the contradiction Search Console reports back as an error.
const alternateLinks = (translations, defaultLanguage) => {
  if (!Array.isArray(translations) || translations.length < 2) return "";
  const links = translations
    .filter((entry) => !entry.fallback && !entry.noindex && entry.seoUrl)
    .map((entry) => `
    <xhtml:link rel="alternate" hreflang="${entry.hreflang}" href="${entry.seoUrl}"/>`);
  const fallbackEntry = translations.find((entry) => entry.language === defaultLanguage);
  if (fallbackEntry?.seoUrl && !fallbackEntry.noindex) {
    links.push(`
    <xhtml:link rel="alternate" hreflang="x-default" href="${fallbackEntry.seoUrl}"/>`);
  }
  return links.join("");
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
export async function buildSitemap(
  pagesDataArray,
  siteUrl,
  itemPagesForSeo = [],
  cleanUrls = false,
  pageCounts = new Map(),
  { defaultLanguage = "", translationsOf = () => [] } = {},
) {
  // No usable base means no absolute <loc> can be built, so there is no sitemap
  // to write. `siteUrlBase` is the single gate the canonicals use too.
  if (!siteUrlBase(siteUrl)) return null;

  const langOf = (entry) => ({ language: entry.language, defaultLanguage });
  let multilingual = false;

  const sitemapUrls = pagesDataArray
    .filter((page) => !page.seo?.robots?.includes("noindex"))
    .flatMap((page) => {
      const lang = langOf(page);
      const lastMod = page.updated || page.gcreated || new Date().toISOString();
      const alternates = alternateLinks(translationsOf(page, "page"), defaultLanguage);
      if (alternates) multilingual = true;
      const entry = (loc, links = "") => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>${links}
  </url>`;
      // A paginated copy is its own URL but not its own translation: page 2 of
      // the Greek blog is not the alternate of page 2 of the English one.
      const copies = pagedSitePaths(page.id || page.slug, pageCounts, cleanUrls, lang).map((sitePath) =>
        entry(absoluteSiteUrl(siteUrl, sitePath)),
      );
      return [entry(addressOf(page.slug, siteUrl, cleanUrls, lang), alternates), ...copies];
    });

  const collectionSitemapUrls = [];
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex")) continue;
      const loc = itemUrlAt(slugPrefix, item.slug, { siteUrl, cleanUrls, defaultLanguage }, { language: item.language });
      const lastMod = item.updated || new Date().toISOString();
      const alternates = alternateLinks(translationsOf(item, "item", slugPrefix), defaultLanguage);
      if (alternates) multilingual = true;
      collectionSitemapUrls.push(`
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>${alternates}
  </url>`);
    }
  }

  // The xhtml namespace is declared only when something uses it, so a
  // single-language sitemap is byte-identical to the one before languages.
  const xhtmlNs = multilingual ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "";
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>${sitemapUrls.join("")}${collectionSitemapUrls.join("")}
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
export function buildRobotsTxt(
  pagesDataArray,
  siteUrl,
  itemPagesForSeo = [],
  cleanUrls = false,
  pageCounts = new Map(),
  { defaultLanguage = "" } = {},
) {
  if (!siteUrlBase(siteUrl)) return null;

  const sitemapUrl = absoluteSiteUrl(siteUrl, "sitemap.xml");
  // Single Set so a page and an item never emit duplicate Disallow lines.
  const disallowSet = new Set();
  for (const page of pagesDataArray) {
    if (!page.seo?.robots?.includes("noindex")) continue;
    const pageId = page.id || page.slug;
    if (!pageId) continue;
    const lang = { language: page.language, defaultLanguage };
    // A blocked page is blocked at the address it is published under, language
    // folder included — a bare /private does not protect /el/private.
    const filename = isHomeSlug(pageId)
      ? pageOutputPath(pageId, 1, lang)
      : publicPath(pageOutputPath(pageId, 1, lang), { cleanUrls });
    // Robots paths resolve against the HOST root, not the site's base, so a site
    // under /bakery/ must disallow /bakery/private — a bare /private protects
    // nothing.
    disallowSet.add(siteUrlPathname(siteUrl, filename));
    for (const sitePath of pagedSitePaths(pageId, pageCounts, cleanUrls, lang)) {
      disallowSet.add(siteUrlPathname(siteUrl, sitePath));
    }
  }
  for (const { slugPrefix, items } of itemPagesForSeo || []) {
    for (const item of items) {
      if (item.seo?.robots?.includes("noindex")) {
        const lang = { language: item.language, defaultLanguage };
        disallowSet.add(
          siteUrlPathname(siteUrl, publicPath(itemOutputPath(slugPrefix, item.slug, lang), { cleanUrls })),
        );
      }
    }
  }
  const disallowPaths = Array.from(disallowSet);
  const robotsLines = ["User-agent: *", "Allow: /", ...disallowPaths.map((p) => `Disallow: ${p}`), "", `Sitemap: ${sitemapUrl}`];
  return robotsLines.join("\n");
}
