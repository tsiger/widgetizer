import fs from "fs-extra";
import path from "path";
import { getProjectPagesDir, getProjectThemeJsonPath } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

const THEME_SETTINGS_USAGE_ID = "global:theme-settings";

/** Upload path prefixes recognised as tracked media assets. */
const UPLOAD_PREFIXES = ["/uploads/images/", "/uploads/files/"];

/** Check whether a string value is a tracked media upload path. */
function isMediaPath(value) {
  return typeof value === "string" && UPLOAD_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Recursively collect media paths from a value.
 * Handles strings, plain objects (e.g. link settings with href), and arrays.
 */
function collectMediaPaths(value, mediaPaths) {
  if (typeof value === "string") {
    if (isMediaPath(value)) mediaPaths.add(value);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const v of Object.values(value)) {
      collectMediaPaths(v, mediaPaths);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectMediaPaths(item, mediaPaths);
    }
  }
}

/** Normalise a potentially relative upload path to its absolute form. */
function normalizeMediaPath(value) {
  if (typeof value !== "string") return null;
  for (const prefix of UPLOAD_PREFIXES) {
    if (value.startsWith(prefix)) return value;
    // Handle relative paths without leading slash
    const rel = prefix.slice(1); // "uploads/images/"
    if (value.startsWith(rel)) return "/" + value;
  }
  return null;
}

/**
 * Extract all media paths from page content.
 * Scans all widget settings and block settings for upload paths.
 * @param {object} pageData - Page data object containing widgets
 * @returns {string[]} Array of unique media paths found (e.g., '/uploads/images/photo.jpg')
 */
function extractMediaPathsFromPage(pageData) {
  const mediaPaths = new Set();

  // Check SEO social media image (og_image)
  if (pageData.seo?.og_image && typeof pageData.seo.og_image === "string") {
    const normalized = normalizeMediaPath(pageData.seo.og_image);
    if (normalized) mediaPaths.add(normalized);
  }

  if (!pageData.widgets) return Array.from(mediaPaths);

  // Helper function to extract media from settings object (recurses into objects like link settings)
  function extractFromSettings(settings) {
    if (!settings) return;

    Object.values(settings).forEach((value) => {
      collectMediaPaths(value, mediaPaths);
    });
  }

  // Scan all widgets
  Object.values(pageData.widgets).forEach((widget) => {
    // Extract from widget settings
    extractFromSettings(widget.settings);

    // Extract from blocks if they exist
    if (widget.blocks) {
      Object.values(widget.blocks).forEach((block) => {
        extractFromSettings(block.settings);
      });
    }
  });

  return Array.from(mediaPaths);
}

/**
 * Extract all media paths from a global widget (header/footer).
 * @param {object} widgetData - Widget data object containing settings and blocks
 * @returns {string[]} Array of unique media paths found
 */
function extractMediaPathsFromGlobalWidget(widgetData) {
  const mediaPaths = new Set();

  function extractFromSettings(settings) {
    if (!settings) return;

    Object.values(settings).forEach((value) => {
      collectMediaPaths(value, mediaPaths);
    });
  }

  // Extract from main settings
  if (widgetData.settings) {
    extractFromSettings(widgetData.settings);
  }

  // Extract from blocks if they exist
  if (widgetData.blocks) {
    Object.values(widgetData.blocks).forEach((block) => {
      extractFromSettings(block.settings);
    });
  }

  return Array.from(mediaPaths);
}

/**
 * Extract all media paths from theme settings (e.g. favicon, any image type in settings.global).
 * @param {object} themeData - Theme data object (theme.json shape) with settings.global
 * @returns {string[]} Array of unique media paths found
 */
function extractMediaPathsFromThemeSettings(themeData) {
  const mediaPaths = new Set();
  const globalSettings = themeData?.settings?.global;
  if (!globalSettings || typeof globalSettings !== "object") return Array.from(mediaPaths);

  function addIfMediaPath(value) {
    const normalized = normalizeMediaPath(value);
    if (normalized) mediaPaths.add(normalized);
  }

  Object.values(globalSettings).forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (item.value !== undefined) addIfMediaPath(item.value);
      else if (item.default !== undefined && typeof item.default === "string") addIfMediaPath(item.default);
    });
  });

  return Array.from(mediaPaths);
}

/**
 * Find file IDs from media files whose paths match the given media paths.
 * @param {Array<object>} files - Media files with id and path
 * @param {string[]} mediaPaths - Media paths to match
 * @returns {string[]} Array of matching file IDs
 */
