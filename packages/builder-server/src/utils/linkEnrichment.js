import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectPagesDir, getProjectMenusDir, getProjectDir } from "../config.js";
import { syncCollectionItemMediaUsageOnWrite } from "../services/mediaUsageService.js";
import { cleanupRichtextLinkRefs, remapRichtextLinkRefs, enrichRichtextLinkRefs } from "@widgetizer/core/richtextLinks";
import { pagesDir, pageKey, globalKey, menusDir, menuKey, itemsDir, itemKey } from "@widgetizer/core/contentAddress";
import { languageFoldersIn } from "./contentLanguage.js";
import { LANGUAGE_CODE_RE } from "@widgetizer/core/languages";

/** The per-tenant collections root, a sibling of pages/ under the project dir. */
function collectionsDirFor(projectFolderName) {
  return path.join(getProjectDir(projectFolderName), "collections");
}

/** A content directory and every language folder inside it, for the raw-fs walkers. */
async function withLanguageDirs(dir) {
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const languageDirs = entries.filter((entry) => entry.isDirectory() && LANGUAGE_CODE_RE.test(entry.name));
  return [dir, ...languageDirs.map((entry) => path.join(dir, entry.name))];
}

// ---------------------------------------------------------------------------
// Shared building blocks (internal)
// ---------------------------------------------------------------------------

function isLinkObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "href" in value;
}

/**
 * Clone a widget and apply valueTransformer to every setting value
 * (top-level settings and block-level settings).
 */
function transformWidgetSettings(widgetData, valueTransformer) {
  const result = { ...widgetData };

  if (result.settings) {
    result.settings = { ...result.settings };
    for (const [key, value] of Object.entries(result.settings)) {
      result.settings[key] = valueTransformer(value);
    }
  }

  if (result.blocks) {
    result.blocks = { ...result.blocks };
    for (const [blockId, block] of Object.entries(result.blocks)) {
      if (block && block.settings) {
        result.blocks[blockId] = {
          ...block,
          settings: { ...block.settings },
        };
        for (const [key, value] of Object.entries(block.settings)) {
          result.blocks[blockId].settings[key] = valueTransformer(value);
        }
      }
    }
  }

  return result;
}

/**
 * Iterate page JSON files, apply widgetProcessor to each widget,
 * write back pages that were modified. Skips header/footer types.
 */
async function updatePageWidgets(pagesDir, widgetProcessor) {
  for (const dir of await withLanguageDirs(pagesDir)) {
    const pageFiles = await fs.readdir(dir);
    for (const pageFile of pageFiles) {
      if (!pageFile.endsWith(".json")) continue;

      const pagePath = path.join(dir, pageFile);
      const content = await fs.readFile(pagePath, "utf8");
      const page = JSON.parse(content);

      if (page.type === "header" || page.type === "footer") continue;

      let modified = false;
      const processedWidgets = {};

      for (const [widgetId, widget] of Object.entries(page.widgets || {})) {
        const processed = widgetProcessor(widget);
        processedWidgets[widgetId] = processed;
        if (JSON.stringify(processed) !== JSON.stringify(widget)) {
          modified = true;
        }
      }

      if (modified) {
        page.widgets = processedWidgets;
        await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
      }
    }
  }
}

/**
 * Apply widgetProcessor to global widgets (header.json, footer.json), in the
 * root and in every language folder.
 */
async function updateGlobalWidgets(pagesDir, widgetProcessor) {
  for (const dir of await withLanguageDirs(pagesDir)) {
    const globalDir = path.join(dir, "global");
    if (!(await fs.pathExists(globalDir))) continue;

    for (const widgetType of ["header", "footer"]) {
      const widgetPath = path.join(globalDir, `${widgetType}.json`);
      if (!(await fs.pathExists(widgetPath))) continue;

      const content = await fs.readFile(widgetPath, "utf8");
      const widget = JSON.parse(content);
      const processed = widgetProcessor(widget);

      if (JSON.stringify(processed) !== JSON.stringify(widget)) {
        await fs.outputFile(widgetPath, JSON.stringify(processed, null, 2));
      }
    }
  }
}

/**
 * Recursively process menu items, applying itemTransformer to each item.
 */
function processMenuItems(items, itemTransformer) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    const processed = itemTransformer({ ...item });
    if (processed.items && Array.isArray(processed.items)) {
      processed.items = processMenuItems(processed.items, itemTransformer);
    }
    return processed;
  });
}

/**
 * Apply a value transformer to every top-level setting value of a collection
 * item. Returns a clone plus whether anything changed. v1 item settings are
 * flat (no repeaters), so a single pass suffices.
 */
function transformItemSettings(item, valueTransformer) {
  if (!item?.settings || typeof item.settings !== "object") return { item, changed: false };
  const settings = {};
  let changed = false;
  for (const [key, value] of Object.entries(item.settings)) {
    const next = valueTransformer(value);
    settings[key] = next;
    if (next !== value) changed = true;
  }
  return { item: { ...item, settings }, changed };
}

/**
 * Walk every collection item file under collections/<type>/<slug>.json, run it
 * through `itemTransformer(item, type, slug) => { item, changed }`, and write
 * back those that changed. Returns the touched items. fs-based like the rest of
 * this OSS-internal enrichment module; the collection type/slug come from
 * directory entries under the per-tenant project root (never request input).
 */
