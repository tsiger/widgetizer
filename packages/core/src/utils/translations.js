import { absoluteSiteUrl, pageHref, itemHref } from "./internalHref.js";
import { pageUrlAt } from "./publishedUrls.js";
import {
  homeHref,
  isHomeSlug,
  publicPath,
  itemOutputPath,
  translationGroupIdOf,
  resolveLanguage,
} from "./contentAddress.js";
import { hreflangCase, languageDir, nativeLanguageName } from "./languages.js";

/**
 * `page.translations` — the theme contract for a language switcher (§7c), and
 * the source of the hreflang set (§7d).
 *
 * One entry per language the site actually publishes. An enabled language with
 * no homepage is left out entirely (§7b): linking to a language nobody has
 * written is a 404, in the switcher and in hreflang alike.
 *
 * Each entry carries BOTH link forms, because they cannot be one field: the
 * switcher is a link inside a static page and needs a relative path to a real
 * file, while hreflang is metadata for crawlers and needs an absolute URL.
 *
 * `fallback` marks an entry that points at its language's homepage because the
 * thing being rendered has no sibling there. The switcher may use those —
 * landing someone on the homepage beats a dead end — but an ordinary hreflang
 * alternate never may, and says so by reading this flag.
 */
export function buildTranslations({
  current,
  kind = "page",
  slugPrefix = "",
  pages = [],
  items = [],
  languages = [],
  defaultLanguage,
  cleanUrls = false,
  outputPathPrefix = "",
  siteUrl = "",
} = {}) {
  const resolvedDefault = resolveLanguage("", defaultLanguage);
  if (!languages.length) return [];

  // A language publishes only if it has a homepage. The default language is not
  // subject to this: a site without one fails the export outright.
  const homepages = new Set([resolvedDefault]);
  for (const page of pages) {
    if (isHomeSlug(page.slug)) homepages.add(resolveLanguage(page.language, resolvedDefault));
  }

  const groupId = translationGroupIdOf(current);
  const siblings = new Map();
  if (groupId) {
    for (const entry of kind === "item" ? items : pages) {
      if (kind === "item" && slugPrefix && entry.slugPrefix && entry.slugPrefix !== slugPrefix) continue;
      if (translationGroupIdOf(entry) !== groupId) continue;
      siblings.set(resolveLanguage(entry.language, resolvedDefault), entry);
    }
  }

  const currentLanguage = resolveLanguage(current?.language, resolvedDefault);
  // What the canonical helpers read a project as.
  const urlProject = { siteUrl, cleanUrls, defaultLanguage: resolvedDefault };

  return languages
    .filter((language) => homepages.has(language))
    .map((language) => {
      const sibling = siblings.get(language);
      const linkOptions = { cleanUrls, outputPathPrefix, language, defaultLanguage: resolvedDefault };

      // The link and the address are built by different rules. `href` is a link
      // inside a page, so it is depth-aware and follows Clean URLs. `seoUrl` is
      // the page's CANONICAL address, so it comes from the same helper the
      // canonical tag uses — a homepage is `/` or `/el/` either way, and an
      // hreflang that disagreed with the canonical would describe a page that
      // says it lives somewhere else.
      const isHome = !sibling || (kind === "page" && isHomeSlug(sibling.slug));
      let href;
      let seoUrl;
      if (isHome) {
        href = homeHref(linkOptions);
        seoUrl = pageUrlAt("index", 1, urlProject, { language });
      } else if (kind === "item") {
        href = itemHref(slugPrefix, sibling.slug, linkOptions);
        seoUrl = absoluteSiteUrl(
          siteUrl,
          publicPath(itemOutputPath(slugPrefix, sibling.slug, { language, defaultLanguage: resolvedDefault }), {
            cleanUrls,
          }),
        );
      } else {
        href = pageHref(sibling.slug, linkOptions);
        seoUrl = pageUrlAt(sibling.slug, 1, urlProject, { language });
      }

      return {
        language,
        hreflang: hreflangCase(language),
        label: nativeLanguageName(language),
        href,
        seoUrl,
        active: language === currentLanguage,
        fallback: !sibling,
        dir: languageDir(language),
      };
    });
}
