import fs from "fs-extra";
import path from "path";
import {
  THEMES_DIR,
  getThemeDir,
  getThemeJsonPath,
  getThemeWidgetsDir,
  getThemeTemplatesDir,
  getProjectDir,
  getProjectThemeJsonPath,
} from "../config.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

export async function ensureThemesDirectory() {
  try {
    await fs.mkdir(THEMES_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating themes directory:", error);
    throw new Error("Failed to create themes directory");
  }
}

// Get all themes
export async function getAllThemes(_, res) {
  try {
    const themes = await fs.readdir(THEMES_DIR);

    const themesList = await Promise.all(
      themes.map(async (themeId) => {
        try {
          const themeJsonPath = getThemeJsonPath(themeId);
          const themeData = await fs.readFile(themeJsonPath, "utf8");
          const theme = JSON.parse(themeData);

          return {
            id: themeId,
            name: theme.name,
            description: theme.description,
            version: theme.version,
            widgets: theme.widgets,
            author: theme.author,
          };
        } catch (error) {
          return null;
        }
      }),
    );

    const validThemes = themesList.filter((theme) => theme !== null);
    res.json(validThemes);
  } catch {
    res.status(500).json({ error: "Failed to load themes" });
  }
}

// Get a specific theme
export async function getTheme(req, res) {
  try {
    const { id } = req.params;
    const themeJsonPath = getThemeJsonPath(id);
    const themeData = await fs.readFile(themeJsonPath, "utf8");
    res.json(JSON.parse(themeData));
  } catch {
    res.status(404).json({ error: "Theme not found" });
  }
}

// Get theme widgets
export async function getThemeWidgets(req, res) {
  try {
    const { id } = req.params;
    const widgetsDir = getThemeWidgetsDir(id);
    const entries = await fs.readdir(widgetsDir, { withFileTypes: true });

    const widgetsList = await Promise.all(
      entries.map(async (entry) => {
        try {
          // Process widget folders (new structure)
          if (entry.isDirectory() && entry.name !== "global") {
            const schemaPath = path.join(widgetsDir, entry.name, "schema.json");
            const content = await fs.readFile(schemaPath, "utf8");
            return JSON.parse(content);
          }
          return null;
        } catch (err) {
          return null;
        }
      }),
    );

    res.json(widgetsList.filter((widget) => widget !== null));
  } catch (error) {
    res.status(404).json({ error: `Failed to get widgets: ${error.message}` });
  }
}

// Get theme templates
export async function getThemeTemplates(req, res) {
  try {
    const { id } = req.params;
    const templatesDir = getThemeTemplatesDir(id);
    const templates = await fs.readdir(templatesDir);

    const templatesList = await Promise.all(
      templates.map(async (template) => {
        const templatePath = path.join(templatesDir, template);
        const content = await fs.readFile(templatePath, "utf8");
        return JSON.parse(content);
      }),
    );

    res.json(templatesList);
  } catch (error) {
    res.status(404).json({ error: `Failed to get templates: ${error.message}` });
  }
}

// Copy theme to project
export async function copyThemeToProject(themeName, projectDir, excludeDirs = []) {
  const themeDir = getThemeDir(themeName);

  try {
    // Copy theme directory to project directory recursively
    // We will filter out excluded directories manually if needed, fs.cp doesn't have built-in filter
    await fs.cp(themeDir, projectDir, { recursive: true });

    // Remove excluded directories AFTER copying everything
    for (const dirToExclude of excludeDirs) {
      const projectExcludePath = path.join(projectDir, dirToExclude);
      try {
        // Check if it exists before attempting removal
        await fs.access(projectExcludePath);
        await fs.rm(projectExcludePath, { recursive: true, force: true });
        console.log(`Removed excluded directory: ${projectExcludePath}`);
      } catch (rmError) {
        // If access failed (ENOENT), the dir wasn't copied or doesn't exist, which is fine.
        if (rmError.code !== "ENOENT") {
          console.warn(`Could not remove excluded directory ${projectExcludePath}: ${rmError.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error during theme copy from ${themeDir} to ${projectDir}:`, error);
    // Provide a more specific error if possible
    throw new Error(`Failed to copy theme files: ${error.message}`);
  }
}

/**
 * Reads and parses the theme settings JSON for a given project.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<object>} - The parsed theme settings object.
 * @throws {Error} - If the theme file doesn't exist or cannot be read/parsed.
 */
export async function readProjectThemeData(projectId) {
  const themeFile = getProjectThemeJsonPath(projectId);
  try {
    // Check existence first to provide a clearer error if not found
    await fs.access(themeFile);
    const themeDataStr = await fs.readFile(themeFile, "utf8");
    return JSON.parse(themeDataStr);
  } catch (error) {
    if (error.code === "ENOENT") {
      // If the file doesn't exist, maybe return a default or rethrow specific error
      console.warn(`Theme settings file not found for project ${projectId} at ${themeFile}`);
      // Depending on requirements, might return {} or throw
      throw new Error(`Theme settings file not found for project ${projectId}.`);
    } else {
      // For other errors (read errors, JSON parse errors)
      console.error(`Error reading or parsing theme file ${themeFile}:`, error);
      throw new Error(`Failed to read or parse theme settings for project ${projectId}: ${error.message}`);
    }
  }
}

// Upload a theme zip file
export async function uploadTheme(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No theme zip file uploaded." });
  }

  const zipBuffer = req.file.buffer;
  const AdmZip = await import("adm-zip");
  const zip = new AdmZip.default(zipBuffer);
  const zipEntries = zip.getEntries();

  if (zipEntries.length === 0) {
    return res.status(400).json({ message: "Uploaded zip file is empty." });
  }

  // Filter out macOS specific hidden files/folders and other potential dotfiles at the root
  const relevantEntries = zipEntries.filter(
    (entry) =>
      !entry.entryName.startsWith("__MACOSX/") &&
      !entry.entryName.split("/").pop().startsWith(".") && // Ignore files like .DS_Store
      entry.entryName !== "/", // Ignore root directory entry if present
  );

  if (relevantEntries.length === 0) {
    return res.status(400).json({ message: "Zip file contains no relevant theme content after filtering." });
  }

  // Assuming the theme is contained within a single root folder in the zip
  // Determine the root folder name from the first *relevant* entry
  const firstRelevantEntryPathParts = relevantEntries[0].entryName.split(/[\/]/);
  const themeFolderName = firstRelevantEntryPathParts[0];

  // Check if a valid theme folder name was found (could be empty if zip structure is unexpected)
  if (
    !themeFolderName ||
    themeFolderName === "" ||
    (!relevantEntries[0].isDirectory && firstRelevantEntryPathParts.length === 1)
  ) {
    // If the first entry isn't a directory and has no slashes, it implies files might be at the root
    return res
      .status(400)
      .json({ message: "Zip file structure is invalid. Expecting a single root folder containing the theme." });
  }

  // More robust check might be needed depending on zip structure expectations
  // Check if all *relevant* entries start with the same directory name
  const consistentRoot = relevantEntries.every(
    (entry) => entry.entryName.startsWith(themeFolderName + "/"), // Check if they are inside the determined folder
  );

  if (!consistentRoot) {
    return res
      .status(400)
      .json({ message: "Zip file structure is invalid. Expecting a single root folder containing the theme." });
  }

  const targetThemePath = path.join(THEMES_DIR, themeFolderName);

  // Check if theme folder already exists
  try {
    await fs.access(targetThemePath);
    // If access doesn't throw, the folder exists
    return res.status(409).json({ message: `Theme '${themeFolderName}' already exists.` });
  } catch (error) {
    // If access throws ENOENT, the folder doesn't exist, which is good
    if (error.code !== "ENOENT") {
      console.error("Error checking existing theme path:", error);
      return res.status(500).json({ message: "Error checking theme directory." });
    }
  }

  try {
    // Ensure the main THEMES_DIR exists (might be redundant but safe)
    await fs.ensureDir(THEMES_DIR);

    // Extract the zip file directly into the THEMES_DIR
    // Adm-zip should handle creating the themeFolderName directory
    zip.extractAllTo(THEMES_DIR, /*overwrite*/ false);

    // TODO: Add validation here to check if the extracted folder contains a valid theme.json etc.

    // --- Start: Read the new theme's data ---
    const newThemeJsonPath = getThemeJsonPath(themeFolderName);
    let newThemeData = null;
    try {
      const themeDataStr = await fs.readFile(newThemeJsonPath, "utf8");
      const themeJson = JSON.parse(themeDataStr);
      newThemeData = {
        id: themeFolderName,
        name: themeJson.name,
        description: themeJson.description,
        version: themeJson.version,
        widgets: themeJson.widgets, // Assuming widgets count/list is in theme.json
        author: themeJson.author,
      };
    } catch (readError) {
      console.error(`Error reading theme.json for newly uploaded theme '${themeFolderName}':`, readError);
      // Don't fail the whole upload, but log the error. Respond without theme data.
      return res.status(201).json({
        message: `Theme '${themeFolderName}' uploaded, but failed to read its theme.json.`,
        theme: null, // Indicate data couldn't be read
      });
    }
    // --- End: Read the new theme's data ---

    console.log(`Theme '${themeFolderName}' extracted successfully to ${targetThemePath}`);
    res.status(201).json({
      message: `Theme '${themeFolderName}' uploaded successfully.`,
      theme: newThemeData, // Include the new theme data in the response
    });
  } catch (error) {
    console.error("Error extracting theme zip:", error);
    // Attempt cleanup if extraction failed partially
    try {
      await fs.remove(targetThemePath);
    } catch (cleanupError) {
      console.error("Error cleaning up failed theme extraction:", cleanupError);
    }
    res.status(500).json({ message: "Failed to extract theme zip file." });
  } finally {
    // We don't need to delete the zip file explicitly as it was stored in memory
  }
}

// Get project theme settings (Route Handler - now uses the helper)
export async function getProjectThemeSettings(req, res) {
  try {
    const { projectId } = req.params;
    const projectFolderName = await getProjectFolderName(projectId);
    // Call the internal helper function
    const themeData = await readProjectThemeData(projectFolderName);
    res.json(themeData);
  } catch (error) {
    // Handle errors appropriately for the API response
    if (error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
    } else {
      console.error(`API Error in getProjectThemeSettings for ${req.params.projectId}:`, error);
      res.status(500).json({ message: "Error reading project theme settings" });
    }
  }
}

// Save project theme settings
export async function saveProjectThemeSettings(req, res) {
  try {
    const { projectId } = req.params;
    const projectFolderName = await getProjectFolderName(projectId);
    const themeFile = getProjectThemeJsonPath(projectFolderName);

    // Check if project exists
    const projectDir = getProjectDir(projectFolderName);
    try {
      await fs.access(projectDir);
    } catch (err) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Write theme data to file
    await fs.writeFile(themeFile, JSON.stringify(req.body, null, 2));

    res.json({ message: "Theme settings saved successfully" });
  } catch (error) {
    console.error("Error saving project theme:", error);
    res.status(500).json({ message: "Error saving project theme" });
  }
}