async function updateCollectionItems(collectionsDir, itemTransformer) {
  if (!(await fs.pathExists(collectionsDir))) return [];

  const touched = [];
  const typeEntries = await fs.readdir(collectionsDir, { withFileTypes: true });
  for (const typeEntry of typeEntries) {
    if (!typeEntry.isDirectory()) continue;
    const type = typeEntry.name;
    const typeDir = path.join(collectionsDir, type);
    const files = [];
    try {
      for (const dir of await withLanguageDirs(typeDir)) {
        files.push(...(await fs.readdir(dir)).map((name) => ({ dir, name })));
      }
    } catch {
      continue;
    }
    for (const { dir, name } of files) {
      if (!name.endsWith(".json") || name === "_order.json") continue;
      const slug = name.replace(/\.json$/, "");
      const itemPath = path.join(dir, name);
      try {
        const item = JSON.parse(await fs.readFile(itemPath, "utf8"));
        const { item: nextItem, changed } = itemTransformer(item, type, slug);
        if (changed) {
          await fs.outputFile(itemPath, JSON.stringify(nextItem, null, 2));
          touched.push({ type, slug, item: nextItem });
        }
      } catch (error) {
        console.warn(`[linkEnrichment] Failed to process collection item ${type}/${name}: ${error.message}`);
      }
    }
  }
  return touched;
}

// --- Storage-adapter walkers -----------------------------------------------
// The delete-time scrubbers below run against live projects after arbitrary
// user edits, so their writes must be adapter-visible: an embedding shell can
// only observe content mutations that go through storage.write. The
// create/duplicate/import-time enrichment helpers above keep the raw-fs
// walkers — they run before a project is editable/publishable.

// The walkers below take the language from the folder a file sits in, so they
// need the project's default to key a folder correctly whatever it is called.

/** Every page key across the root and each language folder present. */
async function listAllPageKeys(storage, scope, defaultLanguage) {
  const keys = [];
  for (const language of ["", ...(await languageFoldersIn(storage, scope, "pages"))]) {
    const lang = { language, defaultLanguage };
    const names = (await storage.list(scope, pagesDir(lang))).filter((name) => name.endsWith(".json"));
    keys.push(...names.map((name) => pageKey(name.replace(/\.json$/, ""), lang)));
  }
  return keys;
}

/**
 * One pass over every page: clear references inside widgets, and drop a
 * `parentPageUuid` naming any of the deleted pages.
 *
 * Both in the same walk, and the parent check takes the whole SET. Scanning once
 * per deleted uuid meant ten deleted pages read every surviving page eleven times.
 *
 * A file that cannot be read or written is recorded in `failed` and the walk
 * continues: one unwritable page must not stop the menus and items after it from
 * being cleaned, and the caller needs to know what was left behind.
 */
async function updatePagesViaStorage(storage, scope, widgetProcessor, deletedPageUuids, defaultLanguage, failed) {
  for (const key of await listAllPageKeys(storage, scope, defaultLanguage)) {
    try {
      const buf = await storage.read(scope, key);
      if (buf == null) continue;
      const page = JSON.parse(buf.toString("utf8"));
      if (page.type === "header" || page.type === "footer") continue;

      let modified = false;
      const processedWidgets = {};
      for (const [widgetId, widget] of Object.entries(page.widgets || {})) {
        const processed = widgetProcessor(widget);
        processedWidgets[widgetId] = processed;
        if (JSON.stringify(processed) !== JSON.stringify(widget)) modified = true;
      }

      // A child left pointing at a deleted parent still renders (the breadcrumb
      // builder falls back), but the page picker would show a dangling selection.
      if (page.parentPageUuid && deletedPageUuids.has(page.parentPageUuid)) {
        delete page.parentPageUuid;
        modified = true;
      }

      if (modified) {
        page.widgets = processedWidgets;
        await storage.write(scope, key, JSON.stringify(page, null, 2));
      }
    } catch (error) {
      failed.push({ key, reason: error.message });
    }
  }
}

async function updateGlobalWidgetsViaStorage(storage, scope, widgetProcessor, defaultLanguage, failed) {
  for (const language of ["", ...(await languageFoldersIn(storage, scope, "pages"))]) {
    for (const widgetType of ["header", "footer"]) {
      const key = globalKey(widgetType, { language, defaultLanguage });
      try {
        const buf = await storage.read(scope, key);
        if (buf == null) continue;
        const widget = JSON.parse(buf.toString("utf8"));
        const processed = widgetProcessor(widget);
        if (JSON.stringify(processed) !== JSON.stringify(widget)) {
          await storage.write(scope, key, JSON.stringify(processed, null, 2));
        }
      } catch (error) {
        if (failed) failed.push({ key, reason: error.message });
      }
    }
  }
}

