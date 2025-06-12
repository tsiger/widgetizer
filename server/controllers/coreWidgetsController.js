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

    // Read all widget files
    const widgetFiles = await fs.readdir(CORE_WIDGETS_DIR);
    const liquidFiles = widgetFiles.filter((file) => file.endsWith(".liquid"));

    // Process each widget to extract its schema
    const widgetSchemas = await Promise.all(
      liquidFiles.map(async (filename) => {
        try {
          const filePath = path.join(CORE_WIDGETS_DIR, filename);
          const content = await fs.readFile(filePath, "utf8");

          // Extract widget schema from HTML content
          const scriptTagStart = '<script type="application/json" data-widget-schema>';
          const scriptTagEnd = "</script>";
          const startIndex = content.indexOf(scriptTagStart);
          const endIndex = content.indexOf(scriptTagEnd, startIndex);

          if (startIndex !== -1 && endIndex !== -1) {
            const jsonStr = content.substring(startIndex + scriptTagStart.length, endIndex).trim();
            return JSON.parse(jsonStr);
          }
        } catch (error) {
          console.error(`Error loading schema for core widget ${filename}:`, error);
        }
        return null;
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
    const filePath = path.join(CORE_WIDGETS_DIR, `${widgetName}.liquid`);

    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, "utf8");

      // Extract widget schema from HTML content
      const scriptTagStart = '<script type="application/json" data-widget-schema>';
      const scriptTagEnd = "</script>";
      const startIndex = content.indexOf(scriptTagStart);
      const endIndex = content.indexOf(scriptTagEnd, startIndex);

      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = content.substring(startIndex + scriptTagStart.length, endIndex).trim();
        return JSON.parse(jsonStr);
      }
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
