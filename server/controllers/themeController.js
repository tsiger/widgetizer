import fs from "fs-extra";
import path from "path";
import {
  THEMES_DIR,
  getThemeDir,
  getThemeJsonPath,
  getThemeWidgetsDir,
  getThemeTemplatesDir,
  getThemeUpdatesDir,
  getThemeLatestDir,
  getThemeVersionDir,
  getProjectDir,
  getProjectThemeJsonPath,
} from "../config.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import { sortVersions, getLatestVersion, isValidVersion, isNewerVersion } from "../utils/semver.js";

/**
 * Ensure the themes directory exists, creating it if necessary.
 * @returns {Promise<void>}
 * @throws {Error} If directory creation fails
 */
export async function ensureThemesDirectory() {
  try {
    await fs.mkdir(THEMES_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating themes directory:", error);
    throw new Error("Failed to create themes directory");
  }
}

/**
 * Recursively remove .DS_Store files from a directory.
 * Used to clean up macOS artifacts after zip extraction.
 * @param {string} dir - Directory to clean
 */
async function removeDSStoreRecursive(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await removeDSStoreRecursive(fullPath);
      } else if (entry.name === ".DS_Store") {
        await fs.remove(fullPath);
      }
    }
  } catch {
    // Ignore errors (directory might not exist)
  }
}

// ============================================================================
// Theme Versioning Functions
// ============================================================================

/**
 * Get all available versions for a theme.
 * Includes the base version (from root theme.json) and any versions in updates/.
 * @param {string} themeId - Theme identifier (folder name)
 * @returns {Promise<string[]>} - Array of version strings, sorted ascending
 */
export async function getThemeVersions(themeId) {
  const versions = [];

  // Get base version from root theme.json
  try {
    const baseThemeJsonPath = getThemeJsonPath(themeId);
    const baseThemeData = await fs.readFile(baseThemeJsonPath, "utf8");
    const baseTheme = JSON.parse(baseThemeData);
    if (baseTheme.version && isValidVersion(baseTheme.version)) {
      versions.push(baseTheme.version);
    }
  } catch (error) {
    console.warn(`Could not read base theme.json for ${themeId}:`, error.message);
  }

  // Get versions from updates/ directory
  const updatesDir = getThemeUpdatesDir(themeId);
  try {
    const entries = await fs.readdir(updatesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && isValidVersion(entry.name)) {
        // Only add if not already in versions (avoid duplicates if base version is also in updates/)
        if (!versions.includes(entry.name)) {
          versions.push(entry.name);
        }
      }
    }
  } catch (error) {
    // updates/ directory doesn't exist yet - that's fine
    if (error.code !== "ENOENT") {
      console.warn(`Could not read updates directory for ${themeId}:`, error.message);
    }
  }

  return sortVersions(versions);
}

/**
 * Get the source directory for reading theme files.
 * Returns latest/ if it exists (theme has updates), otherwise returns root.
 * @param {string} themeId - Theme identifier (folder name)
 * @returns {Promise<string>} - Path to the theme source directory
 */
export async function getThemeSourceDir(themeId) {
  const latestDir = getThemeLatestDir(themeId);

  try {
    await fs.access(latestDir);
    // latest/ exists, use it
    return latestDir;
  } catch {
    // latest/ doesn't exist, use root
    return getThemeDir(themeId);
  }
}

/**
 * Get the latest version string for a theme.
 * @param {string} themeId - Theme identifier
 * @returns {Promise<string | null>} - Latest version or null
 */
export async function getThemeLatestVersion(themeId) {
  const versions = await getThemeVersions(themeId);
  return getLatestVersion(versions);
}

/**
 * Build the latest/ snapshot by layering base + updates.
 * Only called when updates exist.
 * @param {string} themeId - Theme identifier
 */
