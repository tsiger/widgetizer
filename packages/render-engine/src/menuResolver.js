/**
 * menuResolver — pure `menu`-type setting resolution shared by widget rendering
 * and collection-item rendering.
 *
 * The resolver operates only on passed-in maps (menus/pages/collection-items)
 * and string helpers from `@widgetizer/core`, so it touches neither `fs` nor
 * `scope`. The shell loads the menu maps (OSS via fs, hosted via cloud storage)
 * and passes them in.
 */

import { MAX_MENU_DEPTH } from "@widgetizer/core/adapters";
import { prefixInternalHref, normalize } from "@widgetizer/core/linkPrefixer";
import { sanitizeHref } from "@widgetizer/core/urlSafety";

/**
 * Recursively resolve links in menu items. Each item resolves to an emitted
 * (depth-aware, prefixed) `link` plus an un-prefixed `canonicalPath` for
 * active-state matching. Stable refs (collectionItemUuid/pageUuid) resolve to
 * the current slug; missing targets clear the link; custom links are sanitized.
 * @param {Array} menuItems - Array of menu items
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {Array} Menu items with resolved links
 */
export function resolveMenuItemLinks(
  menuItems,
  pagesByUuid,
  outputPathPrefix = "",
  collectionItemsByUuid = new Map(),
  depth = 1,
) {
  if (!menuItems || !Array.isArray(menuItems)) {
    return menuItems;
  }

  // Cap recursion depth so rendering a hostile or unchecked menu tree can never
  // blow the call stack. Levels beyond the cap are returned unresolved rather
  // than walked.
  if (depth > MAX_MENU_DEPTH) {
    return menuItems;
  }

  return menuItems.map((item) => {
    const resolved = { ...item };

    // Resolve the href for this item, computing both the emitted (depth-aware,
    // prefixed) `link` and the un-prefixed `canonicalPath` used for active-state
    // matching. Every item is processed — including custom URLs — so links work
    // from any output depth, not just resolved ones.
    if (item.collectionItemUuid) {
      // Stable reference to a collection item page (#11): resolve its current
      // slug, mirroring pageUuid so renames follow and deletes clear the link.
      const entry = collectionItemsByUuid && collectionItemsByUuid.get(item.collectionItemUuid);
      if (entry) {
        const href = `${entry.slugPrefix}/${entry.slug}.html`;
        resolved.link = prefixInternalHref(href, outputPathPrefix);
        resolved.canonicalPath = normalize(href);
      } else {
        // Collection item was deleted - clear the link
        resolved.link = "";
        resolved.canonicalPath = "";
        delete resolved.collectionItemUuid;
        delete resolved.collectionType;
      }
    } else if (item.pageUuid) {
      const page = pagesByUuid && pagesByUuid.get(item.pageUuid);
      if (page) {
        const href = `${page.slug}.html`;
        resolved.link = prefixInternalHref(href, outputPathPrefix);
        resolved.canonicalPath = normalize(href);
      } else {
        // Page was deleted - clear the link
        resolved.link = "";
        resolved.canonicalPath = "";
        delete resolved.pageUuid;
      }
    } else if (typeof item.link === "string" && item.link) {
      resolved.link = prefixInternalHref(item.link, outputPathPrefix);
      resolved.canonicalPath = normalize(item.link);
    } else {
      resolved.canonicalPath = "";
    }

    // Block dangerous protocols in author-entered custom links (parity with
    // setting-type "link" fields). Resolved internal slugs are unaffected;
    // this catches javascript:/data:/vbscript: in custom URLs.
    if (typeof resolved.link === "string") {
      resolved.link = sanitizeHref(resolved.link);
    }

    // Recursively resolve children
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      resolved.items = resolveMenuItemLinks(
        item.items,
        pagesByUuid,
        outputPathPrefix,
        collectionItemsByUuid,
        depth + 1,
      );
    }

    return resolved;
  });
}

/**
 * Resolve links in a menu object (wraps resolveMenuItemLinks over `.items`).
 * @param {object} menuData - Menu data with items array
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {object} Menu data with resolved links
 */
export function resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix = "", collectionItemsByUuid = new Map()) {
  if (!menuData || !menuData.items) {
    return menuData;
  }

  return {
    ...menuData,
    items: resolveMenuItemLinks(menuData.items, pagesByUuid, outputPathPrefix, collectionItemsByUuid),
  };
}

/** True when a schema declares at least one `menu`-type setting. */
export function schemaHasMenuSetting(schema) {
  return Array.isArray(schema?.settings) && schema.settings.some((s) => s.type === "menu");
}

/**
 * Resolve every `menu`-type setting in a settings object into a full menu object
 * (`{ ...menu, items: [resolved] }`) the menu snippet can render — replacing the
 * stored menu UUID/slug in place. The single source of truth for both widget and
 * collection-item menu resolution. A missing/empty value, an unknown menu, or a
 * thrown error all yield `{ items: [] }` (logged), matching the prior widget
 * behavior. No-op when the schema declares no menu settings or `menuMaps` is absent.
 *
 * @param {object} settings - settings object (mutated in place)
 * @param {Array} schemaSettings - schema setting definitions for `settings`
 * @param {object} deps - { menuMaps, pagesByUuid, collectionItemsByUuid, outputPathPrefix }
 * @returns {object} the same `settings` object
 */
export function resolveMenuSettings(
  settings,
  schemaSettings,
  { menuMaps, pagesByUuid, collectionItemsByUuid = new Map(), outputPathPrefix = "" } = {},
) {
  if (!settings || !Array.isArray(schemaSettings) || !menuMaps) return settings;

  for (const setting of schemaSettings) {
    if (setting.type !== "menu") continue;
    const key = setting.id;
    try {
      const value = settings[key];
      if (value) {
        const menuData = menuMaps.byUuid.get(value) || menuMaps.bySlug.get(value);
        settings[key] = resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix, collectionItemsByUuid) || {
          items: [],
        };
      } else {
        settings[key] = { items: [] };
      }
    } catch (err) {
      console.error(`Error loading menu data for setting ${key}:`, err);
      settings[key] = { items: [] };
    }
  }

  return settings;
}
