/**
 * Resolve a stored `link` setting value to a display-ready shape for the editor's
 * link picker (LinkInput). Pure + side-effect free so it can be unit-tested.
 *
 * Stable refs (`pageUuid` / `collectionItemUuid`) get a live href derived from the
 * target's CURRENT slug when that target is present in the loaded picker options.
 *
 * Crucially, when a stable ref is NOT found in the options, the **raw value is
 * preserved** — the editor must not infer deletion from an inconclusive option
 * cache (options can be stale within the cache TTL, or partially loaded if the
 * collection-items fetch failed). Treating "absent from options" as "deleted"
 * would drop a still-valid ref on the next save. Real deletion is handled by the
 * backend link-integrity path (cleanup on delete) and render-time clearing.
 *
 * @param {object} value - Stored link value { pageUuid?, collectionItemUuid?, collectionType?, href, text, target }
 * @param {Map} optionsByUuid - uuid -> picker option ({ isPage|isCollectionItem, slug, slugPrefix, collectionType, ... })
 * @param {Map} pageOptionBySlug - page slug -> page option (for legacy href matching)
 * @param {boolean} loading - true while options are still loading (returns value untouched)
 * @returns {object} display-ready link value
 */
export function resolveStoredLink(value = {}, optionsByUuid, pageOptionBySlug, loading) {
  if (loading) return value;

  const { pageUuid, collectionItemUuid, collectionType, href = "", text = "", target = "_self" } = value;

  // Collection item target.
  if (collectionItemUuid) {
    const opt = optionsByUuid.get(collectionItemUuid);
    if (opt) {
      return {
        collectionType: collectionType || opt.collectionType,
        collectionItemUuid,
        href: `${opt.slugPrefix}/${opt.slug}.html`,
        text,
        target,
      };
    }
    return value; // absent from options — preserve the ref (do not infer deletion)
  }

  // Page target.
  if (pageUuid) {
    const opt = optionsByUuid.get(pageUuid);
    if (opt) {
      return { pageUuid, href: `${opt.slug}.html`, text, target };
    }
    return value; // absent from options — preserve the ref
  }

  // No stable ref — match a legacy internal href to a page so the picker shows the
  // page name (and a future save stores its uuid).
  if (href && href.endsWith(".html") && !href.includes("://") && !href.startsWith("#")) {
    const slug = href.replace(".html", "");
    const opt = pageOptionBySlug.get(slug);
    if (opt) {
      return { pageUuid: opt.value, href, text, target };
    }
  }

  return { href, text, target };
}
