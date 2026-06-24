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