export async function buildLatestSnapshot(themeId) {
  const themeDir = getThemeDir(themeId);
  const latestDir = getThemeLatestDir(themeId);
  const updatesDir = getThemeUpdatesDir(themeId);

  // Get all versions (base + updates)
  const versions = await getThemeVersions(themeId);
  if (versions.length <= 1) {
    // No updates exist, don't create latest/
    console.log(`[buildLatestSnapshot] No updates for ${themeId}, skipping latest/ build`);
    return;
  }

  // Get base version
  const baseThemeJsonPath = getThemeJsonPath(themeId);
  const baseThemeData = await fs.readFile(baseThemeJsonPath, "utf8");
  const baseTheme = JSON.parse(baseThemeData);
  const baseVersion = baseTheme.version;

  // Validate that all update version folders have a theme.json with matching version
  const updateVersions = versions.filter((v) => v !== baseVersion);
  const missingThemeJson = [];
  const versionMismatches = [];

  for (const version of updateVersions) {
    const versionDir = getThemeVersionDir(themeId, version);
    const versionThemeJsonPath = path.join(versionDir, "theme.json");

    try {
      const versionThemeData = await fs.readFile(versionThemeJsonPath, "utf8");
      const versionTheme = JSON.parse(versionThemeData);

      // Check if theme.json version matches folder name
      if (versionTheme.version !== version) {
        versionMismatches.push({
          folder: version,
          themeJsonVersion: versionTheme.version,
        });
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        missingThemeJson.push(version);
      } else {
        // JSON parse error or other issue
        missingThemeJson.push(`${version} (invalid JSON)`);
      }
    }
  }

  if (missingThemeJson.length > 0) {
    const errorMsg = `Theme '${themeId}' has version folder(s) missing theme.json: ${missingThemeJson.join(", ")}. Each version folder must include a theme.json file.`;
    console.error(`[buildLatestSnapshot] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (versionMismatches.length > 0) {
    const mismatchDetails = versionMismatches
      .map((m) => `folder '${m.folder}' has theme.json version '${m.themeJsonVersion}'`)
      .join("; ");
    const errorMsg = `Theme '${themeId}' has version mismatch: ${mismatchDetails}. Folder name must match theme.json version.`;
    console.error(`[buildLatestSnapshot] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[buildLatestSnapshot] Building latest/ for ${themeId} with versions: ${versions.join(", ")}`);

  // Remove existing latest/ directory
  try {
    await fs.remove(latestDir);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not remove existing latest/ for ${themeId}:`, error.message);
    }
  }

  // Create fresh latest/ directory
  await fs.ensureDir(latestDir);

  // 1. Start with base (root) files, excluding updates/ and latest/ directories
  const baseEntries = await fs.readdir(themeDir, { withFileTypes: true });
  for (const entry of baseEntries) {
    if (entry.name === "updates" || entry.name === "latest") continue;

    const sourcePath = path.join(themeDir, entry.name);
    const targetPath = path.join(latestDir, entry.name);

    await fs.copy(sourcePath, targetPath);
  }

  // 2. Apply updates in version order (skip base version)
  const sortedUpdateVersions = sortVersions(updateVersions);

  for (const version of sortedUpdateVersions) {
    const versionDir = getThemeVersionDir(themeId, version);

    try {
      const versionEntries = await fs.readdir(versionDir, { withFileTypes: true });

      for (const entry of versionEntries) {
        const sourcePath = path.join(versionDir, entry.name);
        const targetPath = path.join(latestDir, entry.name);

        // Copy with overwrite (later versions win)
        await fs.copy(sourcePath, targetPath, { overwrite: true });
      }

      console.log(`[buildLatestSnapshot] Applied version ${version} to latest/`);
    } catch (error) {
      console.warn(`[buildLatestSnapshot] Could not apply version ${version}:`, error.message);
    }
  }

  console.log(`[buildLatestSnapshot] Successfully built latest/ for ${themeId}`);
}

/**
 * Check if a theme has any updates available beyond the base version.
 * @param {string} themeId - Theme identifier
 * @returns {Promise<boolean>}
 */
export async function themeHasUpdates(themeId) {
  const versions = await getThemeVersions(themeId);
  return versions.length > 1;
}

// ============================================================================
// Theme CRUD Operations
// ============================================================================

