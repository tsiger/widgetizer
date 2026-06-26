import fs from "fs-extra";
import path from "path";
import { getProjectPagesDir, getProjectThemeJsonPath, getProjectDir } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

const THEME_SETTINGS_USAGE_ID = "global:theme-settings";

/** Upload path prefixes recognised as tracked media assets. */
const UPLOAD_PREFIXES = ["/uploads/images/", "/uploads/files/"];

/**
 * Match upload paths embedded *anywhere* in a string — including a richtext
 * `<img src="/uploads/images/foo-large.jpg">` inside saved HTML — not just a
 * value that *is* a bare upload path. The `.` in the character class lets a
 * match absorb a trailing sentence period in prose (e.g. `…/x.jpg.`); this is
 * intentional parity with master — over-matching only ever marks an asset
 * "used", which is the safe direction.
 */
const EMBEDDED_MEDIA_PATH_RE = /\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+/g;

/** Extract every embedded upload path from a string. */
function extractMediaPathsFromString(value) {
  if (typeof value !== "string") return [];
  return value.match(EMBEDDED_MEDIA_PATH_RE) || [];
}

/**
 * All paths under which a media record may be referenced: its original `path`
 * plus every generated size-variant path. A richtext `<img>` embeds a variant
 * (e.g. `-large`), which only matches its record via the size paths.
 */
function recordMediaPaths(file) {
  const paths = [file.path];
  for (const size of Object.values(file.sizes || {})) {
    if (size?.path) paths.push(size.path);
  }
  return paths.filter(Boolean);
}

/**
 * Recursively collect media paths from a value.
 * Handles strings, plain objects (e.g. link settings with href), and arrays.
 */
function collectMediaPaths(value, mediaPaths) {
  if (typeof value === "string") {
    for (const p of extractMediaPathsFromString(value)) mediaPaths.add(p);
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

  Object.values(globalSettings).forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      // Walk the live value (falling back to the schema default), recursing into
      // arrays/objects via collectMediaPaths so a gallery setting's entry srcs are
      // tracked exactly like page/global/collection settings already are.
      collectMediaPaths(item.value !== undefined ? item.value : item.default, mediaPaths);
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
    if (recordMediaPaths(file).some((p) => mediaPathSet.has(p))) {
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

// ============================================================================
// Collection items (spec Section 8) — source string `collection:{type}/{slug}`.
// Media usage is SQLite metadata keyed by projectId (mediaRepo), exactly like
// pages/globals — NOT scope/storage. Callers pass scope.projectId.
// ============================================================================

/** Build the media-usage source string for a collection item. */
function collectionSource(collectionType, itemSlug) {
  return `collection:${collectionType}/${itemSlug}`;
}

/**
 * Extract tracked upload paths from a collection item's settings (recurses into
 * nested objects/arrays like link settings) plus its SEO social image. Mirrors
 * page/global extraction.
 * @param {object} itemData - raw collection item ({ settings, seo })
 * @returns {string[]} unique media paths
 */
export function extractMediaPathsFromCollectionItem(itemData) {
  const mediaPaths = new Set();
  if (itemData?.settings && typeof itemData.settings === "object") {
    Object.values(itemData.settings).forEach((value) => collectMediaPaths(value, mediaPaths));
  }
  // SEO social image (Finding #12 — parity with page media tracking).
  if (itemData?.seo?.og_image && typeof itemData.seo.og_image === "string") {
    const normalized = normalizeMediaPath(itemData.seo.og_image);
    if (normalized) mediaPaths.add(normalized);
  }
  return Array.from(mediaPaths);
}

/** Full usage refresh for one collection item under `collection:{type}/{slug}`. */
export async function updateCollectionItemMediaUsage(projectId, collectionType, itemSlug, itemData) {
  try {
    const mediaPaths = extractMediaPathsFromCollectionItem(itemData);
    const mediaData = await readMediaFile(projectId);
    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    mediaRepo.updateMediaUsageForSource(projectId, collectionSource(collectionType, itemSlug), matchedFileIds);
    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating collection item media usage (${collectionType}/${itemSlug}):`, error);
    throw error;
  }
}

/** Remove one collection item's source from media usage entirely. */
export async function removeCollectionItemFromMediaUsage(projectId, collectionType, itemSlug) {
  try {
    mediaRepo.updateMediaUsageForSource(projectId, collectionSource(collectionType, itemSlug), []);
    return { success: true };
  } catch (error) {
    console.error(`Error removing collection item from media usage (${collectionType}/${itemSlug}):`, error);
    throw error;
  }
}

/**
 * Keep collection-item media usage in sync after a write. On rename
 * (previousItemSlug !== itemSlug) the old source is removed first.
 */
export async function syncCollectionItemMediaUsageOnWrite(
  projectId,
  collectionType,
  itemSlug,
  itemData,
  previousItemSlug = null,
) {
  if (previousItemSlug && previousItemSlug !== itemSlug) {
    await removeCollectionItemFromMediaUsage(projectId, collectionType, previousItemSlug);
  }
  return updateCollectionItemMediaUsage(projectId, collectionType, itemSlug, itemData);
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
      for (const p of recordMediaPaths(file)) pathToFileId.set(p, file.id);
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

    // Also scan collection items (collections/<type>/<slug>.json). This is the
    // safety-net full rescan; it reads via fs like the page/global/theme scans
    // above (the OSS refresh path is adapter-agnostic). The collection type comes
    // from a directory entry under the per-tenant project root — not request
    // input — and is only ever re-joined under that same root.
    let collectionItemCount = 0;
    const collectionsDir = path.join(getProjectDir(projectFolderName), "collections");
    if (await fs.pathExists(collectionsDir)) {
      const typeEntries = await fs.readdir(collectionsDir, { withFileTypes: true });
      for (const typeEntry of typeEntries) {
        if (!typeEntry.isDirectory()) continue;
        const collectionType = typeEntry.name;
        const typeDir = path.join(collectionsDir, collectionType);
        const itemNames = (await fs.readdir(typeDir)).filter((n) => n.endsWith(".json") && n !== "_order.json");
        for (const itemName of itemNames) {
          const itemSlug = itemName.replace(".json", "");
          try {
            const itemData = JSON.parse(await fs.readFile(path.join(typeDir, itemName), "utf8"));
            addUsageForPaths(
              extractMediaPathsFromCollectionItem(itemData),
              collectionSource(collectionType, itemSlug),
            );
            collectionItemCount++;
          } catch (error) {
            console.warn(
              `Error processing collection item ${collectionType}/${itemSlug} for media usage:`,
              error.message,
            );
          }
        }
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
      message: `Refreshed usage tracking for ${pageFiles.length} pages, ${collectionItemCount} collection items, global widgets, and theme settings`,
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
