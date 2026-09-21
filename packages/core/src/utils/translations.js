import { pageHref, itemHref } from "./internalHref.js";
import { itemUrlAt, pageUrlAt } from "./publishedUrls.js";
import { homeHref, isHomeSlug, translationGroupIdOf, resolveLanguage } from "./contentAddress.js";
import { hreflangCase, languageDir, nativeLanguageName } from "./languages.js";

/** Whether a page or item asked not to be indexed (the SEO `robots` field). */
export function isNoindex(entry) {
  return !!entry?.seo?.robots?.includes("noindex");
}

/**
 * Everything `buildTranslations` reads off a sibling, and nothing else.
 *
 * Its two callers hold different objects: the SEO artifact builders pass whole
 * page and item records, while a render passes the uuid reference map, whose
 * entries are a projection built for link resolution. When those shapes
 * disagree the two artifacts describe the same site differently — a `noindex`
 * item translation was once excluded from the sitemap and advertised in the
 * HTML, because the reference carried no SEO fields at all.
 *
 * So this is the one definition of the shape, and both sides go through it:
 * `buildTranslations` narrows whatever it is given, and the reference map is
 * built from it. Adding a field here is what keeps the two paths reading the
 * same facts; adding one to only one producer is the mistake this prevents.
 */
export function translationSibling(source, overrides = undefined) {
  if (!source) return null;
  return {
    uuid: source.uuid,
    translationGroupId: source.translationGroupId,
    slug: source.slug,
    language: source.language,
    slugPrefix: source.slugPrefix,
    // Only the directive, not the whole SEO block: this shape is carried per
    // item through a render, and it exists to answer questions, not to be a
    // second copy of the content.
    seo: { robots: source.seo?.robots },
    ...overrides,
  };
}

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
 *
 * `noindex` marks an entry whose target asked not to be indexed. It is read by
 * the hreflang emitters for the same reason: a cluster is a set of pages a
 * crawler may index, so an annotation pointing into a noindex page is dropped
 * by search engines and only costs the site a contradictory signal. The
 * switcher ignores the flag — noindex is about crawlers, and a visitor can
 * still follow the link.
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
  // subject to this: a site without one fails the export outright — so it is
  // seeded with no page behind it, and a caller that did not pass one simply
  // cannot be asked anything about it.
  //
  // The homepage itself is kept, not just the fact that there is one, because a
  // fallback entry POINTS AT it: whether that entry may be an hreflang
  // alternate is a question about the homepage's own robots directive, not
  // about the missing translation.
  const homepages = new Map([[resolvedDefault, null]]);
  for (const page of pages) {
    if (isHomeSlug(page.slug)) homepages.set(resolveLanguage(page.language, resolvedDefault), translationSibling(page));
  }

  const groupId = translationGroupIdOf(current);
  const siblings = new Map();
  if (groupId) {
    for (const entry of kind === "item" ? items : pages) {
      if (kind === "item" && slugPrefix && entry.slugPrefix && entry.slugPrefix !== slugPrefix) continue;
      if (translationGroupIdOf(entry) !== groupId) continue;
      siblings.set(resolveLanguage(entry.language, resolvedDefault), translationSibling(entry));
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
        seoUrl = itemUrlAt(slugPrefix, sibling.slug, urlProject, { language });
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
        // The destination decides, and for a fallback entry the destination is
        // that language's homepage.
        noindex: isNoindex(sibling || homepages.get(language)),
        dir: languageDir(language),
      };
    });
}