/**
 * Get all themes with their metadata, versions, and update status.
 * @param {import('express').Request} _ - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllThemes(_, res) {
  try {
    const themes = await fs.readdir(THEMES_DIR);

    const themesList = await Promise.all(
      themes.map(async (themeId) => {
        try {
          // Get the source directory (latest/ if exists, otherwise root)
          const sourceDir = await getThemeSourceDir(themeId);
          const themeJsonPath = path.join(sourceDir, "theme.json");
          const themeData = await fs.readFile(themeJsonPath, "utf8");
          const theme = JSON.parse(themeData);

          // Get all available versions for this theme
          const versions = await getThemeVersions(themeId);
          const latestVersion = getLatestVersion(versions);

          // Count widgets programmatically from the widgets directory
          let widgetCount = 0;
          const widgetsDir = path.join(sourceDir, "widgets");
          
          try {
            const entries = await fs.readdir(widgetsDir, { withFileTypes: true });
            // Count widget folders (excluding 'global' directory)
            widgetCount = entries.filter(
              (entry) => entry.isDirectory() && entry.name !== "global"
            ).length;
          } catch (widgetDirError) {
            // If widgets directory doesn't exist or can't be read, count is 0
            console.warn(`Could not read widgets directory for theme ${themeId}:`, widgetDirError.message);
          }

          // Check if theme has pending updates
          const hasPendingUpdate = latestVersion && isNewerVersion(theme.version, latestVersion);

          return {
            id: themeId,
            name: theme.name,
            description: theme.description,
            version: theme.version, // Version from the source (latest or base)
            versions, // All available versions
            latestVersion, // Latest available version
            hasPendingUpdate, // True if newest version > current source version
            widgets: widgetCount,
            author: theme.author,
          };
        } catch {
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

/**
 * Get a specific theme's configuration.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
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

/**
 * Get all widget schemas for a theme.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
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
        } catch {
          return null;
        }
      }),
    );

    res.json(widgetsList.filter((widget) => widget !== null));
  } catch (error) {
    res.status(404).json({ error: `Failed to get widgets: ${error.message}` });
  }
}

/**
 * Get all page templates for a theme.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getThemeTemplates(req, res) {
  try {
    const { id } = req.params;
    // Use source directory for reading templates
    const sourceDir = await getThemeSourceDir(id);
    const templatesDir = path.join(sourceDir, "templates");
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

/**
 * API handler to get all versions for a specific theme.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getThemeVersionsHandler(req, res) {
  try {
    const { id } = req.params;
    const versions = await getThemeVersions(id);
    const latestVersion = getLatestVersion(versions);

    res.json({
      themeId: id,
      versions,
      latestVersion,
    });
  } catch (error) {
    res.status(404).json({ error: `Failed to get theme versions: ${error.message}` });
  }
}

/**
 * Check if a theme has pending updates that haven't been built into latest/ yet.
 * Compares the newest version in updates/ with the current source version.
 * @param {string} themeId - Theme identifier
 * @returns {Promise<boolean>}
 */
export async function themeHasPendingUpdates(themeId) {
  try {
    // Get all available versions
    const versions = await getThemeVersions(themeId);
    if (versions.length <= 1) {
      return false; // No updates folder or only base version
    }

    const newestVersion = getLatestVersion(versions);

    // Get current source version (from latest/ if exists, otherwise base)
    const sourceDir = await getThemeSourceDir(themeId);
    const themeJsonPath = path.join(sourceDir, "theme.json");
    const themeData = await fs.readFile(themeJsonPath, "utf8");
    const theme = JSON.parse(themeData);
    const currentVersion = theme.version;

    // Has pending updates if newest version is newer than current
    return isNewerVersion(currentVersion, newestVersion);
  } catch {
    return false;
  }
}

