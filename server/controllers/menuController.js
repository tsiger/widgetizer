import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import slugify from "slugify";
import { validationResult } from "express-validator";
import { getProjectMenusDir, getMenuPath } from "../config.js";
import { readProjectsFile } from "./projectController.js";

/**
 * Retrieves all menus for the active project.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllMenus(req, res) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const menusDir = getProjectMenusDir(projectFolderName);

    if (!(await fs.pathExists(menusDir))) {
      return res.json([]);
    }

    const menuFiles = (await fs.readdir(menusDir)).filter((file) => file.endsWith(".json"));
    const menus = await Promise.all(
      menuFiles.map(async (file) => {
        const filePath = path.join(menusDir, file);
        const menuData = await fs.readFile(filePath, "utf8");
        const menu = JSON.parse(menuData);

        // Lazy backfill: add uuid to existing menus that don't have one
        if (!menu.uuid) {
          menu.uuid = randomUUID();
          await fs.outputFile(filePath, JSON.stringify(menu, null, 2));
        }

        return menu;
      }),
    );

    res.json(menus);
  } catch (error) {
    console.error("Error reading menus:", error);
    res.status(500).json({ error: "Failed to get menus" });
  }
}

// Helper function to generate unique menu ID
async function generateUniqueMenuId(projectId, baseName) {
  const generateId = (name) => {
    return slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });
  };

  let id = generateId(baseName);
  let counter = 1;

  // Check if the ID already exists
  while (await fs.pathExists(getMenuPath(projectId, id))) {
    id = generateId(`${baseName} ${counter}`);
    counter++;
  }

  return id;
}

/**
 * Creates a new menu in the active project with a unique ID.
 * @param {import('express').Request} req - Express request object with menu data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createMenu(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, id: requestedId } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const menusDir = getProjectMenusDir(projectFolderName);
    await fs.ensureDir(menusDir);

    // Generate unique ID from name (or use requested ID if provided)
    const menuId = requestedId || (await generateUniqueMenuId(projectFolderName, name));

    const menuPath = getMenuPath(projectFolderName, menuId);
    if (await fs.pathExists(menuPath)) {
      return res.status(400).json({ error: "A menu with this name already exists" });
    }

    const newMenu = {
      id: menuId,
      uuid: randomUUID(),
      name,
      description,
      items: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await fs.outputFile(menuPath, JSON.stringify(newMenu, null, 2));

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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const menuPath = getMenuPath(projectFolderName, id);
    await fs.remove(menuPath);
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const menuPath = getMenuPath(projectFolderName, id);
    if (!(await fs.pathExists(menuPath))) {
      return res.status(404).json({ error: "Menu not found" });
    }

    const menuData = await fs.readFile(menuPath, "utf8");
    res.json(JSON.parse(menuData));
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const menuId = req.params.id;
    const menuData = req.body;

    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const menuPath = getMenuPath(projectFolderName, menuId);

    if (!(await fs.pathExists(menuPath))) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Read existing menu to preserve uuid
    const existingMenu = JSON.parse(await fs.readFile(menuPath, "utf8"));

    const dataToSave = {
      ...menuData,
      id: menuId,
      uuid: existingMenu.uuid || randomUUID(),
      updated: new Date().toISOString(),
    };

    await fs.outputFile(menuPath, JSON.stringify(dataToSave, null, 2));

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
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    // Recursively handle nested items
    if (item.items && Array.isArray(item.items)) {
      newItem.items = generateNewMenuItemIds(item.items);
    }

    return newItem;
  });
}

/**
 * Duplicates an existing menu with a new unique ID and "Copy of" prefix.
 * Generates new IDs for all menu items to prevent conflicts.
 * @param {import('express').Request} req - Express request object with menu ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function duplicateMenu(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const originalMenuPath = getMenuPath(projectFolderName, id);

    // Check if original menu exists
    if (!(await fs.pathExists(originalMenuPath))) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Read the original menu
    const originalMenuData = await fs.readFile(originalMenuPath, "utf8");
    const originalMenu = JSON.parse(originalMenuData);

    // Generate new unique name and ID
    const baseName = `Copy of ${originalMenu.name}`;
    const newMenuId = await generateUniqueMenuId(projectFolderName, baseName);

    // Create the duplicated menu with new data
    const duplicatedMenu = {
      ...JSON.parse(JSON.stringify(originalMenu)), // Deep clone
      id: newMenuId,
      uuid: randomUUID(),
      name: baseName,
      items: generateNewMenuItemIds(originalMenu.items), // Generate new IDs for all items
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Save the new menu
    const newMenuPath = getMenuPath(projectFolderName, newMenuId);
    await fs.outputFile(newMenuPath, JSON.stringify(duplicatedMenu, null, 2));

    res.status(201).json(duplicatedMenu);
  } catch (error) {
    console.error("Error duplicating menu:", error);
    res.status(500).json({ error: "Failed to duplicate menu" });
  }
}
