import { randomUUID } from "crypto";
import { stripHtmlToText } from "../services/sanitizationService.js";
import { LIMIT_KEYS, MAX_MENU_ITEMS, MAX_MENU_DEPTH } from "@widgetizer/core/adapters";
import { generateUniqueSlug } from "../utils/slugHelpers.js";
import { generateCopyName } from "../utils/namingHelpers.js";
import { menuKey, menusDir } from "@widgetizer/core/contentAddress";
import { requestLanguage, projectLanguageContexts, withoutLanguage } from "../utils/contentLanguage.js";

async function listMenuIds(storage, scope, lang) {
  const files = await storage.list(scope, menusDir(lang));
  return files.filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, ""));
}

const writeMenu = (storage, scope, menu, lang) =>
  storage.write(scope, menuKey(menu.id, lang), JSON.stringify(withoutLanguage(menu), null, 2));

/**
 * Bound an attacker-controlled menu-item tree BEFORE the recursive
 * sanitize/label/clone walks run. Walked ITERATIVELY (explicit stack) so the
 * measurement itself can never blow the call stack, and bails as soon as either
 * ceiling is crossed so the work is O(maxItems), not O(tree).
 *
 * @param {Array} items - the menu item tree
 * @param {number} maxItems - node-count ceiling (Infinity for unbounded OSS)
 * @returns {{ ok: true } | { ok: false, reason: "items"|"depth" }}
 */
function validateMenuTree(items, maxItems) {
  if (!Array.isArray(items)) return { ok: true };
  let count = 0;
  const stack = items.map((item) => [item, 1]);
  while (stack.length > 0) {
    const [item, depth] = stack.pop();
    count += 1;
    if (Number.isFinite(maxItems) && count > maxItems) return { ok: false, reason: "items" };
    if (depth > MAX_MENU_DEPTH) return { ok: false, reason: "depth" };
    if (item && Array.isArray(item.items)) {
      for (const child of item.items) stack.push([child, depth + 1]);
    }
  }
  return { ok: true };
}

/**
 * Resolve the menu-item ceiling from the injected limits adapter, falling back
 * to the shared default when no adapter is wired (e.g. direct-controller tests).
 * @param {import('express').Request} req
 */
async function resolveMaxMenuItems(req) {
  const cap = await req.adapters?.limits?.getLimit?.(req.scope, LIMIT_KEYS.MAX_MENU_ITEMS);
  return typeof cap === "number" && cap > 0 ? cap : MAX_MENU_ITEMS;
}

/**
 * Recursively sanitize menu items — strip HTML from labels and links. The tree
 * is depth/count-bounded by validateMenuTree before this runs, so the recursion
 * is safe (depth <= MAX_MENU_DEPTH).
 * @param {Array} items - Array of menu item objects
 * @returns {Array} Sanitized items
 */
function sanitizeMenuItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    label: typeof item.label === "string" ? stripHtmlToText(item.label) : "",
    link: typeof item.link === "string" ? stripHtmlToText(item.link) : "",
    items: sanitizeMenuItems(item.items),
  }));
}

/**
 * Recursively check that all menu items have a non-empty label.
 * @param {Array} items - Array of sanitized menu item objects
 * @returns {boolean} true if all items have labels
 */
function allItemsHaveLabels(items) {
  if (!Array.isArray(items)) return true;
  return items.every(
    (item) => typeof item.label === "string" && item.label.trim() !== "" && allItemsHaveLabels(item.items),
  );
}