/**
 * Get the count of themes with pending updates (new versions not yet built into latest/).
 * Used for the sidebar badge indicator.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getThemeUpdateCount(req, res) {
  try {
    const themes = await fs.readdir(THEMES_DIR);
    let updateCount = 0;

    for (const themeId of themes) {
      try {
        const themeDir = getThemeDir(themeId);
        const stat = await fs.stat(themeDir);
        if (!stat.isDirectory()) continue;

        // Check if theme has pending updates
        const hasPending = await themeHasPendingUpdates(themeId);
        if (hasPending) {
          updateCount++;
        }
      } catch {
        // Skip themes that can't be read
      }
    }

    res.json({ count: updateCount });
  } catch (error) {
    res.status(500).json({ error: `Failed to get theme update count: ${error.message}` });
  }
}

/**
 * Update a theme by building its latest/ snapshot from base + update versions.
 * This makes the newest version available for projects to update to.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateTheme(req, res) {
  try {
    const { id } = req.params;

    // Check if theme exists
    const themeDir = getThemeDir(id);
    try {
      await fs.access(themeDir);
    } catch {
      return res.status(404).json({ error: `Theme '${id}' not found` });
    }

    // Check if theme has pending updates
    const hasPending = await themeHasPendingUpdates(id);
    if (!hasPending) {
      return res.status(400).json({ error: `Theme '${id}' has no pending updates` });
    }

    // Build the latest snapshot
    await buildLatestSnapshot(id);

    // Get updated theme info
    const sourceDir = await getThemeSourceDir(id);
    const themeJsonPath = path.join(sourceDir, "theme.json");
    const themeData = await fs.readFile(themeJsonPath, "utf8");
    const theme = JSON.parse(themeData);

    res.json({
      message: `Theme '${id}' updated to version ${theme.version}`,
      theme: {
        id,
        version: theme.version,
      },
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to update theme: ${error.message}` });
  }
}

/**
 * Copy theme files from source (latest/ or root) to a project directory.
 * Excludes versioning directories (updates/, latest/) from the copy.
 * @param {string} themeName - Theme identifier (folder name)
 * @param {string} projectDir - Destination project directory path
 * @param {string[]} [excludeDirs=[]] - Additional directories to exclude from copy
 * @returns {Promise<string>} The version string that was copied
 * @throws {Error} If theme copy fails
 */