async function updateCollectionItemsViaStorage(storage, scope, itemTransformer, defaultLanguage, failed) {
  const touched = [];
  // storage.list returns flat entry names with no file/dir discrimination;
  // collection type directories are the extensionless entries. Listing a
  // non-directory that slips through is tolerated the same way the fs walker
  // tolerates an unreadable type dir: skip it.
  let typeEntries = [];
  try {
    typeEntries = (await storage.list(scope, "collections")).filter((name) => !name.includes("."));
  } catch (error) {
    // Nothing under collections/ could be listed, so nothing in it was cleaned.
    // Silently skipping made an unreadable collection indistinguishable from a
    // project that has none.
    if (failed) failed.push({ key: "collections", reason: error.message });
    return touched;
  }
  for (const type of typeEntries) {
    const files = [];
    try {
      for (const language of ["", ...(await languageFoldersIn(storage, scope, itemsDir(type)))]) {
        const lang = { language, defaultLanguage };
        const names = (await storage.list(scope, itemsDir(type, lang))).filter(
          (name) => name.endsWith(".json") && name !== "_order.json",
        );
        files.push(...names.map((name) => ({ name, lang })));
      }
    } catch (error) {
      // A collection whose folder cannot be listed keeps every reference it holds.
      // Reported, not skipped: the caller is about to tell someone the sweep is done.
      if (failed) failed.push({ key: itemsDir(type), reason: error.message });
      continue;
    }
    for (const { name, lang } of files) {
      const slug = name.replace(/\.json$/, "");
      const key = itemKey(type, slug, lang);
      try {
        const buf = await storage.read(scope, key);
        if (buf == null) continue;
        const item = JSON.parse(buf.toString("utf8"));
        const { item: nextItem, changed } = itemTransformer(item, type, slug);
        if (changed) {
          await storage.write(scope, key, JSON.stringify(nextItem, null, 2));
          touched.push({ type, slug, item: nextItem, lang });
        }
      } catch (error) {
        console.warn(`[linkEnrichment] Failed to process collection item ${type}/${name}: ${error.message}`);
        if (failed) failed.push({ key, reason: error.message });
      }
    }
  }
  return touched;
}

