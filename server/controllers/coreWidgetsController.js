import fs from "fs-extra";
import path from "path";
import { CORE_WIDGETS_DIR } from "../config.js";

/**
 * Get all available core widgets
 */
export async function getCoreWidgets() {
  try {
    // Ensure the core widgets directory exists
    if (!(await fs.pathExists(CORE_WIDGETS_DIR))) {
      await fs.ensureDir(CORE_WIDGETS_DIR);
      return [];
    }

    // Read all widget folders
    const entries = await fs.readdir(CORE_WIDGETS_DIR, { withFileTypes: true });
    const widgetFolders = entries.filter((entry) => entry.isDirectory());

    // Process each widget folder to read its schema.json
    const widgetSchemas = await Promise.all(
      widgetFolders.map(async (folder) => {
        try {
          const schemaPath = path.join(CORE_WIDGETS_DIR, folder.name, "schema.json");
          const content = await fs.readFile(schemaPath, "utf8");
          return JSON.parse(content);
        } catch (error) {
          console.error(`Error loading schema for core widget ${folder.name}:`, error);
          return null;
        }
      }),
    );

    // Filter out any null schemas (errors)
    return widgetSchemas.filter((schema) => schema !== null);
  } catch (error) {
    console.error("Error getting core widgets:", error);
    return [];
  }
}

/**
 * Get a specific core widget by name
 */
export async function getCoreWidget(widgetName) {
  try {
    const schemaPath = path.join(CORE_WIDGETS_DIR, widgetName, "schema.json");

    if (await fs.pathExists(schemaPath)) {
      const content = await fs.readFile(schemaPath, "utf8");
      return JSON.parse(content);
    }

    return null;
  } catch (error) {
    console.error(`Error getting core widget ${widgetName}:`, error);
    return null;
  }
}

/**
 * API endpoint to get all core widgets
 */
export async function getAllCoreWidgets(req, res) {
  try {
    const widgets = await getCoreWidgets();
    res.json(widgets);
  } catch (error) {
    res.status(500).json({ error: `Failed to get core widgets: ${error.message}` });
  }
}