export async function copyThemeToProject(themeName, projectDir, excludeDirs = []) {
  // Use the source directory (latest/ if exists, otherwise root)
  const sourceDir = await getThemeSourceDir(themeName);

  try {
    // Copy theme directory to project directory recursively
    // We will filter out excluded directories manually if needed, fs.cp doesn't have built-in filter
    await fs.cp(sourceDir, projectDir, { recursive: true });

    // Remove excluded directories AFTER copying everything
    // Also remove versioning directories that shouldn't be in project
    const allExcludes = [...excludeDirs, "updates", "latest"];
    for (const dirToExclude of allExcludes) {
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

    // Get and return the version that was copied
    const themeJsonPath = path.join(sourceDir, "theme.json");
    const themeData = await fs.readFile(themeJsonPath, "utf8");
    const theme = JSON.parse(themeData);
    return theme.version;
  } catch (error) {
    console.error(`Error during theme copy from ${sourceDir} to ${projectDir}:`, error);
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
  const projectFolderName = await getProjectFolderName(projectId);
  const themeFile = getProjectThemeJsonPath(projectFolderName);
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

/**
 * Upload a theme zip file. Supports both new themes and version updates.
 * For new themes: extracts to themes/{name}/
 * For updates: extracts to themes/{name}/updates/{version}/ and builds latest/
 * @param {import('express').Request} req - Express request with file buffer
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
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
  const firstRelevantEntryPathParts = relevantEntries[0].entryName.split(/\//);
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

  // --- Start: Theme Validation ---
  // Validate theme structure before extraction to prevent incomplete/broken themes
  // from polluting the themes directory. We check for minimum required files and
  // directories that make a theme functional in Widgetizer.
  
  const themeJsonEntryPath = `${themeFolderName}/theme.json`;
  const screenshotEntryPath = `${themeFolderName}/screenshot.png`;

  const themeJsonEntry = zip.getEntry(themeJsonEntryPath);
  const screenshotEntry = zip.getEntry(screenshotEntryPath);

  // Required files: theme.json, screenshot.png, layout.liquid
  if (!themeJsonEntry) {
    return res.status(400).json({ message: "Invalid theme: Missing 'theme.json' in the root directory." });
  }

  if (!screenshotEntry) {
    return res.status(400).json({ message: "Invalid theme: Missing 'screenshot.png' in the root directory." });
  }

  const layoutEntryPath = `${themeFolderName}/layout.liquid`;
  if (!zip.getEntry(layoutEntryPath)) {
    return res.status(400).json({ message: "Invalid theme: Missing 'layout.liquid' in the root directory." });
  }

  // Required directories: assets/, templates/, widgets/
  // We check for at least one file in each directory (empty dirs won't work)
  const hasAssetsDir = relevantEntries.some((entry) => entry.entryName.startsWith(`${themeFolderName}/assets/`));
  if (!hasAssetsDir) {
    return res.status(400).json({ message: "Invalid theme: Missing 'assets' directory." });
  }

  const hasTemplatesDir = relevantEntries.some((entry) => entry.entryName.startsWith(`${themeFolderName}/templates/`));
  if (!hasTemplatesDir) {
    return res.status(400).json({ message: "Invalid theme: Missing 'templates' directory." });
  }

  // A theme without widgets is non-functional - reject it early
  const hasWidgetsDir = relevantEntries.some((entry) => entry.entryName.startsWith(`${themeFolderName}/widgets/`));
  if (!hasWidgetsDir) {
    return res.status(400).json({ message: "Invalid theme: Missing 'widgets' directory." });
  }

  // Validate theme.json metadata and extract version info
  let uploadedThemeJson;
  try {
    const themeJsonContent = themeJsonEntry.getData().toString("utf8");
    uploadedThemeJson = JSON.parse(themeJsonContent);

    // Enforce required metadata fields for theme identification and display
    const requiredFields = ["name", "version", "author"];
    const missingFields = requiredFields.filter((field) => !uploadedThemeJson[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Invalid theme.json: Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate semver format
    if (!isValidVersion(uploadedThemeJson.version)) {
      return res.status(400).json({
        message: `Invalid version format: "${uploadedThemeJson.version}". Must be semantic version (e.g., 1.0.0)`,
      });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: "Invalid theme.json: Failed to parse JSON." });
    }
    console.error("Error validating theme.json:", error);
    return res.status(500).json({ message: "Error validating theme configuration." });
  }
  // --- End: Theme Validation ---

  const uploadedVersion = uploadedThemeJson.version;
  const themeDir = getThemeDir(themeFolderName);

  // Check if theme folder already exists
  let themeExists = false;
  try {
    await fs.access(themeDir);
    themeExists = true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error checking existing theme path:", error);
      return res.status(500).json({ message: "Error checking theme directory." });
    }
  }

  // Get existing versions if theme exists
  let existingVersions = [];
  if (themeExists) {
    existingVersions = await getThemeVersions(themeFolderName);
  }

  // Check if this version already exists
  if (existingVersions.includes(uploadedVersion)) {
    return res.status(409).json({
      message: `Version ${uploadedVersion} already exists for theme '${themeFolderName}'.`,
    });
  }

  // Determine extraction target
  let targetPath;
  let isUpdate = false;

  if (themeExists) {
    // This is an update - extract to updates/{version}/
    isUpdate = true;
    targetPath = getThemeVersionDir(themeFolderName, uploadedVersion);
    console.log(`[uploadTheme] Uploading update v${uploadedVersion} for existing theme '${themeFolderName}'`);
  } else {
    // This is a new theme - extract to root
    targetPath = themeDir;
    console.log(`[uploadTheme] Uploading new theme '${themeFolderName}' v${uploadedVersion}`);
  }

  try {
    // Ensure parent directories exist
    await fs.ensureDir(path.dirname(targetPath));

    if (isUpdate) {
      // For updates, we need to extract to a specific version directory
      // Create a temp directory, extract there, then move contents
      const tempDir = path.join(THEMES_DIR, `_temp_${Date.now()}`);
      await fs.ensureDir(tempDir);

      try {
        // Extract to temp directory
        zip.extractAllTo(tempDir, /*overwrite*/ false);

        // Move the extracted theme folder contents to the version directory
        const extractedThemeDir = path.join(tempDir, themeFolderName);
        await fs.ensureDir(targetPath);
        await fs.copy(extractedThemeDir, targetPath);

        // Clean up .DS_Store files from the copied content
        await removeDSStoreRecursive(targetPath);

        // Clean up temp directory
        await fs.remove(tempDir);
      } catch (extractError) {
        // Clean up temp directory on error
        try {
          await fs.remove(tempDir);
        } catch (cleanupError) {
          console.warn("Failed to clean up temp directory:", cleanupError);
        }
        throw extractError;
      }

      // Build the latest/ snapshot now that we have a new version
      await buildLatestSnapshot(themeFolderName);
    } else {
      // For new themes, extract directly to THEMES_DIR
      await fs.ensureDir(THEMES_DIR);
      zip.extractAllTo(THEMES_DIR, /*overwrite*/ false);

      // Clean up macOS artifacts that extractAllTo includes despite our filter
      // (the filter is only used for validation, not extraction)
      try {
        await fs.remove(path.join(THEMES_DIR, "__MACOSX"));
      } catch {
        // Ignore if doesn't exist
      }
      // Remove .DS_Store files recursively from the extracted theme
      await removeDSStoreRecursive(themeDir);
    }

    // Read the final theme data from the source directory
    const sourceDir = await getThemeSourceDir(themeFolderName);
    const versions = await getThemeVersions(themeFolderName);
    const latestVersion = getLatestVersion(versions);

    // Count widgets
    let widgetCount = 0;
    const widgetsDir = path.join(sourceDir, "widgets");
    try {
      const entries = await fs.readdir(widgetsDir, { withFileTypes: true });
      widgetCount = entries.filter((entry) => entry.isDirectory() && entry.name !== "global").length;
    } catch {
      // Ignore widget count errors
    }

    const newThemeData = {
      id: themeFolderName,
      name: uploadedThemeJson.name,
      description: uploadedThemeJson.description,
      version: latestVersion,
      versions,
      latestVersion,
      widgets: widgetCount,
      author: uploadedThemeJson.author,
      isUpdate,
    };

    console.log(`[uploadTheme] Theme '${themeFolderName}' v${uploadedVersion} uploaded successfully`);

    res.status(201).json({
      message: isUpdate
        ? `Theme update '${themeFolderName}' v${uploadedVersion} uploaded successfully.`
        : `Theme '${themeFolderName}' v${uploadedVersion} uploaded successfully.`,
      theme: newThemeData,
    });
  } catch (error) {
    console.error("Error extracting theme zip:", error);
    // Attempt cleanup if extraction failed partially
    try {
      if (isUpdate) {
        await fs.remove(targetPath);
      } else {
        await fs.remove(themeDir);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up failed theme extraction:", cleanupError);
    }
    res.status(500).json({ message: "Failed to extract theme zip file." });
  }
}

