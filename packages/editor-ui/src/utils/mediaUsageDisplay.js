/**
 * Constant titles for the three global usage sources (header / footer / theme
 * settings). Used to seed the usage-title map and as the empty-state fallback.
 */
export const GLOBAL_USAGE_TITLES = {
  "global:header": "Header (Global)",
  "global:footer": "Footer (Global)",
  "global:theme-settings": "Theme Settings (Global)",
};

/**
 * Build the usage-title map the Media library passes to {@link resolveUsageTitle}.
 * Keys are the raw usage-source strings stored on a media record's `usedIn`:
 *   - `global:*`              → friendly label (from GLOBAL_USAGE_TITLES)
 *   - a page id AND its slug  → the page's name/title/slug
 *   - `collection:{type}/{slug}` → `{displayName}: {item title}` (else the item slug)
 *
 * Pure + defensive: any of the inputs may be missing (a collections fetch can
 * fail independently — callers pass `[]`), and it always starts from a fresh
 * copy of the globals so the constant is never mutated.
 *
 * @param {Object} [input]
 * @param {Array<{id?:string, slug?:string, name?:string, title?:string}>} [input.pages]
 * @param {Array<{schema:{type:string, displayName:string}, items:Array<{slug:string, title?:string}>}>} [input.collections]
 * @returns {Record<string,string>}
 */
export function buildUsageTitleMap({ pages = [], collections = [] } = {}) {
  const map = { ...GLOBAL_USAGE_TITLES };

  for (const page of pages) {
    const title = page.name || page.title || page.slug;
    if (page.id) map[page.id] = title;
    if (page.slug) map[page.slug] = title;
  }

  for (const { schema, items = [] } of collections) {
    if (!schema?.type) continue;
    for (const item of items) {
      map[`collection:${schema.type}/${item.slug}`] = `${schema.displayName}: ${item.title || item.slug}`;
    }
  }

  return map;
}

/**
 * Resolve a media "Used in" usage entry to a human-friendly title.
 *
 * Shared by MediaGridItem and MediaListItem. A usage entry is either an object
 * (already carrying a title/name/id) or a source string such as:
 *   - a page id or slug        → looked up in usageTitleMap
 *   - "global:header"          → formatted as "Header (Global)"
 *   - "collection:portfolio/alpha" → looked up in usageTitleMap (seeded by
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
    const globalKey = usageEntry.replace("global:", "");
    return `${globalKey.charAt(0).toUpperCase() + globalKey.slice(1)} (Global)`;
  }

  // Unresolved page / collection / unknown source — fall back to the raw string.
  return usageEntry;
}
