/**
 * Theme Update Service
 * Handles applying theme updates to projects safely.
 */

import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectDir, getProjectThemeJsonPath } from "../config.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { getThemeSourceDir } from "../controllers/themeController.js";
import { isNewerVersion } from "../utils/semver.js";
import { processTemplatesRecursive } from "../utils/templateHelpers.js";

/**
 * Updatable paths - these are copied from theme to project during updates.
 * Everything else is protected (pages/, menus/, uploads/).
 */
const UPDATABLE_PATHS = ["layout.liquid", "assets", "widgets", "snippets", "screenshot.png"];

/**
 * Check if a theme update is available for a project.
 * Compares the project's current theme version against the theme source version.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string}>} Update availability status
 * @throws {Error} If project not found
 */
export async function checkForUpdates(projectId, userId = "local") {
  const project = projectRepo.getProjectById(projectId, userId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const themeName = project.theme;
  const currentVersion = project.themeVersion;

  // Get the theme's current source version (from latest/ or base theme.json)
  // This is the version that was last built/published, NOT all available versions
  const themeSourceDir = await getThemeSourceDir(themeName, userId);
  const themeJsonPath = path.join(themeSourceDir, "theme.json");

  let sourceVersion = null;
  try {
    const themeData = await fs.readJson(themeJsonPath);
    sourceVersion = themeData.version;
  } catch {
    // Theme doesn't exist or can't be read
  }

  if (!currentVersion || !sourceVersion) {
    return {
      hasUpdate: false,
      currentVersion: currentVersion || "unknown",
      latestVersion: sourceVersion || "unknown",
    };
  }

  const hasUpdate = isNewerVersion(currentVersion, sourceVersion);

  return {
    hasUpdate,
    currentVersion,
    latestVersion: sourceVersion,
  };
}

/**
 * Merge theme.json settings preserving user customizations.
 * Uses the new schema as source of truth for structure while preserving
 * user values for settings that exist in both versions.
 * Settings removed by theme author are dropped; new settings use defaults.
 * @param {object} userThemeJson - User's current theme.json with customized values
 * @param {object} newThemeJson - New theme.json from the theme update
 * @returns {object} Merged theme.json with new structure and preserved user values
 */
export function mergeThemeSettings(userThemeJson, newThemeJson) {
  // Start with the new schema as the base
  const merged = JSON.parse(JSON.stringify(newThemeJson));

  // Merge settings values
  if (userThemeJson.settings && newThemeJson.settings) {
    merged.settings = mergeSettingsObject(userThemeJson.settings, newThemeJson.settings);
  }

  return merged;
}

/**
 * Recursively merge settings objects.
 * Preserves user values for keys that exist in the new schema.
 * @param {object} userSettings - User's settings
 * @param {object} newSettings - New settings from theme
 * @returns {object} - Merged settings
 */
function mergeSettingsObject(userSettings, newSettings) {
  const merged = JSON.parse(JSON.stringify(newSettings));

  // For each key in new settings, check if user has a value
  for (const key of Object.keys(newSettings)) {
    const newValue = newSettings[key];
    const userValue = userSettings[key];

    if (userValue === undefined) {
      // User doesn't have this setting, use new default
      continue;
    }

    if (Array.isArray(newValue)) {
      // This is a settings group (array of setting definitions)
      // Merge individual setting values
      merged[key] = mergeSettingsArray(userValue, newValue);
    } else if (typeof newValue === "object" && newValue !== null) {
      // Nested object, recurse
      merged[key] = mergeSettingsObject(userValue, newValue);
    } else {
      // Primitive value - keep user's value
      merged[key] = userValue;
    }
  }

  return merged;
}

/**
 * Merge settings arrays (preserving user values for matching setting IDs).
 * @param {Array} userArray - User's settings array
 * @param {Array} newArray - New settings array from theme
 * @returns {Array} - Merged array
 */
function mergeSettingsArray(userArray, newArray) {
  if (!Array.isArray(userArray)) {
    return newArray;
  }

  // Create a map of user values by setting ID
  const userValuesById = {};
  for (const item of userArray) {
    if (item && item.id) {
      userValuesById[item.id] = item;
    }
  }

  // Merge each item in the new array
  return newArray.map((newItem) => {
    if (!newItem || !newItem.id) {
      return newItem;
    }

    const userItem = userValuesById[newItem.id];
    if (!userItem) {
      // No user value, use new default
      return newItem;
    }

    // Preserve user's value if they have one
    const merged = { ...newItem };
    if (userItem.value !== undefined) {
      merged.value = userItem.value;
    }
    if (userItem.default !== undefined && newItem.default === undefined) {
      // Don't preserve default if new schema removed it
    }

    return merged;
  });
}

/**
 * Apply a theme update to a project.
 * Copies updatable theme files (layout, assets, widgets, snippets), adds new menus
 * and templates without overwriting existing ones, merges theme.json settings,
 * and updates project metadata.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{success: boolean, previousVersion: string, newVersion: string, message?: string}>} Update result
 * @throws {Error} If project not found
 */
export async function applyThemeUpdate(projectId, userId) {
  const project = projectRepo.getProjectById(projectId, userId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const themeName = project.theme;
  const previousVersion = project.themeVersion;

  // Check if update is available
  const updateStatus = await checkForUpdates(projectId, userId);
  if (!updateStatus.hasUpdate) {
    return {
      success: false,
      message: "No update available",
      previousVersion,
      newVersion: previousVersion,
    };
  }

  const projectFolderName = await getProjectFolderName(projectId, userId);
  const projectDir = getProjectDir(projectFolderName, userId);

  // Get theme source directory (latest/ if exists, otherwise root)
  const themeSourceDir = await getThemeSourceDir(themeName, userId);

  console.log(
    `[applyThemeUpdate] Updating project ${projectId} from ${previousVersion} to ${updateStatus.latestVersion}`,
  );

  // 1. Copy updatable paths from theme to project
  for (const itemPath of UPDATABLE_PATHS) {
    const sourcePath = path.join(themeSourceDir, itemPath);
    const targetPath = path.join(projectDir, itemPath);

    try {
      // Check if source exists
      const sourceExists = await fs.pathExists(sourcePath);
      if (!sourceExists) {
        console.log(`[applyThemeUpdate] Skipping ${itemPath} - not in theme`);
        continue;
      }

      // Remove existing target and copy fresh from theme
      await fs.remove(targetPath);
      await fs.copy(sourcePath, targetPath);
      console.log(`[applyThemeUpdate] Updated ${itemPath}`);
    } catch (error) {
      console.warn(`[applyThemeUpdate] Failed to update ${itemPath}: ${error.message}`);
      // Continue with other updates even if one fails
    }
  }

  // 2. Add new menus from theme (don't overwrite existing user menus)
  try {
    const themeMenusDir = path.join(themeSourceDir, "menus");
    const projectMenusDir = path.join(projectDir, "menus");

    if (await fs.pathExists(themeMenusDir)) {
      await fs.ensureDir(projectMenusDir);
      const themeMenuFiles = await fs.readdir(themeMenusDir);

      for (const menuFile of themeMenuFiles) {
        if (!menuFile.endsWith(".json")) continue;

        const projectMenuPath = path.join(projectMenusDir, menuFile);
        const themeMenuPath = path.join(themeMenusDir, menuFile);

        // Only add if it doesn't exist in project (preserve user menus)
        if (!(await fs.pathExists(projectMenuPath))) {
          const menuContent = await fs.readJson(themeMenuPath);
          const menuSlug = path.parse(menuFile).name;

          const enrichedMenu = {
            ...menuContent,
            id: menuSlug,
            uuid: menuContent.uuid || randomUUID(),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };

          await fs.writeJson(projectMenuPath, enrichedMenu, { spaces: 2 });
          console.log(`[applyThemeUpdate] Added new menu: ${menuFile}`);
        }
      }
    }
  } catch (error) {
    console.warn(`[applyThemeUpdate] Failed to add new menus: ${error.message}`);
  }

  // 2b. Add new templates as pages (don't overwrite existing user pages)
  try {
    const themeTemplatesDir = path.join(themeSourceDir, "templates");
    const projectPagesDir = path.join(projectDir, "pages");

    await processTemplatesRecursive(themeTemplatesDir, projectPagesDir, async (template, slug, targetPath) => {
      if (await fs.pathExists(targetPath)) return;
      const newPage = {
        ...template,
        id: slug,
        slug,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      await fs.writeJson(targetPath, newPage, { spaces: 2 });
      console.log(`[applyThemeUpdate] Added new page from template: ${slug}`);
    });
  } catch (error) {
    console.warn(`[applyThemeUpdate] Failed to add new templates: ${error.message}`);
  }

  // 3. Merge theme.json
  try {
    const projectThemeJsonPath = getProjectThemeJsonPath(projectFolderName, userId);
    const newThemeJsonPath = path.join(themeSourceDir, "theme.json");

    const userThemeJson = await fs.readJson(projectThemeJsonPath);
    const newThemeJson = await fs.readJson(newThemeJsonPath);

    const mergedThemeJson = mergeThemeSettings(userThemeJson, newThemeJson);

    await fs.writeJson(projectThemeJsonPath, mergedThemeJson, { spaces: 2 });
    console.log(`[applyThemeUpdate] Merged theme.json`);
  } catch (error) {
    console.warn(`[applyThemeUpdate] Failed to merge theme.json: ${error.message}`);
    // This is more critical, but we still continue
  }

  // 4. Update project metadata
  projectRepo.updateProject(projectId, {
    themeVersion: updateStatus.latestVersion,
    lastThemeUpdateAt: new Date().toISOString(),
    lastThemeUpdateVersion: updateStatus.latestVersion,
    updated: new Date().toISOString(),
  }, userId);

  console.log(`[applyThemeUpdate] Successfully updated project ${projectId} to version ${updateStatus.latestVersion}`);

  return {
    success: true,
    previousVersion,
    newVersion: updateStatus.latestVersion,
  };
}

/**
 * Toggle the receiveThemeUpdates flag for a project.
 * When disabled, the project won't show update notifications.
 * @param {string} projectId - The project's UUID
 * @param {boolean} enabled - Whether to enable theme update notifications
 * @returns {Promise<{success: boolean, receiveThemeUpdates: boolean}>} Result with new flag value
 * @throws {Error} If project not found
 */
export async function toggleThemeUpdates(projectId, enabled, userId = "local") {
  const project = projectRepo.getProjectById(projectId, userId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  projectRepo.updateProject(projectId, {
    receiveThemeUpdates: enabled,
    updated: new Date().toISOString(),
  }, userId);

  return {
    success: true,
    receiveThemeUpdates: enabled,
  };
}