async function cleanupMenusViaStorage(storage, scope, itemTransformer, defaultLanguage, failed) {
  const keys = [];
  for (const language of ["", ...(await languageFoldersIn(storage, scope, "menus"))]) {
    const lang = { language, defaultLanguage };
    const names = (await storage.list(scope, menusDir(lang))).filter((name) => name.endsWith(".json"));
    keys.push(...names.map((name) => menuKey(name.replace(/\.json$/, ""), lang)));
  }
  for (const key of keys) {
    try {
      const buf = await storage.read(scope, key);
      if (buf == null) continue;
      const menu = JSON.parse(buf.toString("utf8"));
      const cleanedItems = processMenuItems(menu.items, itemTransformer);
      if (JSON.stringify(cleanedItems) !== JSON.stringify(menu.items)) {
        menu.items = cleanedItems;
        await storage.write(scope, key, JSON.stringify(menu, null, 2));
      }
    } catch (error) {
      if (failed) failed.push({ key, reason: error.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------


/**
 * Apply per-type handlers to every reference-bearing theme setting in a project's
 * own theme.json.
 *
 * Dispatch by the DECLARED type, never by the shape of the value. These handlers
 * recognise a menu selection by its bare string, so a single generic transformer
 * applied to everything rewrote prose: a text setting reading "main-menu" became
 * that menu's uuid, and then — once text was excluded but richtext was not — a
 * richtext default merely CONTAINING those words was replaced wholesale by it.
 * A menu setting gets menu handling, a link setting gets link handling, and
 * richtext gets HTML-anchor handling. Nothing else is touched.
 *
 * Theme settings are `settings.global.<group>` — an array of `{ type, id, default,
 * value? }`. The project's copy is its own file, so BOTH the chosen `value` and the
 * `default` it started from are transformed: after a duplication, a default still
 * holding the source project's page uuid would be a reference into another project,
 * which is exactly what the rest of that pass exists to prevent.
 *
 * @param {object} themeData parsed theme.json, mutated in place
 * @param {{ link?: Function, menu?: Function, richtext?: Function }} handlers
 * @returns {boolean} whether anything changed
 */
function transformThemeSettings(themeData, handlers) {
  const groups = themeData?.settings?.global;
  if (!groups || typeof groups !== "object") return false;

  let changed = false;
  for (const items of Object.values(groups)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const handler = handlers?.[item.type];
      if (typeof handler !== "function") continue;
      for (const key of ["value", "default"]) {
        if (item[key] === undefined) continue;
        const next = handler(item[key]);
        if (JSON.stringify(next) !== JSON.stringify(item[key])) {
          item[key] = next;
          changed = true;
        }
      }
    }
  }
  return changed;
}

/** fs variant, for the seeding and duplication passes. */
async function updateThemeSettingsFile(themeJsonPath, handlers) {
  if (!(await fs.pathExists(themeJsonPath))) return;
  try {
    const themeData = JSON.parse(await fs.readFile(themeJsonPath, "utf8"));
    if (transformThemeSettings(themeData, handlers)) {
      await fs.outputFile(themeJsonPath, JSON.stringify(themeData, null, 2));
    }
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to process theme settings at ${themeJsonPath}: ${error.message}`);
  }
}

/** Adapter variant, for the deletion sweep. Records its own failure like the rest. */
async function updateThemeSettingsViaStorage(storage, scope, handlers, failed) {
  const key = "theme.json";
  try {
    const buf = await storage.read(scope, key);
    if (buf == null) return;
    const themeData = JSON.parse(buf.toString("utf8"));
    if (transformThemeSettings(themeData, handlers)) {
      await storage.write(scope, key, JSON.stringify(themeData, null, 2));
    }
  } catch (error) {
    if (failed) failed.push({ key, reason: error.message });
  }
}

/**
 * Enrich a newly created project's references.
 * - Adds pageUuid to menu items based on slug-to-UUID mapping
 * - Adds metadata (id, uuid, timestamps) to menus copied from themes
 * - Replaces menu slug references in widget settings with menu UUIDs
 * - Adds pageUuid to widget link settings based on slug-to-UUID mapping
 */
export async function enrichNewProjectReferences(pagesDir, menusDir) {
  // Step 1: Build page slug → UUID map
  const pageSlugToUuid = new Map();
  try {
    const pageFiles = await fs.readdir(pagesDir);
    for (const pageFile of pageFiles) {
      if (!pageFile.endsWith(".json")) continue;
      try {
        const content = await fs.readFile(path.join(pagesDir, pageFile), "utf8");
        const page = JSON.parse(content);
        if (page.slug && page.uuid) {
          pageSlugToUuid.set(page.slug, page.uuid);
        }
      } catch {
        // Skip pages that can't be read
      }
    }
  } catch {
    // Pages directory doesn't exist or can't be read
  }

  // Step 2: Enrich menus (add pageUuid to items + add metadata)
  try {
    if (await fs.pathExists(menusDir)) {
      const menuFiles = await fs.readdir(menusDir);
      for (const menuFile of menuFiles) {
        if (!menuFile.endsWith(".json")) continue;

        const menuPath = path.join(menusDir, menuFile);
        try {
          const content = await fs.readFile(menuPath, "utf8");
          const menu = JSON.parse(content);
          const menuSlug = path.parse(menuFile).name;

          const enrichedItems = processMenuItems(menu.items, (item) => {
            if (item.link && typeof item.link === "string") {
              const link = item.link;
              if (link.endsWith(".html") && !link.includes("://") && !link.startsWith("#")) {
                const slug = link.replace(".html", "");
                const uuid = pageSlugToUuid.get(slug);
                if (uuid) item.pageUuid = uuid;
              }
            }
            return item;
          });

          const enrichedMenu = {
            ...menu,
            id: menuSlug,
            uuid: menu.uuid || randomUUID(),
            items: enrichedItems,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };

          await fs.outputFile(menuPath, JSON.stringify(enrichedMenu, null, 2));
        } catch (error) {
          console.warn(`[linkEnrichment] Failed to enrich menu ${menuFile}, skipping. Reason: ${error.message}`);
        }
      }
    }
  } catch (menuAccessError) {
    if (menuAccessError.code !== "ENOENT") {
      console.warn(`[linkEnrichment] Failed to access project menus directory: ${menuAccessError.message}`);
    }
  }

  // Step 3: Build menu slug → UUID map from enriched menus
  const menuSlugToUuid = new Map();
  try {
    if (await fs.pathExists(menusDir)) {
      const menuFiles = await fs.readdir(menusDir);
      for (const menuFile of menuFiles) {
        if (!menuFile.endsWith(".json")) continue;
        try {
          const content = await fs.readFile(path.join(menusDir, menuFile), "utf8");
          const menu = JSON.parse(content);
          if (menu.uuid) {
            menuSlugToUuid.set(path.parse(menuFile).name, menu.uuid);
          }
        } catch {
          // Skip unreadable menu files
        }
      }
    }
  } catch {
    // Continue without menu enrichment
  }

  // Step 4: Enrich page and global widgets (links + menu references)
  const enrichValue = (value) => {
    if (isLinkObject(value)) {
      if (value.pageUuid) return value;
      const { href } = value;
      if (!href || !href.endsWith(".html") || href.includes("://") || href.startsWith("#")) return value;
      const slug = href.replace(".html", "");
      const uuid = pageSlugToUuid.get(slug);
      return uuid ? { ...value, pageUuid: uuid } : value;
    }
    if (typeof value === "string" && menuSlugToUuid.has(value)) {
      return menuSlugToUuid.get(value);
    }
    // Richtext page-links: stamp data-page-uuid from the anchor's slug href. (Item-links
    // in richtext are stamped post-seed, once collection items exist — see seedPresetCollections.)
    if (typeof value === "string") {
      return enrichRichtextLinkRefs(value, { pageSlugToUuid });
    }
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, enrichValue);

  try {
    await updatePageWidgets(pagesDir, widgetProcessor);
    await updateGlobalWidgets(pagesDir, widgetProcessor);
    // A theme may ship a site-wide link or menu selection in its defaults; give it
    // the same stable references the widget settings just got.
    await updateThemeSettingsFile(path.join(pagesDir, "..", "theme.json"), {
      link: (value) => (isLinkObject(value) ? enrichValue(value) : value),
      menu: (value) => (typeof value === "string" && menuSlugToUuid.has(value) ? menuSlugToUuid.get(value) : value),
      richtext: (value) =>
        typeof value === "string" ? enrichRichtextLinkRefs(value, { pageSlugToUuid }) : value,
    });
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich widget links: ${error.message}`);
  }

  // Step 5: Enrich seeded collection items (slug-format links -> pageUuid).
  // Media usage is rebuilt by the project-creation structural refresh. The
  // collections dir is a sibling of pages/ under the project root.
  try {
    const collectionsDir = path.join(pagesDir, "..", "collections");
    await updateCollectionItems(collectionsDir, (item) => transformItemSettings(item, enrichValue));
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich collection item links: ${error.message}`);
  }
}

/**
 * Remap UUIDs in a duplicated project.
 * Regenerates page and menu UUIDs, then remaps all pageUuid and
 * menu UUID references in widgets and menu items to use the new values.
 */
export async function remapDuplicatedProjectUuids(projectFolderName) {
  const pagesDir = getProjectPagesDir(projectFolderName);
  const menusDir = getProjectMenusDir(projectFolderName);

  const oldToNewUuid = new Map();
  const oldToNewMenuUuid = new Map();
  const oldToNewItemUuid = new Map();

  // Step 1: Regenerate collection item UUIDs first, building the source-to-copy map
  // so the menu/link passes below can remap stable collection-item references.
  // Every item gets a fresh identity in the duplicated project (always rewritten).
  await updateCollectionItems(collectionsDirFor(projectFolderName), (item) => {
    const newUuid = randomUUID();
    if (item.uuid) oldToNewItemUuid.set(item.uuid, newUuid);
    return { item: { ...item, uuid: newUuid }, changed: true };
  });

  // Step 2: Regenerate page UUIDs and build mapping, in the root and every language folder
  const pagePaths = [];
  for (const dir of await withLanguageDirs(pagesDir)) {
    for (const pageFile of await fs.readdir(dir)) {
      if (pageFile.endsWith(".json")) pagePaths.push(path.join(dir, pageFile));
    }
  }
  for (const pagePath of pagePaths) {
    const content = await fs.readFile(pagePath, "utf8");
    const page = JSON.parse(content);

    if (page.type === "header" || page.type === "footer") continue;

    const oldUuid = page.uuid;
    const newUuid = randomUUID();
    oldToNewUuid.set(oldUuid, newUuid);

    page.uuid = newUuid;
    await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
  }

  // Step 2: Regenerate menu UUIDs and update menu item pageUuids
  const menuPaths = [];
  for (const dir of await withLanguageDirs(menusDir)) {
    for (const menuFile of await fs.readdir(dir)) {
      if (menuFile.endsWith(".json")) menuPaths.push(path.join(dir, menuFile));
    }
  }
  {
    for (const menuPath of menuPaths) {
      const content = await fs.readFile(menuPath, "utf8");
      const menu = JSON.parse(content);

      if (menu.uuid) {
        const newMenuUuid = randomUUID();
        oldToNewMenuUuid.set(menu.uuid, newMenuUuid);
        menu.uuid = newMenuUuid;
      } else {
        menu.uuid = randomUUID();
      }

      menu.items = processMenuItems(menu.items, (item) => {
        if (item.pageUuid) {
          const newUuid = oldToNewUuid.get(item.pageUuid);
          if (newUuid) item.pageUuid = newUuid;
        }
        // Stable collection-item references (#11) follow the regenerated uuids.
        if (item.collectionItemUuid) {
          const newItemUuid = oldToNewItemUuid.get(item.collectionItemUuid);
          if (newItemUuid) item.collectionItemUuid = newItemUuid;
        }
        return item;
      });

      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }
  }

  // Step 3b: Point each page's parent and translation group at the duplicate's
  // new uuids. A separate pass because Step 1 rewrites pages one at a time,
  // before the uuid map is complete — a sibling later in the walk would not yet
  // be in it.
  for (const pagePath of pagePaths) {
    const page = JSON.parse(await fs.readFile(pagePath, "utf8"));
    if (page.type === "header" || page.type === "footer") continue;
    if (!page.parentPageUuid && !page.translationGroupId) continue;
    if (page.parentPageUuid) {
      const newParentUuid = oldToNewUuid.get(page.parentPageUuid);
      // An unknown parent belonged to another project; drop it rather than leave
      // the duplicate pointing into the original.
      if (newParentUuid) page.parentPageUuid = newParentUuid;
      else delete page.parentPageUuid;
    }
    // A group is named by a member's uuid, but survives that member's deletion:
    // an unknown name is kept as is, so the survivors stay together.
    if (page.translationGroupId) {
      page.translationGroupId = oldToNewUuid.get(page.translationGroupId) ?? page.translationGroupId;
    }
    await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
  }

  // Step 4: Remap widget references in pages and global widgets
  const remapValue = (value) => {
    if (isLinkObject(value)) {
      if (value.pageUuid) {
        const newUuid = oldToNewUuid.get(value.pageUuid);
        return newUuid ? { ...value, pageUuid: newUuid } : value;
      }
      if (value.collectionItemUuid) {
        const newItemUuid = oldToNewItemUuid.get(value.collectionItemUuid);
        return newItemUuid ? { ...value, collectionItemUuid: newItemUuid } : value;
      }
    }
    if (typeof value === "string" && oldToNewMenuUuid.has(value)) {
      return oldToNewMenuUuid.get(value);
    }
    // Richtext anchors: remap stable-ref uuid attrs to the duplicated project's new uuids.
    if (typeof value === "string") {
      return remapRichtextLinkRefs(value, { pageMap: oldToNewUuid, itemMap: oldToNewItemUuid });
    }
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, remapValue);

  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
  // Theme settings too: a duplicate whose site-wide link still names the source
  // project's page uuid is a reference into another project.
  await updateThemeSettingsFile(path.join(pagesDir, "..", "theme.json"), {
    link: (value) => (isLinkObject(value) ? remapValue(value) : value),
    menu: (value) => (typeof value === "string" && oldToNewMenuUuid.has(value) ? oldToNewMenuUuid.get(value) : value),
    richtext: (value) =>
      typeof value === "string"
        ? remapRichtextLinkRefs(value, { pageMap: oldToNewUuid, itemMap: oldToNewItemUuid })
        : value,
  });

  // Step 5: Remap link references inside collection item settings (item uuids
  // were already regenerated in Step 1; this only fixes pageUuid/menu/item refs)
  // and point each item's translation group at the regenerated uuids.
  await updateCollectionItems(collectionsDirFor(projectFolderName), (item) => {
    const result = transformItemSettings(item, remapValue);
    if (!item.translationGroupId) return result;
    const translationGroupId = oldToNewItemUuid.get(item.translationGroupId) ?? item.translationGroupId;
    if (translationGroupId === item.translationGroupId) return result;
    return { item: { ...result.item, translationGroupId }, changed: true };
  });
}

/**
 * Clear every reference to content that has been CONFIRMED deleted — pages,
 * collection items and menus — across all surviving content in every language,
 * the default one included.
 *
 * One walk for all three kinds. Cleanup after a language removal would otherwise
 * be one full walk of the project per deleted page and item, which for a language
 * of any size is the whole project read and rewritten dozens of times.
 *
 * ## What is cleared, and what is left alone
 *
 * Only EXPLICIT references to Widgetizer-managed content are touched:
 * `pageUuid` / `collectionItemUuid` on link settings and menu items, the matching
 * `data-…-uuid` attributes in richtext, `parentPageUuid`, and a `menu` setting
 * holding a deleted menu's uuid. A hand-typed URL is not a reference to managed
 * content and is never rewritten, even when it happens to point at a page that
 * was just deleted — the author wrote it and it is theirs to fix.
 *
 * The destination goes; the surrounding content stays. A link keeps its text and
 * target and loses only its href and ref, a menu item keeps its label, and
 * richtext keeps the words and loses only the anchor around them. Nothing is
 * substituted: no nearest page, no other menu, no guessing.
 *
 * ## Confirmed, not assumed
 *
 * Callers pass only what they know is gone. A partial language removal clears
 * references to the content it did delete and leaves the rest alone, because the
 * targets that survived are still there and the ones it could not read may be —
 * and the removal is retryable, so guessing would destroy live references.
 *
 * Takes no lock: it writes content, so callers run it inside the content-write
 * section they already hold (see services/contentCoordination).
 *
 * Never throws for one unwritable file. A single page that cannot be written must
 * not stop the menus and items behind it from being cleaned, and the caller must
 * not be told the whole sweep succeeded — so the files it could not clean come back
 * in `incomplete` for the caller to report.
 *
 * @param {object} storage
 * @param {object} scope
 * @param {{ pageUuids?: Iterable<string>, itemUuids?: Iterable<string>,
 *           menuUuids?: Iterable<string>, defaultLanguage?: string }} targets
 * @returns {Promise<{ incomplete: Array<{ key: string, reason: string }> }>}
 */
export async function clearDeletedReferencesInSection(storage, scope, { pageUuids, itemUuids, menuUuids, defaultLanguage }) {
  const pages = new Set(pageUuids || []);
  const items = new Set(itemUuids || []);
  const menus = new Set(menuUuids || []);
  if (pages.size === 0 && items.size === 0 && menus.size === 0) return { incomplete: [] };

  const failed = [];

  const cleanValue = (value) => {
    if (isLinkObject(value)) {
      const hitsPage = value.pageUuid && pages.has(value.pageUuid);
      const hitsItem = value.collectionItemUuid && items.has(value.collectionItemUuid);
      if (!hitsPage && !hitsItem) return value;
      // Keep what the author wrote — the label and where it opens. Only the
      // destination and the now-dead reference go.
      const { pageUuid, collectionItemUuid, collectionType, ...rest } = value;
      void pageUuid;
      void collectionItemUuid;
      void collectionType;
      return { ...rest, href: "" };
    }
    if (typeof value === "string") {
      // A menu setting stores the menu's uuid as a bare string. Matched by exact
      // equality against a deleted uuid rather than by consulting each widget's
      // schema: a uuid is unique enough that nothing else can hold that exact
      // value, and reading every schema here would cost a second walk.
      if (menus.size && menus.has(value)) return "";
      return cleanupRichtextLinkRefs(value, { pageUuids: pages, itemUuids: items });
    }
    return value;
  };
  const widgetProcessor = (widget) => transformWidgetSettings(widget, cleanValue);

  // Widgets and parent refs in one pass over the pages, with the whole deleted set.
  await updatePagesViaStorage(storage, scope, widgetProcessor, pages, defaultLanguage, failed);
  await updateGlobalWidgetsViaStorage(storage, scope, widgetProcessor, defaultLanguage, failed);

  await cleanupMenusViaStorage(
    storage,
    scope,
    (item) => {
      // The label is the author's; only the destination is ours to clear.
      if (item.pageUuid && pages.has(item.pageUuid)) {
        item.link = "";
        delete item.pageUuid;
      }
      if (item.collectionItemUuid && items.has(item.collectionItemUuid)) {
        item.link = "";
        delete item.collectionItemUuid;
        delete item.collectionType;
      }
      return item;
    },
    defaultLanguage,
    failed,
  );

  // Theme settings carry the same link and menu references widget settings do.
  await updateThemeSettingsViaStorage(
    storage,
    scope,
    {
      link: (value) => (isLinkObject(value) ? cleanValue(value) : value),
      menu: (value) => (typeof value === "string" && menus.has(value) ? "" : value),
      richtext: (value) =>
        typeof value === "string" ? cleanupRichtextLinkRefs(value, { pageUuids: pages, itemUuids: items }) : value,
    },
    failed,
  );

  const touched = await updateCollectionItemsViaStorage(
    storage,
    scope,
    (item) => transformItemSettings(item, cleanValue),
    defaultLanguage,
    failed,
  );
  if (scope.projectId) {
    for (const { type, slug, item, lang } of touched) {
      try {
        await syncCollectionItemMediaUsageOnWrite(scope.projectId, item, type, lang);
      } catch (error) {
        console.warn(`[linkEnrichment] Failed to sync media usage for ${type}/${slug}: ${error.message}`);
      }
    }
  }

  return { incomplete: failed };
}

/**
 * The response shape for "the delete worked, the tidy-up after it did not".
 * Carries a count for the UI to phrase and the paths for a log — the message a
 * person reads must never contain a storage key.
 */
export function referenceCleanupWarnings(incomplete) {
  if (!incomplete?.length) return undefined;
  return [
    {
      code: "REFERENCE_CLEANUP_INCOMPLETE",
      count: incomplete.length,
      paths: incomplete.map((entry) => entry.key),
    },
  ];
}

/** One deleted page. Thin wrapper over the batch walk. */
export async function cleanupDeletedPageReferences(storage, scope, { deletedPageUuid, defaultLanguage }) {
  return clearDeletedReferencesInSection(storage, scope, { pageUuids: [deletedPageUuid], defaultLanguage });
}

/** One or more deleted collection items. Accepts a Set, an array, or a single uuid. */
export async function cleanupDeletedCollectionItemReferences(storage, scope, { deletedItemUuids, defaultLanguage }) {
  const uuids =
    deletedItemUuids instanceof Set
      ? deletedItemUuids
      : new Set(Array.isArray(deletedItemUuids) ? deletedItemUuids : [deletedItemUuids]);
  return clearDeletedReferencesInSection(storage, scope, { itemUuids: uuids, defaultLanguage });
}

/** One deleted menu: every widget or collection item that selected it loses the selection. */
export async function cleanupDeletedMenuReferences(storage, scope, { deletedMenuUuid, defaultLanguage }) {
  if (!deletedMenuUuid) return;
  return clearDeletedReferencesInSection(storage, scope, { menuUuids: [deletedMenuUuid], defaultLanguage });
}

/**
 * Remap menu items' `collectionItemUuid` references from preset-source uuids to
 * the freshly seeded uuids (#11). Used by preset seeding: a preset's menus may
 * ship stable collection-item refs against the preset's own item uuids, which are
 * regenerated on seed, so the refs must follow.
 * @param {string} projectFolderName - The project folder name
 * @param {Map<string,string>} oldToNewItemUuid - source uuid -> seeded uuid
 */
export async function remapCollectionItemMenuRefs(projectFolderName, oldToNewItemUuid) {
  if (!oldToNewItemUuid || oldToNewItemUuid.size === 0) return;
  const menusDir = getProjectMenusDir(projectFolderName);
  if (!(await fs.pathExists(menusDir))) return;

  const menuFiles = await fs.readdir(menusDir);
  for (const menuFile of menuFiles) {
    if (!menuFile.endsWith(".json")) continue;

    const menuPath = path.join(menusDir, menuFile);
    const menu = JSON.parse(await fs.readFile(menuPath, "utf8"));

    const remapped = processMenuItems(menu.items, (item) => {
      if (item.collectionItemUuid) {
        const next = oldToNewItemUuid.get(item.collectionItemUuid);
        if (next) item.collectionItemUuid = next;
      }
      return item;
    });

    if (JSON.stringify(remapped) !== JSON.stringify(menu.items)) {
      menu.items = remapped;
      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }
  }
}

/**
 * Remap widget/block + collection-item `link` settings' `collectionItemUuid`
 * references from preset-source uuids to the freshly seeded uuids (#11). The
 * `link`-setting twin of remapCollectionItemMenuRefs, used by preset seeding.
 * @param {string} projectFolderName - The project folder name
 * @param {Map<string,string>} oldToNewItemUuid - source uuid -> seeded uuid
 */
export async function remapCollectionItemLinkRefs(projectFolderName, oldToNewItemUuid) {
  if (!oldToNewItemUuid || oldToNewItemUuid.size === 0) return;
  const pagesDir = getProjectPagesDir(projectFolderName);

  const remapValue = (value) => {
    if (isLinkObject(value) && value.collectionItemUuid) {
      const next = oldToNewItemUuid.get(value.collectionItemUuid);
      if (next) return { ...value, collectionItemUuid: next };
    }
    // Richtext anchors: remap item refs to the seeded uuids (no-op for uuid-free presets).
    if (typeof value === "string") {
      return remapRichtextLinkRefs(value, { itemMap: oldToNewItemUuid });
    }
    return value;
  };
  const widgetProcessor = (widget) => transformWidgetSettings(widget, remapValue);
  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
  // Items get fresh identities on seed, so a site-wide link to one has to follow
  // them exactly as a widget link does. Missing this left a theme setting pointing
  // at the preset's original article.
  await updateThemeSettingsFile(path.join(pagesDir, "..", "theme.json"), {
    link: (value) => (isLinkObject(value) ? remapValue(value) : value),
    richtext: (value) =>
      typeof value === "string" ? remapRichtextLinkRefs(value, { itemMap: oldToNewItemUuid }) : value,
  });
  await updateCollectionItems(collectionsDirFor(projectFolderName), (item) => transformItemSettings(item, remapValue));
}

/**
 * Post-seed enrichment for richtext stable links: once pages exist (scaffold)
 * and collection items have been seeded with fresh uuids, walk all richtext (pages, globals,
 * collection items) and stamp `data-page-uuid` / `data-collection-item-uuid` on internal anchors,
 * derived from each anchor's slug-format href. Presets ship richtext with the uuid attrs stripped
 * (sync-preset-templates) and the seed uuids only exist now, so this href→uuid pass is the only
 * place collection-item richtext links (and item-links in page richtext) get their refs.
 *
 * Dir-explicit core: reads pages/, collections/, and collection-types/ under the supplied
 * `projectDir`. Hosted calls this with its per-tenant dir (getProjectBase(scope)); OSS wraps it
 * as enrichSeededRichtextLinks(folderName) below.
 * @param {{ projectDir: string }} args
 */
export async function enrichSeededRichtextLinksFromDir({ projectDir }) {
  const pagesDir = path.join(projectDir, "pages");
  const collectionsDir = path.join(projectDir, "collections");

  // slug -> page uuid
  const pageSlugToUuid = new Map();
  try {
    for (const pageFile of await fs.readdir(pagesDir)) {
      if (!pageFile.endsWith(".json")) continue;
      try {
        const page = JSON.parse(await fs.readFile(path.join(pagesDir, pageFile), "utf8"));
        if (page.slug && page.uuid) pageSlugToUuid.set(page.slug, page.uuid);
      } catch {
        // skip unreadable page
      }
    }
  } catch {
    // no pages dir
  }

  // "slugPrefix/slug" -> item uuid (slugPrefix from the collection-type schema, falling back to type)
  const itemUuidBySlugPath = new Map();
  try {
    const typeEntries = await fs.readdir(collectionsDir, { withFileTypes: true });
    for (const typeEntry of typeEntries) {
      if (!typeEntry.isDirectory()) continue;
      const type = typeEntry.name;
      let slugPrefix = type;
      try {
        const schema = await fs.readJSON(path.join(projectDir, "collection-types", type, "schema.json"));
        slugPrefix = schema.slugPrefix || schema.type || type;
      } catch {
        // no schema — fall back to the type folder name
      }
      const typeDir = path.join(collectionsDir, type);
      for (const name of await fs.readdir(typeDir)) {
        if (!name.endsWith(".json") || name === "_order.json") continue;
        try {
          const item = JSON.parse(await fs.readFile(path.join(typeDir, name), "utf8"));
          if (item.uuid) itemUuidBySlugPath.set(`${slugPrefix}/${name.replace(/\.json$/, "")}`, item.uuid);
        } catch {
          // skip unreadable item
        }
      }
    }
  } catch {
    // no collections dir
  }

  if (pageSlugToUuid.size === 0 && itemUuidBySlugPath.size === 0) return;

  const maps = { pageSlugToUuid, itemUuidBySlugPath };
  const enrichString = (value) => (typeof value === "string" ? enrichRichtextLinkRefs(value, maps) : value);
  const widgetProcessor = (widget) => transformWidgetSettings(widget, enrichString);

  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
  // Theme richtext runs the same pass. This is the step that stamps ITEM refs,
  // which cannot happen during the main seed because the collection items do not
  // exist yet — so a theme's shipped article link would otherwise be the one
  // reference in the project that never became stable.
  await updateThemeSettingsFile(path.join(projectDir, "theme.json"), { richtext: enrichString });
  await updateCollectionItems(collectionsDir, (item) => transformItemSettings(item, enrichString));
}

/**
 * OSS folderName wrapper for {@link enrichSeededRichtextLinksFromDir}: resolves the
 * project's DATA_DIR working dir. Called by projectController.seedPresetCollections.
 * @param {string} projectFolderName
 */
export async function enrichSeededRichtextLinks(projectFolderName) {
  return enrichSeededRichtextLinksFromDir({ projectDir: getProjectDir(projectFolderName) });
}