/**
 * Retrieves all menus for the active project.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllMenus(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;

    const menus = [];
    for (const lang of projectLanguageContexts(req.activeProject)) {
      const loaded = await Promise.all(
        (await listMenuIds(storage, scope, lang)).map(async (id) => {
          const buf = await storage.read(scope, menuKey(id, lang));
          if (buf == null) return null;
          const menu = JSON.parse(buf.toString("utf8"));

          // Lazy backfill: add uuid to existing menus that don't have one
          if (!menu.uuid) {
            menu.uuid = randomUUID();
            await writeMenu(storage, scope, { ...menu, id }, lang);
          }

          return { ...menu, language: lang.language };
        }),
      );
      menus.push(...loaded.filter((menu) => menu !== null));
    }

    res.json(menus);
  } catch (error) {
    console.error("Error reading menus:", error);
    res.status(500).json({ error: "Failed to get menus" });
  }
}

/**
 * Creates a new menu in the active project with a unique ID.
 * @param {import('express').Request} req - Express request object with menu data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createMenu(req, res) {
  try {
    // Defensive sanitization: strip HTML (route validator also does this,
    // but the controller must be safe even when called directly)
    const name = stripHtmlToText(req.body.name);
    const safeDescription = stripHtmlToText(req.body.description) || "";

    // Defensive check: ensure name is not empty after sanitization
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Menu title is required. HTML tags are not allowed." });
    }

    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Generate unique ID from the sanitized name (server-side only)
    const menuId = await generateUniqueSlug(name, (slug) => storage.exists(scope, menuKey(slug, lang)));

    const newMenu = {
      id: menuId,
      uuid: randomUUID(),
      language: lang.language,
      name,
      description: safeDescription,
      items: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await writeMenu(storage, scope, newMenu, lang);

    res.status(201).json(newMenu);
  } catch (error) {
    console.error("Error creating menu:", error);
    res.status(500).json({ error: "Failed to create menu" });
  }
}

/**
 * Deletes a menu from the active project.
 * @param {import('express').Request} req - Express request object with menu ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteMenu(req, res) {
  try {
    const { id } = req.params;
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    await storage.delete(scope, menuKey(id, lang));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({ error: "Failed to delete menu" });
  }
}

/**
 * Retrieves a single menu by its ID from the active project.
 * @param {import('express').Request} req - Express request object with menu ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getMenu(req, res) {
  try {
    const { id } = req.params;
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    const buf = await storage.read(scope, menuKey(id, lang));
    if (buf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }

    res.json({ ...JSON.parse(buf.toString("utf8")), language: lang.language });
  } catch (error) {
    console.error("Error getting menu:", error);
    res.status(500).json({ error: "Failed to get menu" });
  }
}

/**
 * Updates an existing menu in place. The filename and ID stay stable
 * regardless of name changes — widgets reference menus by UUID.
 * @param {import('express').Request} req - Express request object with menu ID in params and menu data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateMenu(req, res) {
  try {
    const menuId = req.params.id;
    const menuData = req.body;

    // Defensive sanitization: strip HTML (route validator also does this,
    // but the controller must be safe even when called directly)
    if (menuData.name != null) {
      menuData.name = stripHtmlToText(menuData.name);
    }
    if (menuData.description != null) {
      menuData.description = stripHtmlToText(menuData.description) || "";
    }

    // Defensive check: ensure name is not empty after sanitization
    if (!menuData.name || typeof menuData.name !== "string" || menuData.name.trim() === "") {
      return res.status(400).json({ error: "Menu title is required. HTML tags are not allowed." });
    }

    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Read existing menu to preserve uuid (also serves as the existence check)
    const existingBuf = await storage.read(scope, menuKey(menuId, lang));
    if (existingBuf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Sanitize menu item labels and links
    if (Array.isArray(menuData.items)) {
      // Bound the tree before the recursive walks run. Without this an owner
      // could persist a huge/deeply-nested menu that re-pays its
      // sanitize/DOMPurify/render cost on every save and render.
      const maxItems = await resolveMaxMenuItems(req);
      const check = validateMenuTree(menuData.items, maxItems);
      if (!check.ok) {
        const msg =
          check.reason === "depth"
            ? `Menu nesting is too deep (maximum ${MAX_MENU_DEPTH} levels).`
            : `Menu has too many items (maximum ${maxItems}).`;
        return res.status(422).json({ error: msg });
      }

      menuData.items = sanitizeMenuItems(menuData.items);

      // Validate: every item must have a label
      if (!allItemsHaveLabels(menuData.items)) {
        return res.status(400).json({ error: "Every menu item must have a label." });
      }
    }

    const existingMenu = JSON.parse(existingBuf.toString("utf8"));

    const dataToSave = {
      ...menuData,
      id: menuId,
      uuid: existingMenu.uuid || randomUUID(),
      language: lang.language,
      updated: new Date().toISOString(),
    };

    await writeMenu(storage, scope, dataToSave, lang);

    res.json(dataToSave);
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ error: "Failed to update menu" });
  }
}

// Helper function to generate unique menu item IDs recursively
function generateNewMenuItemIds(items) {
  if (!Array.isArray(items)) return items;

  return items.map((item) => {
    const newItem = {
      ...item,
      id: `item_${randomUUID()}`,
    };

    // Recursively handle nested items
    if (item.items && Array.isArray(item.items)) {
      newItem.items = generateNewMenuItemIds(item.items);
    }

    return newItem;
  });
}

/**
 * Duplicates an existing menu with a new unique ID and copy suffix naming.
 * Generates new IDs for all menu items to prevent conflicts.
 * @param {import('express').Request} req - Express request object with menu ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function duplicateMenu(req, res) {
  try {
    const { id } = req.params;
    const { scope } = req;
    const { storage } = req.adapters;
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // Read the original menu (also the existence check)
    const originalBuf = await storage.read(scope, menuKey(id, lang));
    if (originalBuf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }
    const originalMenu = JSON.parse(originalBuf.toString("utf8"));

    // Bound the loaded tree before the recursive clone/id-regeneration.
    // Defends against duplicating an oversized on-disk menu.
    const maxItems = await resolveMaxMenuItems(req);
    const check = validateMenuTree(originalMenu.items, maxItems);
    if (!check.ok) {
      const msg =
        check.reason === "depth"
          ? `Menu nesting is too deep (maximum ${MAX_MENU_DEPTH} levels).`
          : `Menu has too many items (maximum ${maxItems}).`;
      return res.status(422).json({ error: msg });
    }

    // Gather existing menu names for copy-number logic
    const existingMenuNames = (
      await Promise.all(
        (await listMenuIds(storage, scope, lang)).map(async (menuId) => {
          const buf = await storage.read(scope, menuKey(menuId, lang));
          return buf == null ? null : JSON.parse(buf.toString("utf8")).name;
        }),
      )
    ).filter((name) => name != null);
    const newName = generateCopyName(originalMenu.name, existingMenuNames);
    const newMenuId = await generateUniqueSlug(newName, (slug) => storage.exists(scope, menuKey(slug, lang)));

    // Create the duplicated menu with new data
    const duplicatedMenu = {
      ...JSON.parse(JSON.stringify(originalMenu)), // Deep clone
      id: newMenuId,
      uuid: randomUUID(),
      language: lang.language,
      name: newName,
      items: generateNewMenuItemIds(originalMenu.items), // Generate new IDs for all items
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Save the new menu
    await writeMenu(storage, scope, duplicatedMenu, lang);

    res.status(201).json(duplicatedMenu);
  } catch (error) {
    console.error("Error duplicating menu:", error);
    res.status(500).json({ error: "Failed to duplicate menu" });
  }
}
