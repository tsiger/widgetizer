/**
 * Breadcrumb trail builder (docs-llms/future-breadcrumbs-design.md).
 *
 * Hierarchy comes only from what the user stated: a page's `parentPageUuid`, or
 * for a collection item the listing widget flagged as that collection's anchor
 * (else the one page that lists it). Nothing is inferred from menus or URLs, so
 * a nav edit can never rewrite a trail — or, once stage 3 lands, the
 * BreadcrumbList built from it.
 *
 * Pure: callers pass the page map and the listing index in. Rendering lives in
 * the `breadcrumbs` snippet.
 */
import { pageHref, itemHref } from "./internalHref.js";
import { isHomeSlug, pagedHref, pageOutputPath, itemOutputPath } from "./contentAddress.js";

/** A parent chain longer than this is treated as broken data, not walked. */
const MAX_DEPTH = 10;

/** `about` → `about.html` (`el/about.html` in another language), the path menus and canonicals compare against. */
function pageCanonicalPath(slug, lang) {
  return pageOutputPath(slug || "", 1, lang);
}

function itemCanonicalPath(slugPrefix, slug, lang) {
  return itemOutputPath(slugPrefix, slug, lang);
}

/**
 * The homepage of the trail's own language. `index` wins over `home` when a
 * project somehow has both, so the choice never depends on map iteration order.
 */
function findHomePage(pagesByUuid, language) {
  let fallback = null;
  for (const page of pagesByUuid.values()) {
    if (!isHomeSlug(page?.slug) || !sameLanguage(page, language)) continue;
    if (page.slug === "index") return page;
    if (!fallback) fallback = page;
  }
  return fallback;
}

/** A loaded page carries its resolved language; a map built without one is single-language. */
function sameLanguage(page, language) {
  return !language || !page?.language || page.language === language;
}

/**
 * The page a `parentPageUuid` names, in the trail's language: the parent itself
 * when it is already there, else its sibling in that language. A parent that
 * exists only in another language has nothing to point at and ends the chain.
 */
function parentInLanguage(parentUuid, pagesByUuid, language) {
  const parent = pagesByUuid.get(parentUuid);
  if (!parent || sameLanguage(parent, language)) return parent || null;
  const group = parent.translationGroupId;
  if (!group) return null;
  for (const candidate of pagesByUuid.values()) {
    if (candidate?.translationGroupId === group && sameLanguage(candidate, language)) return candidate;
  }
  return null;
}

/**
 * Walk `parentPageUuid` upward from `page`, nearest ancestor first. Stops at the
 * homepage (the caller prepends it), on a repeat (cycle), at a missing uuid, and
 * at MAX_DEPTH.
 */
function ancestorsOf(page, pagesByUuid, language) {
  const chain = [];
  const seen = new Set([page?.uuid]);
  let current = page;

  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    const parentUuid = current?.parentPageUuid;
    if (!parentUuid || seen.has(parentUuid)) break;
    const parent = parentInLanguage(parentUuid, pagesByUuid, language);
    if (!parent || seen.has(parent.uuid)) break;
    seen.add(parentUuid);
    seen.add(parent.uuid);
    if (isHomeSlug(parent.slug)) break;
    chain.push(parent);
    current = parent;
  }

  return chain.reverse();
}

/**
 * The page a collection item hangs under: the anchor if one is set, else the
 * only page listing that collection. Two listing pages and no anchor is
 * ambiguous, so the item sits directly under Home.
 *
 * @param {{anchorPageUuid?: string|null, anchorByLanguage?: object, pageUuids?: string[]}} entry
 */
function listingParent(entry, pagesByUuid, language) {
  if (!entry) return null;
  const anchorUuid = anchorFor(entry, language);
  if (anchorUuid) {
    const anchor = parentInLanguage(anchorUuid, pagesByUuid, language);
    if (anchor) return anchor;
  }
  const listed = distinctParents(entry, pagesByUuid, language);
  return listed.length === 1 ? listed[0] : null;
}

/** The anchor chosen in this language, else the one chosen in any language. */
function anchorFor(entry, language) {
  const byLanguage = entry.anchorByLanguage || {};
  return byLanguage[language || ""] ?? byLanguage[""] ?? entry.anchorPageUuid ?? null;
}

/**
 * The listing pages as seen from `language`, deduplicated: two languages'
 * listings resolve to the same page once the trail picks one, and a single page
 * is not an ambiguous choice.
 */
function distinctParents(entry, pagesByUuid, language) {
  const byUuid = new Map();
  for (const uuid of entry?.pageUuids || []) {
    const page = parentInLanguage(uuid, pagesByUuid, language);
    if (page?.uuid && !byUuid.has(page.uuid)) byUuid.set(page.uuid, page);
  }
  return [...byUuid.values()];
}

/**
 * Whether a collection's items find the page they hang under, for export
 * reporting: "resolved" (the anchor, or the only listing page — the homepage
 * included), "ambiguous" (several pages list it and none is the anchor), or
 * "missing" (no existing page lists it).
 *
 * @param {{anchorPageUuid?: string|null, anchorByLanguage?: object, pageUuids?: string[]}|undefined} entry
 * @param {Map<string, object>} pagesByUuid
 * @param {string} [language]
 * @returns {"resolved"|"ambiguous"|"missing"}
 */
export function listingParentStatus(entry, pagesByUuid, language) {
  if (listingParent(entry, pagesByUuid, language)) return "resolved";
  return distinctParents(entry, pagesByUuid, language).length > 1 ? "ambiguous" : "missing";
}

