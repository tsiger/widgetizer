import fs from "fs-extra";
import path from "path";
import multer from "multer";
import {
  DATA_DIR,
  THEMES_SEED_DIR,
  getUserThemesDir,
  getThemeDir,
  getThemeJsonPath,
  getThemeWidgetsDir,
  getThemeUpdatesDir,
  getThemeLatestDir,
  getThemeVersionDir,
  getProjectDir,
  getProjectThemeJsonPath,
} from "../config.js";
import { getAllProjects } from "../db/repositories/projectRepository.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import { sortVersions, getLatestVersion, isValidVersion, isNewerVersion } from "../utils/semver.js";
import { ZIP_MIME_TYPES } from "../utils/mimeTypes.js";
import { updateThemeSettingsMediaUsage } from "../services/mediaUsageService.js";
import { sanitizeThemeSettings } from "../services/sanitizationService.js";
import { readAppSettingsFile } from "./appSettingsController.js";
import { EDITOR_LIMITS } from "../limits.js";
import { checkLimit, validateZipEntries } from "../utils/limitChecks.js";

/**
 * Ensure the user's themes directory exists.
 * If the directory is newly created (first access), copies all themes from the
 * seed directory so the user starts with the default theme(s) installed.
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 * @throws {Error} If directory creation or seed copy fails
 */
