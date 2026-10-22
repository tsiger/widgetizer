import { languageFolder } from "@widgetizer/core/contentAddress";
import { nativeLanguageName } from "@widgetizer/core/languages";

/**
 * Constant titles for the three global usage sources (header / footer / theme
 * settings). Used to seed the usage-title map and as the empty-state fallback.
 */
export const GLOBAL_USAGE_TITLES = {
  "global:root:header": "Header (Global)",
  "global:root:footer": "Footer (Global)",
  "global:theme-settings": "Theme Settings (Global)",
  "global:site-identity": "Business Details (Global)",
};

/**
 * Build the usage-title map the Media library passes to {@link resolveUsageTitle}.
 * Keys are the raw usage-source strings stored on a media record's `usedIn`:
 *   - `global:root:{type}`    → friendly label (from GLOBAL_USAGE_TITLES)
 *   - `page:{uuid}`           → the page's name/title/slug
 *   - `collection:{uuid}`     → `{displayName}: {item title}` (else the item slug)
 *
 * Every language's pages and items are listed, and the same page often has the
 * same name in each, so content outside the default language is tagged with its
 * language's name: "About (Ελληνικά)".
 *
 * Pure + defensive: any of the inputs may be missing (a collections fetch can
 * fail independently — callers pass `[]`), and it always starts from a fresh
 * copy of the globals so the constant is never mutated.
 *
 * @param {Object} [input]
 * @param {Array<{id?:string, slug?:string, name?:string, title?:string, language?:string}>} [input.pages]
 * @param {Array<{schema:{type:string, displayName:string}, items:Array<{slug:string, title?:string, language?:string}>}>} [input.collections]
 * @param {string} [input.defaultLanguage] - the project's default language; content in it is not tagged
 * @returns {Record<string,string>}
 */
export function buildUsageTitleMap({ pages = [], collections = [], defaultLanguage = "" } = {}) {
  const map = { ...GLOBAL_USAGE_TITLES };
  const isOtherLanguage = (entry) => Boolean(entry.language) && entry.language !== defaultLanguage;
  const tagged = (title, entry) => (isOtherLanguage(entry) ? withLanguage(title, entry.language) : title);
  const inFolder = (entry, slug) => {
    const folder = languageFolder({ language: entry.language, defaultLanguage });
    return folder ? `${folder}/${slug}` : slug;
  };

  for (const page of pages) {
    const title = tagged(page.name || page.title || page.slug, page);
    // Usage is keyed by uuid; the slug and id are kept as fallbacks for rows a rebuild
    // has not reached yet (a page saved before uuids existed keeps its slug as identity).
    // Those rows predate languages, and a slug repeats across them, so only the
    // default language's pages claim them.
    if (page.uuid) map[`page:${page.uuid}`] = title;
    // A row written while the content could not take a uuid (a read-only working
    // folder) names it by its language folder and slug instead.
    if (page.slug) map[`page:slug:${inFolder(page, page.slug)}`] = title;
    if (isOtherLanguage(page)) continue;
    if (page.id) map[`page:${page.id}`] = title;
    if (page.slug) map[`page:${page.slug}`] = title;
  }

  for (const { schema, items = [] } of collections) {
    if (!schema?.type) continue;
    for (const item of items) {
      const title = tagged(`${schema.displayName}: ${item.title || item.slug}`, item);
      if (item.uuid) map[`collection:${item.uuid}`] = title;
      if (item.slug) map[`collection:slug:${schema.type}/${inFolder(item, item.slug)}`] = title;
      if (item.slug && !isOtherLanguage(item)) map[`collection:${item.slug}`] = title;
    }
  }

  return map;
}

function withLanguage(title, language) {
  return `${title} (${nativeLanguageName(language)})`;
}

/**
 * Resolve a media "Used in" usage entry to a human-friendly title.
 *
 * Shared by MediaGridItem and MediaListItem. A usage entry is either an object
 * (already carrying a title/name/id) or a source string such as:
 *   - "page:{uuid}"            → looked up in usageTitleMap
 *   - "global:root:header"     → formatted as "Header (Global)"
 *   - "collection:{uuid}"      → looked up in usageTitleMap (seeded by
 *     Media.jsx with "{displayName}: {item title}"), else the raw string is
 *     returned as a graceful fallback (e.g. the collection was removed).
 *
 * @param {string|{title?:string,name?:string,id?:string}} usageEntry
 * @param {Record<string,string>} usageTitleMap
 * @returns {string|null}
 */
export function resolveUsageTitle(usageEntry, usageTitleMap = {}) {
  if (!usageEntry) return null;

  if (typeof usageEntry === "object") {
    return usageEntry.title || usageEntry.name || usageEntry.id || null;
  }

  if (usageTitleMap[usageEntry]) {
    return usageTitleMap[usageEntry];
  }

  if (usageEntry.startsWith("global:")) {
    // `global:root:header` is the default language's header, `global:el:header`
    // another language's; a row written before ids were namespaced has neither.
    const [first, second] = usageEntry.slice("global:".length).split(":");
    const globalKey = second ?? first;
    const language = second !== undefined && first !== "root" ? first : null;
    const name = globalKey.charAt(0).toUpperCase() + globalKey.slice(1);
    return language ? `${name} (Global, ${nativeLanguageName(language)})` : `${name} (Global)`;
  }

  // Unresolved page / collection / unknown source — fall back to the raw string.
  return usageEntry;
}
