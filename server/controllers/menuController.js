import fs from "fs-extra";
import path from "path";
import slugify from "slugify";
import { getProjectMenusDir, getMenuPath } from "../config.js";
import { readProjectsFile } from "./projectController.js";

// Get all menus
export async function getAllMenus(req, res) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menusDir = getProjectMenusDir(activeProject.id);

    if (!(await fs.pathExists(menusDir))) {
      return res.json([]);
    }

    const menuFiles = await fs.readdir(menusDir);
    const menus = await Promise.all(
      menuFiles.map(async (file) => {
        const menuData = await fs.readFile(path.join(menusDir, file), "utf8");
        return JSON.parse(menuData);
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

// Create a new menu
export async function createMenu(req, res) {
  try {
    const { name, description, id: requestedId } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menusDir = getProjectMenusDir(activeProject.id);
    await fs.ensureDir(menusDir);

    // Generate unique ID from name (or use requested ID if provided)
    const menuId = requestedId || (await generateUniqueMenuId(activeProject.id, name));

    const menuPath = getMenuPath(activeProject.id, menuId);
    if (await fs.pathExists(menuPath)) {
      return res.status(400).json({ error: "A menu with this name already exists" });
    }

    const newMenu = {
      id: menuId,
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

// Delete a menu
export async function deleteMenu(req, res) {
  try {
    const { id } = req.params;
    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menuPath = getMenuPath(activeProjectId, id);
    await fs.remove(menuPath);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({ error: "Failed to delete menu" });
  }
}

// Get a menu by id
export async function getMenu(req, res) {
  try {
    const { id } = req.params;
    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menuPath = getMenuPath(activeProjectId, id);
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

// Update a menu
export async function updateMenu(req, res) {
  try {
    const currentMenuId = req.params.id;
    const menuData = req.body;

    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const currentMenuPath = getMenuPath(activeProjectId, currentMenuId);

    // Check if current menu exists
    if (!(await fs.pathExists(currentMenuPath))) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // For updates, we'll keep the same ID unless the user explicitly changed the name
    // and we need to generate a new ID
    let finalMenuId = currentMenuId;
    let finalMenuPath = currentMenuPath;

    // If name changed and it would result in a different ID, we might need to rename
    const expectedIdFromName = slugify(menuData.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Only rename if the expected ID is different from current AND the new path doesn't exist
    if (expectedIdFromName !== currentMenuId) {
      const newMenuPath = getMenuPath(activeProjectId, expectedIdFromName);

      if (!(await fs.pathExists(newMenuPath))) {
        // Safe to rename
        finalMenuId = expectedIdFromName;
        finalMenuPath = newMenuPath;
      }
      // If new path exists, keep the current ID (avoid conflicts)
    }

    const dataToSave = {
      ...menuData,
      id: finalMenuId,
      updated: new Date().toISOString(),
    };

    await fs.outputFile(finalMenuPath, JSON.stringify(dataToSave, null, 2));

    // If we renamed the file, delete the old one
    if (finalMenuPath !== currentMenuPath) {
      try {
        await fs.remove(currentMenuPath);
      } catch (unlinkError) {
        console.warn(`Failed to delete old menu file ${currentMenuPath}: ${unlinkError.message}`);
      }
    }

    res.json(dataToSave);
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ error: "Failed to update menu" });
  }
}

// Get a menu by id (for rendering service)
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
    return JSON.parse(menuData);
  } catch (error) {
    console.error(`Error reading menu by id (${menuId}):`, error);
    return { items: [] };
  }
}