export async function ensureThemesDirectory(userId = "local") {
  const userThemesDir = getUserThemesDir(userId);
  const alreadyExists = await fs.pathExists(userThemesDir);

  try {
    await fs.mkdir(userThemesDir, { recursive: true });
  } catch (error) {
    console.error("Error creating themes directory:", error);
    throw new Error("Failed to create themes directory");
  }

  // Provision default themes on first access
  if (!alreadyExists) {
    try {
      const seedExists = await fs.pathExists(THEMES_SEED_DIR);
      if (seedExists) {
        const seedThemes = await fs.readdir(THEMES_SEED_DIR, { withFileTypes: true });
        for (const entry of seedThemes) {
          if (entry.isDirectory()) {
            const src = path.join(THEMES_SEED_DIR, entry.name);
            const dest = path.join(userThemesDir, entry.name);
            await fs.copy(src, dest);
          }
        }
        console.log(`[ensureThemesDirectory] Provisioned default themes for user ${userId}`);
      }
    } catch (error) {
      console.warn(`[ensureThemesDirectory] Failed to provision default themes: ${error.message}`);
      // Non-fatal — user can still upload themes manually
    }
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

/**
 * Recursively get all paths from a deleted/ folder.
 * Returns paths relative to the deleted/ folder root.
 *
 * Logic:
 * - Files are always deleted (they act as placeholders)
 * - Empty directories mean "delete this entire folder"
 * - Non-empty directories are just path containers (not deleted themselves)
 *
 * @param {string} deletedDir - The deleted/ directory to scan
 * @param {string} relativePath - Current relative path (for recursion)
 * @returns {Promise<string[]>} - Array of relative paths to delete
 */
async function getDeletedPaths(deletedDir, relativePath) {
  const paths = [];
  const currentDir = relativePath ? path.join(deletedDir, relativePath) : deletedDir;

  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // Check if directory is empty
        const subDir = path.join(currentDir, entry.name);
        const subEntries = await fs.readdir(subDir);

        if (subEntries.length === 0) {
          // Empty directory = delete this entire folder
          paths.push(entryRelativePath);
        } else {
          // Non-empty directory = recurse to find actual items to delete
          const nestedPaths = await getDeletedPaths(deletedDir, entryRelativePath);
          paths.push(...nestedPaths);
        }
      } else {
        // Files: add the file path for deletion
        paths.push(entryRelativePath);
      }
    }
  } catch {
    // Ignore errors
  }

  return paths;
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
export async function getThemeVersions(themeId, userId = "local") {
  const versions = [];

  // Get base version from root theme.json
  try {
    const baseThemeJsonPath = getThemeJsonPath(themeId, userId);
    const baseThemeData = await fs.readFile(baseThemeJsonPath, "utf8");
    const baseTheme = JSON.parse(baseThemeData);
    if (baseTheme.version && isValidVersion(baseTheme.version)) {
      versions.push(baseTheme.version);
    }
  } catch (error) {
    console.warn(`Could not read base theme.json for ${themeId}:`, error.message);
  }

  // Get versions from updates/ directory
  const updatesDir = getThemeUpdatesDir(themeId, userId);
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
 * Returns latest/ if it exists AND contains theme.json (theme has updates), otherwise returns root.
 * @param {string} themeId - Theme identifier (folder name)
 * @returns {Promise<string>} - Path to the theme source directory
 */
export async function getThemeSourceDir(themeId, userId = "local") {
  const latestDir = getThemeLatestDir(themeId, userId);
  const latestThemeJson = path.join(latestDir, "theme.json");

  try {
    // Check if latest/theme.json exists (not just the directory)
    await fs.access(latestThemeJson);
    // latest/ exists and has theme.json, use it
    return latestDir;
  } catch {
    // latest/ doesn't exist or is incomplete, use root
    return getThemeDir(themeId, userId);
  }
}

/**
 * Get the latest version string for a theme.
 * @param {string} themeId - Theme identifier
 * @returns {Promise<string | null>} - Latest version or null
 */
export async function getThemeLatestVersion(themeId, userId = "local") {
  const versions = await getThemeVersions(themeId, userId);
  return getLatestVersion(versions);
}

/**
 * Build the latest/ snapshot by layering base + updates.
 * Only called when updates exist.
 * @param {string} themeId - Theme identifier
 */
export async function buildLatestSnapshot(themeId, userId = "local") {
  const themeDir = getThemeDir(themeId, userId);
  const latestDir = getThemeLatestDir(themeId, userId);

  // Get all versions (base + updates)
  const versions = await getThemeVersions(themeId, userId);
  if (versions.length <= 1) {
    // No updates exist, don't create latest/
    console.log(`[buildLatestSnapshot] No updates for ${themeId}, skipping latest/ build`);
    return;
  }

  // Get base version
  const baseThemeJsonPath = getThemeJsonPath(themeId, userId);
  const baseThemeData = await fs.readFile(baseThemeJsonPath, "utf8");
  const baseTheme = JSON.parse(baseThemeData);
  const baseVersion = baseTheme.version;

  // Validate that all update version folders have a theme.json with matching version
  const updateVersions = versions.filter((v) => v !== baseVersion);
  const missingThemeJson = [];
  const versionMismatches = [];

  for (const version of updateVersions) {
    const versionDir = getThemeVersionDir(themeId, version, userId);
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
    const versionDir = getThemeVersionDir(themeId, version, userId);

    try {
      const versionEntries = await fs.readdir(versionDir, { withFileTypes: true });

      for (const entry of versionEntries) {
        // Skip the deleted/ folder - it's processed separately
        if (entry.name === "deleted") continue;

        const sourcePath = path.join(versionDir, entry.name);
        const targetPath = path.join(latestDir, entry.name);

        // Copy with overwrite (later versions win)
        await fs.copy(sourcePath, targetPath, { overwrite: true });
      }

      // Process deleted/ folder if it exists
      const deletedDir = path.join(versionDir, "deleted");
      if (await fs.pathExists(deletedDir)) {
        const deletedPaths = await getDeletedPaths(deletedDir, "");
        for (const deletedPath of deletedPaths) {
          const targetPath = path.join(latestDir, deletedPath);
          try {
            await fs.remove(targetPath);
            console.log(`[buildLatestSnapshot] Deleted ${deletedPath} (v${version})`);
          } catch (deleteError) {
            // Ignore if path doesn't exist
            if (deleteError.code !== "ENOENT") {
              console.warn(`[buildLatestSnapshot] Could not delete ${deletedPath}:`, deleteError.message);
            }
          }
        }
      }

      console.log(`[buildLatestSnapshot] Applied version ${version} to latest/`);
    } catch (error) {
      console.warn(`[buildLatestSnapshot] Could not apply version ${version}:`, error.message);
    }
  }

  console.log(`[buildLatestSnapshot] Successfully built latest/ for ${themeId}`);
}

// ============================================================================
// Theme Preset Functions
// ============================================================================

/**
 * Resolve template, menu, and settings override paths for a preset.
 * If no presetId or preset directory doesn't exist, falls back to root.
 * @param {string} themeId - Theme identifier
 * @param {string|null} presetId - Preset identifier (null = use root defaults)
 * @returns {Promise<{templatesDir: string, menusDir: string|null, settingsOverrides: object|null}>}
 */
export async function resolvePresetPaths(themeId, presetId, userId = "local") {
  // Use the theme source directory (latest/ if it exists, root otherwise)
  const sourceDir = await getThemeSourceDir(themeId, userId);
  const rootTemplatesDir = path.join(sourceDir, "templates");

  if (!presetId) {
    return {
      templatesDir: rootTemplatesDir,
      menusDir: null,
      settingsOverrides: null,
    };
  }

  const presetDir = path.join(sourceDir, "presets", presetId);

  // Check if the preset directory actually exists
  try {
    await fs.access(presetDir);
  } catch {
    return {
      templatesDir: rootTemplatesDir,
      menusDir: null,
      settingsOverrides: null,
    };
  }

  // Resolve templates directory
  let templatesDir = rootTemplatesDir;
  const presetTemplatesDir = path.join(presetDir, "templates");
  try {
    await fs.access(presetTemplatesDir);
    templatesDir = presetTemplatesDir;
  } catch {
    // No preset templates, use root
  }

  // Resolve menus directory (null = keep root menus already copied)
  let menusDir = null;
  const presetMenusDir = path.join(presetDir, "menus");
  try {
    await fs.access(presetMenusDir);
    menusDir = presetMenusDir;
  } catch {
    // No preset menus, use root
  }

  // Read settings overrides
  let settingsOverrides = null;
  const presetJsonPath = path.join(presetDir, "preset.json");
  try {
    const content = await fs.readFile(presetJsonPath, "utf8");
    const presetData = JSON.parse(content);
    if (presetData.settings && Object.keys(presetData.settings).length > 0) {
      settingsOverrides = presetData.settings;
    }
  } catch {
    // No preset.json or invalid JSON, no overrides
  }

  return { templatesDir, menusDir, settingsOverrides };
}

/**
 * Get all presets for a theme.
 * Returns an empty array if the theme has no presets directory.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getThemePresets(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const themeDir = getThemeDir(id, userId);
    try {
      await fs.access(themeDir);
    } catch {
      return res.status(404).json({ error: `Theme '${id}' not found` });
    }

    // Read presets from the theme source directory (latest/ if it exists, root otherwise).
    // This ensures presets delivered via theme updates are visible.
    const sourceDir = await getThemeSourceDir(id, userId);
    const presetsJsonPath = path.join(sourceDir, "presets", "presets.json");

    try {
      const content = await fs.readFile(presetsJsonPath, "utf8");
      const presetsData = JSON.parse(content);

      const enrichedPresets = await Promise.all(
        (presetsData.presets || []).map(async (preset) => {
          let hasScreenshot = false;
          const presetDir = path.join(sourceDir, "presets", preset.id);
          try {
            await fs.access(path.join(presetDir, "screenshot.png"));
            hasScreenshot = true;
          } catch {
            // No preset screenshot
          }

          return {
            ...preset,
            isDefault: preset.id === presetsData.default,
            hasScreenshot,
          };
        }),
      );

      res.json({
        default: presetsData.default,
        presets: enrichedPresets,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.json({ default: null, presets: [] });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to get theme presets: ${error.message}` });
  }
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
export async function getAllThemes(req, res) {
  try {
    const userId = req.userId;
    const userThemesDir = getUserThemesDir(userId);

    // Ensure user themes directory exists (provisions default themes on first access)
    await ensureThemesDirectory(userId);

    const themes = await fs.readdir(userThemesDir);

    const themesList = await Promise.all(
      themes.map(async (themeId) => {
        try {
          // Get the source directory (latest/ if exists, otherwise root)
          const sourceDir = await getThemeSourceDir(themeId, userId);
          const themeJsonPath = path.join(sourceDir, "theme.json");
          const themeData = await fs.readFile(themeJsonPath, "utf8");
          const theme = JSON.parse(themeData);

          // Get all available versions for this theme
          const versions = await getThemeVersions(themeId, userId);
          const latestVersion = getLatestVersion(versions);

          // Count widgets programmatically from the widgets directory
          let widgetCount = 0;
          const widgetsDir = path.join(sourceDir, "widgets");

          try {
            const entries = await fs.readdir(widgetsDir, { withFileTypes: true });
            // Count widget folders (excluding 'global' directory)
            widgetCount = entries.filter((entry) => entry.isDirectory() && entry.name !== "global").length;
          } catch (widgetDirError) {
            // If widgets directory doesn't exist or can't be read, count is 0
            console.warn(`Could not read widgets directory for theme ${themeId}:`, widgetDirError.message);
          }

          // Count presets if presets.json exists (read from source dir, not root)
          let presetCount = 0;
          try {
            const presetsJsonPath = path.join(sourceDir, "presets", "presets.json");
            const presetsContent = await fs.readFile(presetsJsonPath, "utf8");
            const presetsData = JSON.parse(presetsContent);
            presetCount = (presetsData.presets || []).length;
          } catch {
            // No presets or invalid file
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
            presets: presetCount,
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
    const themeJsonPath = getThemeJsonPath(id, req.userId);
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
    const widgetsDir = getThemeWidgetsDir(id, req.userId);
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
    const sourceDir = await getThemeSourceDir(id, req.userId);
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
    const versions = await getThemeVersions(id, req.userId);
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
export async function themeHasPendingUpdates(themeId, userId = "local") {
  try {
    // Get all available versions
    const versions = await getThemeVersions(themeId, userId);
    if (versions.length <= 1) {
      return false; // No updates folder or only base version
    }

    const newestVersion = getLatestVersion(versions);

    // Get current source version (from latest/ if exists, otherwise base)
    const sourceDir = await getThemeSourceDir(themeId, userId);
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
    const userId = req.userId;
    const userThemesDir = getUserThemesDir(userId);
    await ensureThemesDirectory(userId);
    const themes = await fs.readdir(userThemesDir);
    let updateCount = 0;

    for (const themeId of themes) {
      try {
        const themeDir = getThemeDir(themeId, userId);
        const stat = await fs.stat(themeDir);
        if (!stat.isDirectory()) continue;

        // Check if theme has pending updates
        const hasPending = await themeHasPendingUpdates(themeId, userId);
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
    const userId = req.userId;

    // Check if theme exists
    const themeDir = getThemeDir(id, userId);
    try {
      await fs.access(themeDir);
    } catch {
      return res.status(404).json({ error: `Theme '${id}' not found` });
    }

    // Check if theme has pending updates
    const hasPending = await themeHasPendingUpdates(id, userId);
    if (!hasPending) {
      return res.status(400).json({ error: `Theme '${id}' has no pending updates` });
    }

    // Build the latest snapshot
    await buildLatestSnapshot(id, userId);

    // Get updated theme info
    const sourceDir = await getThemeSourceDir(id, userId);
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
export async function copyThemeToProject(themeName, projectDir, excludeDirs = [], userId = "local") {
  // Use the source directory (latest/ if exists, otherwise root)
  const sourceDir = await getThemeSourceDir(themeName, userId);

  try {
    // Copy theme directory to project directory recursively
    // We will filter out excluded directories manually if needed, fs.cp doesn't have built-in filter
    await fs.cp(sourceDir, projectDir, { recursive: true });

    // Remove excluded directories AFTER copying everything
    // Also remove versioning directories that shouldn't be in project
    const allExcludes = [...excludeDirs, "updates", "latest", "presets"];
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
export async function readProjectThemeData(projectId, userId) {
  const projectFolderName = await getProjectFolderName(projectId, userId);
  const themeFile = getProjectThemeJsonPath(projectFolderName, userId);
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
 * Delete a theme if it's not currently in use by any projects.
 * @param {import('express').Request} req - Express request with theme id param
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteTheme(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const themeDir = getThemeDir(id, userId);

    // 1. Check if theme exists
    try {
      await fs.access(themeDir);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({ error: `Theme '${id}' not found.` });
      }
      throw error;
    }

    // 2. Check if theme is in use by any of this user's projects
    const projects = getAllProjects(userId);
    const projectsUsingTheme = projects.filter((p) => p.theme === id);

    if (projectsUsingTheme.length > 0) {
      return res.status(409).json({
        error: "Theme is in use",
        message: `Cannot delete theme "${id}" because it is used by ${projectsUsingTheme.length} project(s)`,
        projectsUsingTheme: projectsUsingTheme.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });
    }

    // 3. Delete the theme directory
    await fs.rm(themeDir, { recursive: true, force: true });

    res.json({ success: true, message: `Theme "${id}" deleted successfully` });
  } catch (error) {
    console.error(`Error deleting theme: ${error.message}`);
    res.status(500).json({ error: `Failed to delete theme: ${error.message}` });
  }
}

const UPLOAD_TEMP_DIR = path.join(DATA_DIR, "temp");

/**
 * Express middleware that configures multer for theme ZIP upload,
 * reading the max size from app settings (shared with project import).
 */
export async function handleThemeUpload(req, res, next) {
  try {
    let maxSizeMB = 500;
    try {
      const settings = await readAppSettingsFile(req.userId);
      maxSizeMB = settings.export?.maxImportSizeMB || 500;
    } catch {
      // Fall back to default 500MB
    }

    await fs.ensureDir(UPLOAD_TEMP_DIR);

    const upload = multer({
      dest: UPLOAD_TEMP_DIR,
      limits: { fileSize: maxSizeMB * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ZIP_MIME_TYPES.includes(file.mimetype) || file.originalname.endsWith(".zip")) {
          cb(null, true);
        } else {
          cb(new Error("Only ZIP files are allowed"), false);
        }
      },
    });

    upload.single("themeZip")(req, res, async (err) => {
      if (!err) return next();

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File size exceeds the maximum allowed size of ${maxSizeMB}MB.`,
        });
      }
      return res.status(400).json({ message: err.message || "File upload error" });
    });
  } catch {
    return res.status(500).json({ message: "Failed to configure file upload" });
  }
}

/**
 * Upload a theme zip file. Supports both new themes and version updates.
 * For new themes: extracts to themes/{name}/
 * For updates: extracts to themes/{name}/updates/{version}/ and builds latest/
 * @param {import('express').Request} req - Express request with file on disk (req.file.path)
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function uploadTheme(req, res) {
  const uploadedFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No theme zip file uploaded." });
    }

    const AdmZip = await import("adm-zip");
    const zip = new AdmZip.default(uploadedFilePath);

  // Safety: validate ZIP entries (path traversal + entry count) — always enforced
  const zipCheck = validateZipEntries(zip);
  if (!zipCheck.ok) {
    return res.status(400).json({ message: zipCheck.error });
  }

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
  const userId = req.userId;
  const themeDir = getThemeDir(themeFolderName, userId);

  // --- Start: Scan for update versions in zip ---
  // Check for updates/ folder in the zip and validate each version folder
  const updateVersionsInZip = [];
  const updatesPrefix = `${themeFolderName}/updates/`;
  const latestPrefix = `${themeFolderName}/latest/`;

  // Find all version folders under updates/
  const updateFolderNames = new Set();
  for (const entry of relevantEntries) {
    if (entry.entryName.startsWith(updatesPrefix) && !entry.entryName.startsWith(latestPrefix)) {
      // Extract version folder name: updates/{version}/...
      const relativePath = entry.entryName.slice(updatesPrefix.length);
      const versionFolder = relativePath.split("/")[0];
      if (versionFolder && versionFolder !== "") {
        updateFolderNames.add(versionFolder);
      }
    }
  }

  // Validate each update version folder
  for (const versionFolder of updateFolderNames) {
    // Must be valid semver
    if (!isValidVersion(versionFolder)) {
      return res.status(400).json({
        message: `Invalid update folder name: '${versionFolder}'. Must be semantic version (e.g., 1.1.0)`,
      });
    }

    // Must have theme.json
    const updateThemeJsonPath = `${themeFolderName}/updates/${versionFolder}/theme.json`;
    const updateThemeJsonEntry = zip.getEntry(updateThemeJsonPath);
    if (!updateThemeJsonEntry) {
      return res.status(400).json({
        message: `Update folder '${versionFolder}' is missing required theme.json`,
      });
    }

    // Parse and validate theme.json
    let updateThemeJson;
    try {
      const content = updateThemeJsonEntry.getData().toString("utf8");
      updateThemeJson = JSON.parse(content);
    } catch {
      return res.status(400).json({
        message: `Update folder '${versionFolder}' has invalid theme.json: Failed to parse JSON`,
      });
    }

    // Version in theme.json must match folder name
    if (!updateThemeJson.version) {
      return res.status(400).json({
        message: `Update folder '${versionFolder}' theme.json is missing 'version' field`,
      });
    }

    if (updateThemeJson.version !== versionFolder) {
      return res.status(400).json({
        message: `Update folder '${versionFolder}' has version mismatch: theme.json says '${updateThemeJson.version}'`,
      });
    }

    updateVersionsInZip.push(versionFolder);
  }
  // --- End: Scan for update versions in zip ---

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
    existingVersions = await getThemeVersions(themeFolderName, userId);
  }

  // Determine what to install
  let isNewTheme = !themeExists;
  let newUpdateVersions = [];

  // Platform limit: max themes per user (only for net-new themes, not updates)
  if (isNewTheme) {
    const themesDir = getUserThemesDir(userId);
    if (await fs.pathExists(themesDir)) {
      const themeDirs = (await fs.readdir(themesDir, { withFileTypes: true })).filter((e) => e.isDirectory());
      const themeCheck = checkLimit(themeDirs.length, EDITOR_LIMITS.maxThemesPerUser, "themes", { hostedMode: req.app.locals.hostedMode });
      if (!themeCheck.ok) {
        return res.status(403).json({ message: themeCheck.error });
      }
    }
  }

  if (themeExists) {
    // Theme already exists - check what's new in this zip
    // Filter out update versions that are already installed
    newUpdateVersions = updateVersionsInZip.filter((v) => !existingVersions.includes(v));

    // If base version already exists and no new updates, reject
    if (existingVersions.includes(uploadedVersion) && newUpdateVersions.length === 0) {
      return res.status(409).json({
        message: `Theme '${themeFolderName}' is already up to date. Base version ${uploadedVersion} and all update versions are already installed.`,
      });
    }

    // If base version doesn't match, we can't safely merge
    if (!existingVersions.includes(uploadedVersion)) {
      return res.status(409).json({
        message: `Cannot import updates: zip has base version ${uploadedVersion} but installed theme has base version ${existingVersions[0] || "unknown"}. Base versions must match.`,
      });
    }

    console.log(
      `[uploadTheme] Importing ${newUpdateVersions.length} new update(s) for existing theme '${themeFolderName}': ${newUpdateVersions.join(", ")}`,
    );
  } else {
    console.log(`[uploadTheme] Installing new theme '${themeFolderName}' v${uploadedVersion}`);
  }

  const userThemesDir = getUserThemesDir(userId);
  try {
    if (isNewTheme) {
      // --- New theme installation ---
      await ensureThemesDirectory(userId);

      // Extract to temp directory first so we can skip latest/
      const tempDir = path.join(userThemesDir, `_temp_${Date.now()}`);
      await fs.ensureDir(tempDir);

      try {
        zip.extractAllTo(tempDir, /*overwrite*/ false);

        const extractedThemeDir = path.join(tempDir, themeFolderName);

        // Remove latest/ if it exists in the extracted content (we'll rebuild it)
        const extractedLatestDir = path.join(extractedThemeDir, "latest");
        try {
          await fs.remove(extractedLatestDir);
        } catch {
          // Ignore if doesn't exist
        }

        // Move to final location
        await fs.copy(extractedThemeDir, themeDir);

        // Clean up
        await fs.remove(tempDir);
      } catch (extractError) {
        try {
          await fs.remove(tempDir);
        } catch (cleanupError) {
          console.warn("Failed to clean up temp directory:", cleanupError);
        }
        throw extractError;
      }

      // Clean up macOS artifacts
      try {
        await fs.remove(path.join(userThemesDir, "__MACOSX"));
      } catch {
        // Ignore if doesn't exist
      }
      await removeDSStoreRecursive(themeDir);

      // Build latest/ if there are update versions
      if (updateVersionsInZip.length > 0) {
        await buildLatestSnapshot(themeFolderName, userId);
      }
    } else {
      // --- Import new update versions into existing theme ---
      const tempDir = path.join(userThemesDir, `_temp_${Date.now()}`);
      await fs.ensureDir(tempDir);

      try {
        zip.extractAllTo(tempDir, /*overwrite*/ false);

        const extractedThemeDir = path.join(tempDir, themeFolderName);
        const extractedUpdatesDir = path.join(extractedThemeDir, "updates");

        // Copy each new update version folder
        for (const version of newUpdateVersions) {
          const sourceVersionDir = path.join(extractedUpdatesDir, version);
          const targetVersionDir = getThemeVersionDir(themeFolderName, version, userId);

          await fs.ensureDir(targetVersionDir);
          await fs.copy(sourceVersionDir, targetVersionDir);
          await removeDSStoreRecursive(targetVersionDir);

          console.log(`[uploadTheme] Imported update v${version} for theme '${themeFolderName}'`);
        }

        await fs.remove(tempDir);
      } catch (extractError) {
        try {
          await fs.remove(tempDir);
        } catch (cleanupError) {
          console.warn("Failed to clean up temp directory:", cleanupError);
        }
        throw extractError;
      }

      // Rebuild latest/ snapshot with the new versions
      await buildLatestSnapshot(themeFolderName, userId);
    }

    // Read the final theme data from the source directory
    const sourceDir = await getThemeSourceDir(themeFolderName, userId);
    const versions = await getThemeVersions(themeFolderName, userId);
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
      isUpdate: !isNewTheme,
      addedVersions: isNewTheme ? null : newUpdateVersions,
    };

    console.log(`[uploadTheme] Theme '${themeFolderName}' processed successfully`);

    // Build appropriate response message
    let message;
    if (isNewTheme) {
      const updateCount = updateVersionsInZip.length;
      message =
        updateCount > 0
          ? `Theme '${themeFolderName}' v${uploadedVersion} installed with ${updateCount} update(s).`
          : `Theme '${themeFolderName}' v${uploadedVersion} installed successfully.`;
    } else {
      message = `Imported ${newUpdateVersions.length} update(s) for theme '${themeFolderName}': ${newUpdateVersions.join(", ")}`;
    }

    res.status(201).json({
      message,
      theme: newThemeData,
    });
  } catch (error) {
    console.error("Error extracting theme zip:", error);
    // Attempt cleanup if extraction failed partially for new themes
    if (isNewTheme) {
      try {
        await fs.remove(themeDir);
      } catch (cleanupError) {
        console.error("Error cleaning up failed theme extraction:", cleanupError);
      }
    }
    res.status(500).json({ message: "Failed to extract theme zip file." });
  }
  } finally {
    if (uploadedFilePath) await fs.remove(uploadedFilePath).catch(() => {});
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
    const themeData = await readProjectThemeData(projectId, req.userId);
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
    const projectFolderName = await getProjectFolderName(projectId, req.userId);
    const themeFile = getProjectThemeJsonPath(projectFolderName, req.userId);

    // Check if project exists
    const projectDir = getProjectDir(projectFolderName, req.userId);
    try {
      await fs.access(projectDir);
    } catch {
      return res.status(404).json({ message: "Project not found" });
    }

    // Validate and sanitize theme settings before writing
    const { data: sanitizedThemeData, warnings } = sanitizeThemeSettings(req.body);
    await fs.writeFile(themeFile, JSON.stringify(sanitizedThemeData, null, 2));

    // Track media used in theme settings (e.g. favicon) for usage and export
    try {
      await updateThemeSettingsMediaUsage(projectId, sanitizedThemeData, req.userId);
    } catch (usageError) {
      console.warn("Failed to update theme settings media usage:", usageError.message);
    }

    const response = { message: "Theme settings saved successfully" };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    res.json(response);
  } catch (error) {
    if (handleProjectResolutionError(res, error)) return;
    console.error("Error saving project theme:", error);
    res.status(500).json({ message: "Error saving project theme" });
  }
}
