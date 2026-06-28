/**
 * Stable internal references for richtext links.
 *
 * Richtext anchors that target an internal page or collection item carry the target's
 * stable uuid as a data-attribute — `data-page-uuid` / `data-collection-item-uuid` — so
 * the uuid is the source of truth and `href` is just a fallback/display value. This is the
 * richtext analogue of the structured `link` setting (pageUuid/collectionItemUuid).
 *
 * TWO scan modes (kept separate on purpose):
 *   - by data-attr  → render resolution, cleanup, remap (the uuid is present and is identity).
 *   - by href slug  → enrichment / backfill (run *after* attrs are stripped, e.g. presets),
 *                      which stamp/overwrite the attrs from the link's slug.
 *
 * Lives under @widgetizer/core so the render engine can import it without backend code.
 * Render resolution runs on the per-render clone; stored values keep the portable form.
 */

import { prefixInternalHref } from "./linkPrefixer.js";

// Render content is DOMPurify-normalized (double-quoted), but the on-disk lifecycle
// helpers also run on RAW stored HTML (source-mode / imported / preset), which may use
// single quotes — so every attr/href matcher accepts either quote (["']). Values (uuids,
// slugs) never contain quotes, so [^"'] is a safe value class.
const ANCHOR_OPEN_TAG_RE = /<a\b[^>]*>/gi;
const PAGE_UUID_ATTR_RE = /\s+data-page-uuid=["']([^"']*)["']/i;
const ITEM_UUID_ATTR_RE = /\s+data-collection-item-uuid=["']([^"']*)["']/i;
const HREF_ATTR_RE = /\s+href=["'][^"']*["']/i;

function setHref(openTag, href) {
  if (HREF_ATTR_RE.test(openTag)) {
    return openTag.replace(HREF_ATTR_RE, ` href="${href}"`);
  }
  return openTag.replace(/^<a\b/i, `<a href="${href}"`);
}

function stripAttrs(openTag, ...res) {
  return res.reduce((tag, re) => tag.replace(re, ""), openTag);
}

/**
 * Render-time resolution: rewrite each internal anchor's `href` from its stable uuid to
 * the target's current slug (depth-prefixed via outputPathPrefix). Availability is decided
 * by map *presence*, never by `map.size`:
 *   - map is `undefined`/`null` (caller can't resolve) → leave the stored href (fallback).
 *   - map is a loaded `Map` and the uuid is absent (target deleted) → neutralize the anchor
 *     (drop `href` + the data-uuid attr) so it renders as harmless non-navigable text.
 *   - uuid found → rewrite `href`.
 * External anchors (no data-uuid) pass through untouched.
 * @param {*} html
 * @param {{ pagesByUuid?: Map, collectionItemsByUuid?: Map, outputPathPrefix?: string }} deps
 * @returns {*} rewritten string (or input unchanged when not a non-empty string / no refs)
 */
export function resolveRichtextLinkRefs(html, { pagesByUuid, collectionItemsByUuid, outputPathPrefix = "" } = {}) {
  if (typeof html !== "string" || html === "" || !html.includes("data-")) return html;
  return html.replace(ANCHOR_OPEN_TAG_RE, (openTag) => {
    const itemMatch = openTag.match(ITEM_UUID_ATTR_RE);
    if (itemMatch) {
      if (!collectionItemsByUuid) return openTag; // map unavailable → fallback to stored href
      const entry = collectionItemsByUuid.get(itemMatch[1]);
      if (entry) return setHref(openTag, prefixInternalHref(`${entry.slugPrefix}/${entry.slug}.html`, outputPathPrefix));
      return stripAttrs(openTag, HREF_ATTR_RE, ITEM_UUID_ATTR_RE); // deleted → neutralize
    }
    const pageMatch = openTag.match(PAGE_UUID_ATTR_RE);
    if (pageMatch) {
      if (!pagesByUuid) return openTag;
      const page = pagesByUuid.get(pageMatch[1]);
      if (page) return setHref(openTag, prefixInternalHref(`${page.slug}.html`, outputPathPrefix));
      return stripAttrs(openTag, HREF_ATTR_RE, PAGE_UUID_ATTR_RE);
    }
    return openTag;
  });
}

/**
 * Resolve richtext link refs in place for every `richtext` field of a flat settings object.
 * @param {object} settings - mutated in place
 * @param {Array} schemaSettings - schema `settings` array
 * @param {object} deps - see resolveRichtextLinkRefs
 */
export function resolveRichtextLinksInSettings(settings, schemaSettings, deps) {
  if (!settings || !Array.isArray(schemaSettings)) return;
  for (const setting of schemaSettings) {
    if (setting.type === "richtext" && setting.id && typeof settings[setting.id] === "string") {
      settings[setting.id] = resolveRichtextLinkRefs(settings[setting.id], deps);
    }
  }
}

/**
 * Resolve richtext link refs across a widget's top-level settings and every block's settings.
 * @param {object} widgetData - { settings, blocks? } mutated in place
 * @param {object} schema - widget schema with `settings` + optional `blocks` arrays
 * @param {object} deps - see resolveRichtextLinkRefs
 */
export function resolveRichtextLinksInWidgetData(widgetData, schema, deps) {
  if (!widgetData || !schema) return;
  resolveRichtextLinksInSettings(widgetData.settings, schema.settings, deps);
  if (widgetData.blocks && Array.isArray(schema.blocks)) {
    const settingsByType = new Map(schema.blocks.filter((b) => b.type).map((b) => [b.type, b.settings]));
    for (const block of Object.values(widgetData.blocks)) {
      if (block && block.type && block.settings && settingsByType.has(block.type)) {
        resolveRichtextLinksInSettings(block.settings, settingsByType.get(block.type), deps);
      }
    }
  }
}

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
const escapeRegExp = (s) => s.replace(ESCAPE_RE, "\\$&");