function crumb(label, href, canonicalPath, flags = {}) {
  return { label: label || "", href, canonicalPath, current: false, home: false, ...flags };
}

/**
 * Build the trail for the page or item being rendered.
 *
 * @param {object} args
 * @param {object} [args.page] - the page being rendered (omit for an item)
 * @param {object} [args.item] - `{ slug, name, slugPrefix }` for a collection item page
 * @param {string} [args.collectionType] - the item's collection type, keying `listingPages`
 * @param {Map<string, object>} args.pagesByUuid
 * @param {Map<string, {anchorPageUuid?: string|null, pageUuids?: string[]}>} [args.listingPages]
 * @param {boolean} [args.cleanUrls]
 * @param {string} [args.outputPathPrefix]
 * @param {string} [args.language] - the trail's language; crumbs stay inside it
 * @param {string} [args.defaultLanguage]
 * @param {number} [args.pageNumber] - 2+ on a paginated copy, which ends the trail with a numbered crumb
 * @returns {Array<{label: string, href: string|null, canonicalPath: string|null, current: boolean, home: boolean}>}
 *   Home first, current page last. Empty on the homepage.
 */
export function buildBreadcrumbs({
  page = null,
  item = null,
  collectionType = null,
  pagesByUuid = new Map(),
  listingPages = new Map(),
  cleanUrls = false,
  outputPathPrefix = "",
  pageNumber = 1,
  language = "",
  defaultLanguage = "",
} = {}) {
  const trailLanguage = language || page?.language || "";
  const hrefOpts = { cleanUrls, outputPathPrefix, language: trailLanguage, defaultLanguage };
  const langOf = (p) => ({ language: p?.language || trailLanguage, defaultLanguage });
  const asCrumb = (p, flags) =>
    crumb(
      p.name || p.slug,
      pageHref(p.slug, { ...hrefOpts, ...langOf(p) }),
      pageCanonicalPath(p.slug, langOf(p)),
      flags,
    );

  // The homepage carries no trail — it is the root, and a one-crumb "Home" says
  // nothing a visitor does not already know.
  if (page && isHomeSlug(page.slug) && !(pageNumber > 1)) return [];
  if (!page && !item) return [];

  const trail = [];
  const home = findHomePage(pagesByUuid, trailLanguage);
  if (home) trail.push(asCrumb(home, { home: true }));

  // An item hangs under its listing page, which then continues up by the page
  // rules; a page walks its own parent chain.
  const anchorPage = item ? listingParent(listingPages.get(collectionType), pagesByUuid, trailLanguage) : null;
  const branch = item ? anchorPage : page;
  if (branch && !isHomeSlug(branch.slug)) {
    for (const ancestor of ancestorsOf(branch, pagesByUuid, trailLanguage)) trail.push(asCrumb(ancestor));
    if (item) trail.push(asCrumb(branch));
  }

  if (item) {
    trail.push(
      crumb(
        item.name || item.slug,
        itemHref(item.slugPrefix, item.slug, { ...hrefOpts, ...langOf(item) }),
        itemCanonicalPath(item.slugPrefix, item.slug, langOf(item)),
        { current: true },
      ),
    );
  } else if (pageNumber > 1) {
    if (!isHomeSlug(page.slug)) trail.push(asCrumb(page));
    trail.push(
      crumb(
        String(pageNumber),
        pagedHref(page.slug, pageNumber, { ...hrefOpts, ...langOf(page) }),
        pageOutputPath(page.slug, pageNumber, langOf(page)),
        { current: true, pageNumber },
      ),
    );
  } else {
    trail.push(asCrumb(page, { current: true }));
  }

  return trail;
}

/**
 * Index the pages that list each collection, for `listingPages` above: which
 * page is a collection's anchor, and how many pages list it at all.
 *
 * A widget counts when its schema declares `collection.type`; it is the anchor
 * when that widget's `listing_anchor` setting is on. Two anchors is broken data
 * — first page by slug wins so every render agrees.
 *
 * @param {Iterable<object>} pages - page objects carrying `widgets`
 * @param {Map<string, object>|object} schemasByType - widget schemas keyed by widget type
 * @returns {Map<string, {anchorPageUuid: string|null, anchorByLanguage: object, pageUuids: string[]}>}
 */
export function indexListingPages(pages, schemasByType) {
  const get = (type) =>
    schemasByType instanceof Map ? schemasByType.get(type) : schemasByType?.[type];
  const byCollection = new Map();
  const anchors = new Map();

  const sorted = [...pages].sort((a, b) => String(a?.slug || "").localeCompare(String(b?.slug || "")));
  for (const page of sorted) {
    if (!page?.uuid) continue;
    for (const widget of Object.values(page.widgets || {})) {
      const declared = get(widget?.type)?.collection?.type;
      if (!declared) continue;

      if (!byCollection.has(declared)) byCollection.set(declared, new Set());
      byCollection.get(declared).add(page.uuid);

      // One anchor per language: each language picks its own listing page, and a
      // page can only be the anchor of the language it lives in.
      if (widget?.settings?.listing_anchor) {
        if (!anchors.has(declared)) anchors.set(declared, new Map());
        const byLanguage = anchors.get(declared);
        const key = page.language || "";
        if (!byLanguage.has(key)) byLanguage.set(key, page.uuid);
      }
    }
  }

  const result = new Map();
  for (const [type, uuids] of byCollection) {
    const byLanguage = anchors.get(type) || new Map();
    result.set(type, {
      anchorPageUuid: [...byLanguage.values()][0] ?? null,
      anchorByLanguage: Object.fromEntries(byLanguage),
      pageUuids: [...uuids],
    });
  }
  return result;
}