function findFileIdsByPaths(files, mediaPaths) {
  const mediaPathSet = new Set(mediaPaths);
  const matchedIds = [];
  for (const file of files) {
    if (file.path && mediaPathSet.has(file.path)) {
      matchedIds.push(file.id);
    }
  }
  return matchedIds;
}

/**
 * Update media usage tracking for theme settings (e.g. favicon).
 * @param {string} projectId - The project's UUID
 * @param {object} themeData - Theme data object (theme.json shape) with settings.global
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>}
 */
export async function updateThemeSettingsMediaUsage(projectId, themeData) {
  try {
    const mediaPaths = extractMediaPathsFromThemeSettings(themeData);
    const mediaData = await readMediaFile(projectId);

    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    mediaRepo.updateMediaUsageForSource(projectId, THEME_SETTINGS_USAGE_ID, matchedFileIds);

    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating theme settings media usage (projectId: ${projectId}):`, error);
    throw error;
  }
}

/**
 * Update media usage tracking for a specific page.
 * Removes the page from all media files' usedIn arrays, then re-adds it
 * only to files that are actually referenced in the page content.
 * @param {string} projectId - The project's UUID
 * @param {string} pageId - The page's slug/identifier
 * @param {object} pageData - Page data object containing widgets
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>} Result with extracted media paths
 * @throws {Error} If media file read/write fails
 */
export async function updatePageMediaUsage(projectId, pageId, pageData) {
  try {
    const mediaPaths = extractMediaPathsFromPage(pageData);
    const mediaData = await readMediaFile(projectId);

    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    mediaRepo.updateMediaUsageForSource(projectId, pageId, matchedFileIds);

    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating page media usage (projectId: ${projectId}, pageId: ${pageId}):`, error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Update media usage tracking for a global widget (header/footer).
 * Uses 'global:{id}' format for the usage identifier.
 * @param {string} projectId - The project's UUID
 * @param {string} globalId - Global widget identifier (e.g., 'header' or 'global:header')
 * @param {object} widgetData - Widget data object containing settings and blocks
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>} Result with extracted media paths
 * @throws {Error} If media file read/write fails
 */
export async function updateGlobalWidgetMediaUsage(projectId, globalId, widgetData) {
  try {
    const mediaPaths = extractMediaPathsFromGlobalWidget(widgetData);
    const usageId = globalId.startsWith("global:") ? globalId : `global:${globalId}`;
    const mediaData = await readMediaFile(projectId);

    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    mediaRepo.updateMediaUsageForSource(projectId, usageId, matchedFileIds);

    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating global widget media usage (projectId: ${projectId}, globalId: ${globalId}):`, error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Remove a page from all media usage tracking.
 * Called when a page is deleted to clean up usage references.
 * @param {string} projectId - The project's UUID
 * @param {string} pageId - The page's slug/identifier to remove
 * @returns {Promise<{success: boolean}>} Success result
 * @throws {Error} If media file read/write fails
 */
export async function removePageFromMediaUsage(projectId, pageId) {
  try {
    // Remove all usage rows for this page (no fileIds = nothing to re-add)
    mediaRepo.updateMediaUsageForSource(projectId, pageId, []);

    return { success: true };
  } catch (error) {
    console.error("Error removing page from media usage:", error);
    throw error;
  }
}

/**
 * Keep page media usage in sync after a page write or rename.
 * @param {string} projectId - The project's UUID
 * @param {string} pageId - The current page slug/identifier
 * @param {object} pageData - Page data object containing widgets
 * @param {string|null} [previousPageId=null] - Prior slug when the page was renamed
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>}
 */
export async function syncPageMediaUsageOnWrite(projectId, pageId, pageData, previousPageId = null) {
  if (previousPageId && previousPageId !== pageId) {
    await removePageFromMediaUsage(projectId, previousPageId);
  }

  return updatePageMediaUsage(projectId, pageId, pageData);
}

/**
 * Keep page media usage in sync after a page delete.
 * @param {string} projectId - The project's UUID
 * @param {string} pageId - The deleted page slug/identifier
 * @returns {Promise<{success: boolean}>}
 */
export async function syncPageMediaUsageOnDelete(projectId, pageId) {
  return removePageFromMediaUsage(projectId, pageId);
}

/**
 * Get usage information for a specific media file.
 * @param {string} projectId - The project's UUID
 * @param {string} fileId - The media file's unique identifier
 * @returns {Promise<{fileId: string, filename: string, usedIn: string[], isInUse: boolean}>} Usage details
 * @throws {Error} If file not found or media file read fails
 */
export async function getMediaUsage(projectId, fileId) {
  try {
    const file = mediaRepo.getMediaFileById(projectId, fileId);

    if (!file) {
      throw new Error("File not found");
    }

    return {
      fileId,
      filename: file.filename,
      usedIn: file.usedIn || [],
      isInUse: (file.usedIn || []).length > 0,
    };
  } catch (error) {
    console.error("Error getting media usage:", error);
    throw error;
  }
}

/**
 * Refresh media usage tracking for all pages and global widgets in a project.
 * Resets all usedIn arrays and rebuilds them by scanning all page and global widget content.
 * Useful for repairing corrupted usage data or after bulk operations.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{success: boolean, message: string}>} Result with summary message
 * @throws {Error} If media file read/write fails
 */
export async function refreshAllMediaUsage(projectId) {
  try {
    const projectFolderName = await getProjectFolderName(projectId);
    const pagesDir = getProjectPagesDir(projectFolderName);

    // Check if pages directory exists
    if (!(await fs.pathExists(pagesDir))) {
      return { success: true, message: "No pages directory found" };
    }

    // Read all media files to build a path → fileId lookup
    const mediaData = await readMediaFile(projectId);
    const pathToFileId = new Map();
    for (const file of mediaData.files) {
      if (file.path) pathToFileId.set(file.path, file.id);
    }

    // Fresh usage map: fileId → Set<usageId>
    const usageMap = new Map();
    for (const file of mediaData.files) {
      usageMap.set(file.id, new Set());
    }

    // Helper to add usage entries by matching media paths to file IDs
    function addUsageForPaths(mediaPaths, usageId) {
      for (const mediaPath of mediaPaths) {
        const fileId = pathToFileId.get(mediaPath);
        if (fileId && usageMap.has(fileId)) {
          usageMap.get(fileId).add(usageId);
        }
      }
    }

    // Get all page files
    const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageFiles = allEntries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "global",
    );

    // Process each page
    for (const fileEntry of pageFiles) {
      const pageId = fileEntry.name.replace(".json", "");
      const pagePath = path.join(pagesDir, fileEntry.name);

      try {
        const pageContent = await fs.readFile(pagePath, "utf8");
        const pageData = JSON.parse(pageContent);
        addUsageForPaths(extractMediaPathsFromPage(pageData), pageId);
      } catch (error) {
        console.warn(`Error processing page ${pageId} for media usage:`, error.message);
      }
    }

    // Also scan global widgets (header and footer)
    const globalWidgetsDir = path.join(pagesDir, "global");
    if (await fs.pathExists(globalWidgetsDir)) {
      for (const fileName of ["header.json", "footer.json"]) {
        const globalFilePath = path.join(globalWidgetsDir, fileName);
        if (await fs.pathExists(globalFilePath)) {
          try {
            const globalContent = await fs.readFile(globalFilePath, "utf8");
            const globalData = JSON.parse(globalContent);
            const globalId = `global:${fileName.replace(".json", "")}`;
            addUsageForPaths(extractMediaPathsFromGlobalWidget(globalData), globalId);
          } catch (error) {
            console.warn(`Error processing global widget ${fileName} for media usage:`, error.message);
          }
        }
      }
    }

    // Also scan theme settings (e.g. favicon in settings.global.branding)
    const themeJsonPath = getProjectThemeJsonPath(projectFolderName);
    if (await fs.pathExists(themeJsonPath)) {
      try {
        const themeContent = await fs.readFile(themeJsonPath, "utf8");
        const themeData = JSON.parse(themeContent);
        addUsageForPaths(extractMediaPathsFromThemeSettings(themeData), THEME_SETTINGS_USAGE_ID);
      } catch (error) {
        console.warn("Error processing theme settings for media usage:", error.message);
      }
    }

    // Convert Sets to arrays and write via replaceMediaUsage (only touches media_usage table)
    const finalUsageMap = new Map();
    for (const [fileId, usageSet] of usageMap) {
      finalUsageMap.set(fileId, Array.from(usageSet));
    }
    mediaRepo.replaceMediaUsage(projectId, finalUsageMap);

    return {
      success: true,
      message: `Refreshed usage tracking for ${pageFiles.length} pages, global widgets, and theme settings`,
    };
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    throw error;
  }
}

/**
 * Rebuild media usage after non-editor flows that can bypass targeted updates.
 * This covers imports, duplication, theme updates, and any future bulk file sync.
 * @param {string} projectId - The project's UUID
 * @param {string} [context="bulk operation"] - Log context for failures
 * @returns {Promise<{success: boolean, message: string}|null>}
 */
export async function refreshMediaUsageAfterStructuralChange(projectId, context = "bulk operation") {
  try {
    return await refreshAllMediaUsage(projectId);
  } catch (error) {
    console.warn(`[mediaUsage] Failed to refresh after ${context}: ${error.message}`);
    return null;
  }
}
