import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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

// Create a new menu
export async function createMenu(req, res) {
  try {
    const { name, description, slug } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menusDir = getProjectMenusDir(activeProject.id);
    await fs.ensureDir(menusDir);

    const menuPath = getMenuPath(activeProject.id, slug);
    if (await fs.pathExists(menuPath)) {
      return res.status(400).json({ error: "A menu with this slug already exists" });
    }

    const newMenu = {
      id: uuidv4(),
      name,
      description,
      slug,
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
    const { slug } = req.params;
    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menuPath = getMenuPath(activeProjectId, slug);
    await fs.remove(menuPath);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({ error: "Failed to delete menu" });
  }
}

// Get a menu by slug
export async function getMenu(req, res) {
  try {
    const { slug } = req.params;
    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const menuPath = getMenuPath(activeProjectId, slug);
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
    const oldSlug = req.params.slug;
    const menuData = req.body;
    const newSlug = menuData.slug;

    const { activeProjectId } = await readProjectsFile();

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const oldPath = getMenuPath(activeProjectId, oldSlug);
    const newPath = getMenuPath(activeProjectId, newSlug);

    if (oldSlug !== newSlug && (await fs.pathExists(newPath))) {
      return res.status(400).json({
        error: `A menu with the slug \"${newSlug}\" already exists.`,
      });
    }

    const dataToSave = {
      ...menuData,
      updated: new Date().toISOString(),
    };

    await fs.outputFile(newPath, JSON.stringify(dataToSave, null, 2));

    if (oldSlug !== newSlug && (await fs.pathExists(oldPath))) {
      try {
        await fs.remove(oldPath);
      } catch (unlinkError) {
        console.warn(`Failed to delete old menu file ${oldPath}: ${unlinkError.message}`);
      }
    }

    res.json(dataToSave);
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({ error: "Failed to update menu" });
  }
}

// Get a menu by slug
export async function getMenuBySlug(projectIdOrDir, slug) {
  if (!slug) {
    return null;
  }

  try {
    const menuPath = path.join(projectIdOrDir, "menus", `${slug}.json`);

    if (!(await fs.pathExists(menuPath))) {
      return { items: [] };
    }

    const menuData = await fs.readFile(menuPath, "utf8");
    return JSON.parse(menuData);
  } catch (error) {
    console.error(`Error reading menu by slug (${slug}):`, error);
    return { items: [] };
  }
}