/**
 * Strip both stable-ref attrs from richtext anchors — used by preset tooling so a demo
 * project's per-project uuids don't ship stale in a preset (they're re-derived from href
 * slugs at project creation / seed).
 * @param {*} html
 * @returns {*}
 */
export function stripRichtextLinkRefs(html) {
  if (typeof html !== "string" || !html.includes("data-")) return html;
  return html
    .replace(/\s+data-page-uuid=["'][^"']*["']/gi, "")
    .replace(/\s+data-collection-item-uuid=["'][^"']*["']/gi, "");
}

// ---------------------------------------------------------------------------
// Integrity helpers (link lifecycle) — used by builder-server linkEnrichment.
// `cleanup`/`remap` scan by the data-uuid attr; `enrich` scans by internal href.
// ---------------------------------------------------------------------------

/**
 * Cleanup (delete): unwrap richtext anchors whose stable ref targets a deleted page/item —
 * strip the `<a>` wrapper but keep the inner text (the "make harmless" path). Anchors can't
 * nest, so a non-greedy inner match is safe.
 * @param {*} html
 * @param {{ pageUuids?: Set<string>, itemUuids?: Set<string> }} targets
 * @returns {*}
 */
export function cleanupRichtextLinkRefs(html, { pageUuids, itemUuids } = {}) {
  if (typeof html !== "string" || !html.includes("<a")) return html;
  let out = html;
  const unwrap = (attrName, uuidSet) => {
    for (const uuid of uuidSet) {
      const re = new RegExp(`<a\\b[^>]*\\b${attrName}=["']${escapeRegExp(uuid)}["'][^>]*>([\\s\\S]*?)</a>`, "gi");
      out = out.replace(re, (_m, inner) => inner);
    }
  };
  if (pageUuids && pageUuids.size) unwrap("data-page-uuid", pageUuids);
  if (itemUuids && itemUuids.size) unwrap("data-collection-item-uuid", itemUuids);
  return out;
}

/**
 * Remap (duplication / preset seed): rewrite stable-ref uuid attr *values* via old→new maps.
 * @param {*} html
 * @param {{ pageMap?: Map<string,string>, itemMap?: Map<string,string> }} maps
 * @returns {*}
 */
export function remapRichtextLinkRefs(html, { pageMap, itemMap } = {}) {
  if (typeof html !== "string" || !html.includes("data-")) return html;
  let out = html;
  if (pageMap && pageMap.size) {
    out = out.replace(/(\bdata-page-uuid=["'])([^"']*)(["'])/gi, (m, pre, val, post) =>
      pageMap.has(val) ? `${pre}${pageMap.get(val)}${post}` : m,
    );
  }
  if (itemMap && itemMap.size) {
    out = out.replace(/(\bdata-collection-item-uuid=["'])([^"']*)(["'])/gi, (m, pre, val, post) =>
      itemMap.has(val) ? `${pre}${itemMap.get(val)}${post}` : m,
    );
  }
  return out;
}

/**
 * Enrichment / backfill: derive a stable ref from each internal anchor's `href` slug and stamp
 * the matching `data-*-uuid` (clearing the other kind). Used for presets with stripped attrs
 * and slug-only stored links. External / unresolved hrefs are left as-is.
 * @param {*} html
 * @param {{ pageSlugToUuid?: Map<string,string>, itemUuidBySlugPath?: Map<string,string> }} maps
 * @returns {*}
 */
export function enrichRichtextLinkRefs(html, { pageSlugToUuid, itemUuidBySlugPath } = {}) {
  if (typeof html !== "string" || !html.includes("<a")) return html;
  return html.replace(ANCHOR_OPEN_TAG_RE, (openTag) => {
    const hrefMatch = openTag.match(/\s+href=["']([^"']*)["']/i);
    if (!hrefMatch) return openTag;
    const href = hrefMatch[1];
    if (!href || href.includes("://") || href.startsWith("#") || !href.endsWith(".html")) return openTag;
    const itemM = href.match(/^([^/]+)\/([^/]+)\.html$/);
    if (itemM && itemUuidBySlugPath) {
      const uuid = itemUuidBySlugPath.get(`${itemM[1]}/${itemM[2]}`);
      if (uuid) {
        return stripAttrs(openTag, PAGE_UUID_ATTR_RE, ITEM_UUID_ATTR_RE).replace(
          /^<a\b/i,
          `<a data-collection-item-uuid="${uuid}"`,
        );
      }
    }
    const pageM = href.match(/^([^/]+)\.html$/);
    if (pageM && pageSlugToUuid) {
      const uuid = pageSlugToUuid.get(pageM[1]);
      if (uuid) {
        return stripAttrs(openTag, PAGE_UUID_ATTR_RE, ITEM_UUID_ATTR_RE).replace(
          /^<a\b/i,
          `<a data-page-uuid="${uuid}"`,
        );
      }
    }
    return openTag;
  });
}

/**
 * Whether a schema declares a `richtext` setting in its top-level settings OR any block's
 * settings — used to gate loading the collection-item uuid map for richtext-only widgets/items.
 * @param {object} schema
 * @returns {boolean}
 */
export function schemaHasRichtextSetting(schema) {
  const inSettings = Array.isArray(schema?.settings) && schema.settings.some((s) => s.type === "richtext");
  if (inSettings) return true;
  return (
    Array.isArray(schema?.blocks) &&
    schema.blocks.some((b) => Array.isArray(b?.settings) && b.settings.some((s) => s.type === "richtext"))
  );
}