/**
 * Get theme settings (theme.json) for a specific project.
 * @param {import('express').Request} req - Express request with projectId param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getProjectThemeSettings(req, res) {
  try {
    const { projectId } = req.params;
    // Call the internal helper function
    const themeData = await readProjectThemeData(projectId);
    res.json(themeData);
  } catch (error) {
    // Handle errors appropriately for the API response
    if (handleProjectResolutionError(res, error)) return;
    if (error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
    } else {
      console.error(`API Error in getProjectThemeSettings for ${req.params.projectId}:`, error);
      res.status(500).json({ message: "Error reading project theme settings" });
    }
  }
}

/**
 * Save theme settings (theme.json) for a specific project.
 * @param {import('express').Request} req - Express request with projectId param and theme data body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function saveProjectThemeSettings(req, res) {
  try {
    const { projectId } = req.params;
    const projectFolderName = await getProjectFolderName(projectId);
    const themeFile = getProjectThemeJsonPath(projectFolderName);

    // Check if project exists
    const projectDir = getProjectDir(projectFolderName);
    try {
      await fs.access(projectDir);
    } catch {
      return res.status(404).json({ message: "Project not found" });
    }

    // Write theme data to file
    await fs.writeFile(themeFile, JSON.stringify(req.body, null, 2));

    res.json({ message: "Theme settings saved successfully" });
  } catch (error) {
    if (handleProjectResolutionError(res, error)) return;
    console.error("Error saving project theme:", error);
    res.status(500).json({ message: "Error saving project theme" });
  }
}
