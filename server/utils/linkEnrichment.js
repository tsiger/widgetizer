import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectPagesDir, getProjectMenusDir, getProjectCollectionsDir } from "../config.js";
import { writeJsonAtomic, isAtomicTmpFile } from "./atomicFs.js";
import { syncCollectionItemMediaUsageOnWrite } from "../services/mediaUsageService.js";

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
  if (!(await fs.pathExists(pagesDir))) return;
  const pageFiles = await fs.readdir(pagesDir);
  for (const pageFile of pageFiles) {
    if (!pageFile.endsWith(".json")) continue;

    const pagePath = path.join(pagesDir, pageFile);
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

/**
 * Apply widgetProcessor to global widgets (header.json, footer.json).
 */
async function updateGlobalWidgets(pagesDir, widgetProcessor) {
  const globalDir = path.join(pagesDir, "global");
  if (!(await fs.pathExists(globalDir))) return;

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
 * back (atomically) those that changed. Returns the touched items.
 */
async function updateCollectionItems(projectFolderName, itemTransformer) {
  const collectionsDir = getProjectCollectionsDir(projectFolderName);
  if (!(await fs.pathExists(collectionsDir))) return [];

  const touched = [];
  const typeEntries = await fs.readdir(collectionsDir, { withFileTypes: true });
  for (const typeEntry of typeEntries) {
    if (!typeEntry.isDirectory()) continue;
    const type = typeEntry.name;
    const typeDir = path.join(collectionsDir, type);
    let names;
    try {
      names = await fs.readdir(typeDir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith(".json") || name === "_order.json" || isAtomicTmpFile(name)) continue;
      const slug = name.replace(/\.json$/, "");
      const itemPath = path.join(typeDir, name);
      try {
        const item = JSON.parse(await fs.readFile(itemPath, "utf8"));
        const { item: nextItem, changed } = itemTransformer(item, type, slug);
        if (changed) {
          await writeJsonAtomic(itemPath, nextItem);
          touched.push({ type, slug, item: nextItem });
        }
      } catch (error) {
        console.warn(
          `[linkEnrichment] Failed to process collection item ${type}/${name}: ${error.message}`,
        );
      }
    }
  }
  return touched;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enrich a newly created project's references.
 * - Adds pageUuid to menu items based on slug-to-UUID mapping
 * - Adds metadata (id, uuid, timestamps) to menus copied from themes
 * - Replaces menu slug references in widget settings with menu UUIDs
 * - Adds pageUuid to widget link settings based on slug-to-UUID mapping
 */
export async function enrichNewProjectReferences(projectFolderName) {
  const pagesDir = getProjectPagesDir(projectFolderName);
  const menusDir = getProjectMenusDir(projectFolderName);

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
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, enrichValue);

  try {
    await updatePageWidgets(pagesDir, widgetProcessor);
    await updateGlobalWidgets(pagesDir, widgetProcessor);
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich widget links: ${error.message}`);
  }

  // Step 5: Enrich seeded collection items (slug-format links -> pageUuid).
  // Media usage is rebuilt by the project-creation structural refresh.
  try {
    await updateCollectionItems(projectFolderName, (item) =>
      transformItemSettings(item, enrichValue),
    );
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

  // Step 1: Regenerate collection item UUIDs FIRST, building the old->new map so
  // the menu pass below can remap stable collection-item references (#11). Every
  // item gets a fresh identity in the duplicated project (always rewritten).
  await updateCollectionItems(projectFolderName, (item) => {
    const newUuid = randomUUID();
    if (item.uuid) oldToNewItemUuid.set(item.uuid, newUuid);
    return { item: { ...item, uuid: newUuid }, changed: true };
  });

  // Step 2: Regenerate page UUIDs and build mapping
  const pageFiles = await fs.readdir(pagesDir);
  for (const pageFile of pageFiles) {
    if (!pageFile.endsWith(".json")) continue;

    const pagePath = path.join(pagesDir, pageFile);
    const content = await fs.readFile(pagePath, "utf8");
    const page = JSON.parse(content);

    if (page.type === "header" || page.type === "footer") continue;

    const oldUuid = page.uuid;
    const newUuid = randomUUID();
    oldToNewUuid.set(oldUuid, newUuid);

    page.uuid = newUuid;
    await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
  }

  // Step 3: Regenerate menu UUIDs and remap menu item references — both
  // pageUuid (oldToNewUuid) and stable collection-item refs (oldToNewItemUuid).
  if (await fs.pathExists(menusDir)) {
    const menuFiles = await fs.readdir(menusDir);
    for (const menuFile of menuFiles) {
      if (!menuFile.endsWith(".json")) continue;

      const menuPath = path.join(menusDir, menuFile);
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
        if (item.collectionItemUuid) {
          const newItemUuid = oldToNewItemUuid.get(item.collectionItemUuid);
          if (newItemUuid) item.collectionItemUuid = newItemUuid;
        }
        return item;
      });

      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }
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
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, remapValue);

  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);

  // Step 5: Remap link references inside collection item settings (item uuids
  // were already regenerated in step 1; this only fixes pageUuid/menu refs).
  await updateCollectionItems(projectFolderName, (item) => transformItemSettings(item, remapValue));
}

/**
 * Clean up all references to a deleted page across the project.
 * Removes orphaned pageUuid references from widget link settings (pages + globals)
 * and menu items, writing back only files that were actually modified.
 * @param {string} projectFolderName - The project folder name
 * @param {string} deletedPageUuid - The UUID of the deleted page
 * @param {string|null} [projectId=null] - When provided, refreshes media usage
 *   for any collection item whose link settings were cleared.
 */
export async function cleanupDeletedPageReferences(
  projectFolderName,
  deletedPageUuid,
  projectId = null,
) {
  const pagesDir = getProjectPagesDir(projectFolderName);
  const menusDir = getProjectMenusDir(projectFolderName);

  // Clean widget link settings in pages and global widgets
  const cleanValue = (value) => {
    if (isLinkObject(value) && value.pageUuid === deletedPageUuid) {
      return { href: "", text: "", target: "_self" };
    }
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, cleanValue);

  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);

  // Clean menu items
  if (await fs.pathExists(menusDir)) {
    const menuFiles = await fs.readdir(menusDir);
    for (const menuFile of menuFiles) {
      if (!menuFile.endsWith(".json")) continue;

      const menuPath = path.join(menusDir, menuFile);
      const content = await fs.readFile(menuPath, "utf8");
      const menu = JSON.parse(content);

      const cleanedItems = processMenuItems(menu.items, (item) => {
        if (item.pageUuid === deletedPageUuid) {
          item.link = "";
          delete item.pageUuid;
        }
        return item;
      });

      if (JSON.stringify(cleanedItems) !== JSON.stringify(menu.items)) {
        menu.items = cleanedItems;
        await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
      }
    }
  }

  // Clean collection item link settings, then keep media usage in sync for each
  // touched item (a cleared file/link may have removed an upload reference).
  const touched = await updateCollectionItems(projectFolderName, (item) =>
    transformItemSettings(item, cleanValue),
  );
  if (projectId) {
    for (const { type, slug, item } of touched) {
      try {
        await syncCollectionItemMediaUsageOnWrite(projectId, type, slug, item, null);
      } catch (error) {
        console.warn(
          `[linkEnrichment] Failed to sync media usage for ${type}/${slug}: ${error.message}`,
        );
      }
    }
  }
}

/**
 * Clean up references to deleted collection item page(s) (#11) across the project:
 * menu items, widget/block `link` settings (pages + globals), and collection-item
 * `link` settings. Clears the link and drops the stable-ref fields
 * (`collectionItemUuid`/`collectionType`) on anything pointing at a deleted item.
 * Render-time resolution already clears dead refs; this prunes them from disk so
 * they never re-surface (parity with `cleanupDeletedPageReferences`).
 * @param {string} projectFolderName - The project folder name
 * @param {string|string[]|Set<string>} deletedItemUuids - uuid(s) of deleted items
 */
export async function cleanupDeletedCollectionItemReferences(projectFolderName, deletedItemUuids) {
  const uuids =
    deletedItemUuids instanceof Set
      ? deletedItemUuids
      : new Set(Array.isArray(deletedItemUuids) ? deletedItemUuids : [deletedItemUuids]);
  if (uuids.size === 0) return;

  const pagesDir = getProjectPagesDir(projectFolderName);
  const menusDir = getProjectMenusDir(projectFolderName);

  // Clear widget/block + collection-item `link` settings pointing at a deleted item.
  const cleanValue = (value) => {
    if (isLinkObject(value) && value.collectionItemUuid && uuids.has(value.collectionItemUuid)) {
      return { href: "", text: "", target: "_self" };
    }
    return value;
  };
  const widgetProcessor = (widget) => transformWidgetSettings(widget, cleanValue);
  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
  await updateCollectionItems(projectFolderName, (item) => transformItemSettings(item, cleanValue));

  // Clear menu items pointing at a deleted item (keep the item, drop the ref).
  if (!(await fs.pathExists(menusDir))) return;
  const menuFiles = await fs.readdir(menusDir);
  for (const menuFile of menuFiles) {
    if (!menuFile.endsWith(".json")) continue;

    const menuPath = path.join(menusDir, menuFile);
    const menu = JSON.parse(await fs.readFile(menuPath, "utf8"));

    const cleanedItems = processMenuItems(menu.items, (item) => {
      if (item.collectionItemUuid && uuids.has(item.collectionItemUuid)) {
        item.link = "";
        delete item.collectionItemUuid;
        delete item.collectionType;
      }
      return item;
    });

    if (JSON.stringify(cleanedItems) !== JSON.stringify(menu.items)) {
      menu.items = cleanedItems;
      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }
  }
}

/**
 * Remap menu `collectionItemUuid` references using an old->new item-uuid map.
 * Used after preset seeding regenerates item uuids, so a preset menu that ships a
 * stable collection-item reference points at the freshly seeded item (#11)
 * instead of the dead preset/source uuid.
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
 * Remap collection-item `collectionItemUuid` references in widget/block and
 * collection-item `link` settings using an old->new item-uuid map. The link-field
 * analogue of `remapCollectionItemMenuRefs`, run after preset seeding regenerates
 * item uuids so a preset's link targets point at the freshly seeded items (#11).
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
    return value;
  };
  const widgetProcessor = (widget) => transformWidgetSettings(widget, remapValue);
  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
  await updateCollectionItems(projectFolderName, (item) => transformItemSettings(item, remapValue));
}
