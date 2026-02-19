import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getProjectPagesDir, getProjectMenusDir } from "../config.js";

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
export async function enrichNewProjectReferences(projectFolderName, userId) {
  const pagesDir = getProjectPagesDir(projectFolderName, userId);
  const menusDir = getProjectMenusDir(projectFolderName, userId);

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
            uuid: menu.uuid || uuidv4(),
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
}

/**
 * Remap UUIDs in a duplicated project.
 * Regenerates page and menu UUIDs, then remaps all pageUuid and
 * menu UUID references in widgets and menu items to use the new values.
 */
export async function remapDuplicatedProjectUuids(projectFolderName, userId) {
  const pagesDir = getProjectPagesDir(projectFolderName, userId);
  const menusDir = getProjectMenusDir(projectFolderName, userId);

  const oldToNewUuid = new Map();
  const oldToNewMenuUuid = new Map();

  // Step 1: Regenerate page UUIDs and build mapping
  const pageFiles = await fs.readdir(pagesDir);
  for (const pageFile of pageFiles) {
    if (!pageFile.endsWith(".json")) continue;

    const pagePath = path.join(pagesDir, pageFile);
    const content = await fs.readFile(pagePath, "utf8");
    const page = JSON.parse(content);

    if (page.type === "header" || page.type === "footer") continue;

    const oldUuid = page.uuid;
    const newUuid = uuidv4();
    oldToNewUuid.set(oldUuid, newUuid);

    page.uuid = newUuid;
    await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
  }

  // Step 2: Regenerate menu UUIDs and update menu item pageUuids
  if (await fs.pathExists(menusDir)) {
    const menuFiles = await fs.readdir(menusDir);
    for (const menuFile of menuFiles) {
      if (!menuFile.endsWith(".json")) continue;

      const menuPath = path.join(menusDir, menuFile);
      const content = await fs.readFile(menuPath, "utf8");
      const menu = JSON.parse(content);

      if (menu.uuid) {
        const newMenuUuid = uuidv4();
        oldToNewMenuUuid.set(menu.uuid, newMenuUuid);
        menu.uuid = newMenuUuid;
      } else {
        menu.uuid = uuidv4();
      }

      menu.items = processMenuItems(menu.items, (item) => {
        if (item.pageUuid) {
          const newUuid = oldToNewUuid.get(item.pageUuid);
          if (newUuid) item.pageUuid = newUuid;
        }
        return item;
      });

      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }
  }

  // Step 3: Remap widget references in pages and global widgets
  const remapValue = (value) => {
    if (isLinkObject(value) && value.pageUuid) {
      const newUuid = oldToNewUuid.get(value.pageUuid);
      return newUuid ? { ...value, pageUuid: newUuid } : value;
    }
    if (typeof value === "string" && oldToNewMenuUuid.has(value)) {
      return oldToNewMenuUuid.get(value);
    }
    return value;
  };

  const widgetProcessor = (widget) => transformWidgetSettings(widget, remapValue);

  await updatePageWidgets(pagesDir, widgetProcessor);
  await updateGlobalWidgets(pagesDir, widgetProcessor);
}
