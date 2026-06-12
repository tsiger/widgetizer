import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { generateUniqueSlug } from "../utils/slugHelpers.js";
import { generateCopyName } from "../utils/namingHelpers.js";

/**
 * Recursively sanitize menu items — strip HTML from labels and links.
 * @param {Array} items - Array of menu item objects
 * @returns {Array} Sanitized items
 */
function sanitizeMenuItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    label: typeof item.label === "string" ? stripHtmlTags(item.label) : "",
    link: typeof item.link === "string" ? stripHtmlTags(item.link) : "",
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

    const menuFiles = (await storage.list(scope, "menus")).filter((file) => file.endsWith(".json"));
    const menus = (
      await Promise.all(
        menuFiles.map(async (file) => {
          const buf = await storage.read(scope, `menus/${file}`);
          if (buf == null) return null;
          const menu = JSON.parse(buf.toString("utf8"));

          // Lazy backfill: add uuid to existing menus that don't have one
          if (!menu.uuid) {
            menu.uuid = randomUUID();
            await storage.write(scope, `menus/${file}`, JSON.stringify(menu, null, 2));
          }

          return menu;
        }),
      )
    ).filter((menu) => menu !== null);

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
    const name = stripHtmlTags(req.body.name);
    const safeDescription = stripHtmlTags(req.body.description) || "";

    // Defensive check: ensure name is not empty after sanitization
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Menu title is required. HTML tags are not allowed." });
    }

    const { scope } = req;
    const { storage } = req.adapters;

    // Generate unique ID from the sanitized name (server-side only)
    const menuId = await generateUniqueSlug(name, (slug) => storage.exists(scope, `menus/${slug}.json`));

    const newMenu = {
      id: menuId,
      uuid: randomUUID(),
      name,
      description: safeDescription,
      items: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await storage.write(scope, `menus/${menuId}.json`, JSON.stringify(newMenu, null, 2));

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

    await storage.delete(scope, `menus/${id}.json`);
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

    const buf = await storage.read(scope, `menus/${id}.json`);
    if (buf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }

    res.json(JSON.parse(buf.toString("utf8")));
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
      menuData.name = stripHtmlTags(menuData.name);
    }
    if (menuData.description != null) {
      menuData.description = stripHtmlTags(menuData.description) || "";
    }

    // Defensive check: ensure name is not empty after sanitization
    if (!menuData.name || typeof menuData.name !== "string" || menuData.name.trim() === "") {
      return res.status(400).json({ error: "Menu title is required. HTML tags are not allowed." });
    }

    const { scope } = req;
    const { storage } = req.adapters;

    // Read existing menu to preserve uuid (also serves as the existence check)
    const existingBuf = await storage.read(scope, `menus/${menuId}.json`);
    if (existingBuf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Sanitize menu item labels and links
    if (Array.isArray(menuData.items)) {
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
      updated: new Date().toISOString(),
    };

    await storage.write(scope, `menus/${menuId}.json`, JSON.stringify(dataToSave, null, 2));

    res.json(dataToSave);
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ error: "Failed to update menu" });
  }
}

/**
 * Retrieves a menu by ID for the rendering service.
 * @param {string} projectIdOrDir - The project directory path
 * @param {string} menuId - The menu identifier
 * @returns {Promise<object>} The menu data or an object with empty items array
 */
export async function getMenuById(projectIdOrDir, menuId) {
  if (!menuId) {
    return null;
  }

  try {
    const menuPath = path.join(projectIdOrDir, "menus", `${menuId}.json`);

    if (!(await fs.pathExists(menuPath))) {
      return { items: [] };
    }

    const menuData = await fs.readFile(menuPath, "utf8");
    const menu = JSON.parse(menuData);

    // Lazy backfill: add uuid if missing
    if (!menu.uuid) {
      menu.uuid = randomUUID();
      await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
    }

    return menu;
  } catch (error) {
    console.error(`Error reading menu by id (${menuId}):`, error);
    return { items: [] };
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

    // Read the original menu (also the existence check)
    const originalBuf = await storage.read(scope, `menus/${id}.json`);
    if (originalBuf == null) {
      return res.status(404).json({ error: "Menu not found" });
    }
    const originalMenu = JSON.parse(originalBuf.toString("utf8"));

    // Gather existing menu names for copy-number logic
    const menuFiles = (await storage.list(scope, "menus")).filter((f) => f.endsWith(".json"));
    const existingMenuNames = (
      await Promise.all(
        menuFiles.map(async (f) => {
          const buf = await storage.read(scope, `menus/${f}`);
          return buf == null ? null : JSON.parse(buf.toString("utf8")).name;
        }),
      )
    ).filter((name) => name != null);
    const newName = generateCopyName(originalMenu.name, existingMenuNames);
    const newMenuId = await generateUniqueSlug(newName, (slug) => storage.exists(scope, `menus/${slug}.json`));

    // Create the duplicated menu with new data
    const duplicatedMenu = {
      ...JSON.parse(JSON.stringify(originalMenu)), // Deep clone
      id: newMenuId,
      uuid: randomUUID(),
      name: newName,
      items: generateNewMenuItemIds(originalMenu.items), // Generate new IDs for all items
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Save the new menu
    await storage.write(scope, `menus/${newMenuId}.json`, JSON.stringify(duplicatedMenu, null, 2));

    res.status(201).json(duplicatedMenu);
  } catch (error) {
    console.error("Error duplicating menu:", error);
    res.status(500).json({ error: "Failed to duplicate menu" });
  }
}
