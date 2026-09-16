import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectDir } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

const THEME_SETTINGS_USAGE_ID = "global:theme-settings";
const SITE_IDENTITY_USAGE_ID = "global:site-identity";

/**
 * Usage rows are keyed by stable identity, never by a slug: the same slug will exist
 * once per language, and a rename must not orphan a row or steal another page's.
 * Globals are keyed by the folder they live in — `root` today, a language code later.
 */
export const usageSource = {
  page: (uuid) => `page:${uuid}`,
  item: (uuid) => `collection:${uuid}`,
  global: (type) => `global:root:${String(type).replace(/^global:(root:)?/, "")}`,
  // Used only when a uuid could not be written to the file (read-only working dir).
  // The `slug:` marker keeps it distinguishable, so the migration can be retried and
  // the row retired once the content does get a uuid.
  pendingPage: (slug) => `page:slug:${slug}`,
  pendingItem: (collectionType, slug) => `collection:slug:${collectionType}/${slug}`,
};

/**
 * The row a page is keyed by: its uuid when it has one, else its pending slug id.
 * Takes a bare uuid (what most callers hold) or the page itself.
 * @param {string|{uuid?: string, slug?: string}} page
 * @returns {string|null} null when there is nothing to key a row by
 */
export function pageUsageSource(page) {
  if (typeof page === "string") return page ? usageSource.page(page) : null;
  if (page?.uuid) return usageSource.page(page.uuid);
  return page?.slug ? usageSource.pendingPage(page.slug) : null;
}

/**
 * Same for a collection item; the pending id needs the collection type, since two
 * collections can hold the same slug.
 * @param {string|{uuid?: string, slug?: string}} item
 * @param {string|null} [collectionType]
 * @returns {string|null} null when there is nothing to key a row by
 */
export function itemUsageSource(item, collectionType = null) {
  if (typeof item === "string") return item ? usageSource.item(item) : null;
  if (item?.uuid) return usageSource.item(item.uuid);
  return collectionType && item?.slug ? usageSource.pendingItem(collectionType, item.slug) : null;
}

/**
 * Rows that are not (yet) identity-based: written before the change (bare slug,
 * `collection:type/slug`, `global:header`), or a pending fallback from a rebuild that
 * could not stamp a uuid. Both mean "rebuild me again when you get the chance".
 */
function isLegacyUsageSource(source) {
  if (typeof source !== "string") return true;
  if (source === THEME_SETTINGS_USAGE_ID || source === SITE_IDENTITY_USAGE_ID) return false;
  if (source.startsWith("page:slug:") || source.startsWith("collection:slug:")) return true;
  if (source.startsWith("page:")) return false;
  if (source.startsWith("collection:")) return source.includes("/");
  return !source.startsWith("global:root:");
}

/** Upload path prefixes recognised as tracked media assets. */
const UPLOAD_PREFIXES = ["/uploads/images/", "/uploads/files/"];

/**
 * Match upload paths embedded *anywhere* in a string — including a richtext
 * `<img src="/uploads/images/foo-large.jpg">` inside saved HTML — not just a
 * value that *is* a bare upload path. The `.` in the character class lets a
 * match absorb a trailing sentence period in prose (e.g. `…/x.jpg.`);
 * over-matching only ever marks an asset "used", which is the safe direction.
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

function extractMediaPathsFromSiteIdentity(identity) {
  const logo = normalizeMediaPath(identity?.logo);
  return logo ? [logo] : [];
}

/**
 * Update media usage tracking for the project's business details (the identity logo).
 * @param {string} projectId - The project's UUID
 * @param {object} identity - The stored site identity
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>}
 */
export async function updateSiteIdentityMediaUsage(projectId, identity) {
  try {
    const mediaPaths = extractMediaPathsFromSiteIdentity(identity);
    const mediaData = await readMediaFile(projectId);
    mediaRepo.updateMediaUsageForSource(projectId, SITE_IDENTITY_USAGE_ID, findFileIdsByPaths(mediaData.files, mediaPaths));
    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating business details media usage (projectId: ${projectId}):`, error);
    throw error;
  }
}

/**
 * Update media usage tracking for a specific page.
 * Removes the page from all media files' usedIn arrays, then re-adds it
 * only to files that are actually referenced in the page content.
 * @param {string} projectId - The project's UUID
 * @param {string|null} pageUuid - The page's stable uuid, or null/undefined if it has none yet
 * @param {object} pageData - Page data object containing widgets
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>} Result with extracted media paths
 * @throws {Error} If media file read/write fails
 */
export async function updatePageMediaUsage(projectId, pageUuid, pageData) {
  try {
    const mediaPaths = extractMediaPathsFromPage(pageData);
    const mediaData = await readMediaFile(projectId);

    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    const source = pageUsageSource(pageUuid || pageData);
    if (!source) {
      console.warn(`Page has neither uuid nor slug; media usage not recorded (project ${projectId})`);
      return { success: false, mediaPaths };
    }
    mediaRepo.updateMediaUsageForSource(projectId, source, matchedFileIds);
    // A real uuid supersedes any row a read-only rebuild left under the slug.
    if (pageUuid && pageData?.slug) {
      mediaRepo.updateMediaUsageForSource(projectId, usageSource.pendingPage(pageData.slug), []);
    }

    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating page media usage (projectId: ${projectId}, page: ${pageUuid}):`, error);
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
    const usageId = usageSource.global(globalId);
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
 * @param {string|{uuid?: string, slug?: string}} page - The deleted page's uuid, or the page
 * @returns {Promise<{success: boolean}>} Success result
 * @throws {Error} If media file read/write fails
 */
export async function removePageFromMediaUsage(projectId, page) {
  try {
    // Remove all usage rows for this page (no fileIds = nothing to re-add). A page with
    // no uuid was recorded under its pending slug id, so clear that row instead.
    const source = pageUsageSource(page);
    if (source) mediaRepo.updateMediaUsageForSource(projectId, source, []);

    return { success: true };
  } catch (error) {
    console.error("Error removing page from media usage:", error);
    throw error;
  }
}

/**
 * Keep page media usage in sync after a page write. A rename keeps the page's uuid,
 * so there is no previous source left behind to clean up.
 * @param {string} projectId - The project's UUID
 * @param {object} pageData - Page data object containing widgets (and its uuid)
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>}
 */
export async function syncPageMediaUsageOnWrite(projectId, pageData) {
  return updatePageMediaUsage(projectId, pageData?.uuid, pageData);
}

/**
 * Keep page media usage in sync after a page delete.
 * @param {string} projectId - The project's UUID
 * @param {string|{uuid?: string, slug?: string}} page - The deleted page's uuid, or the page
 * @returns {Promise<{success: boolean}>}
 */
export async function syncPageMediaUsageOnDelete(projectId, page) {
  return removePageFromMediaUsage(projectId, page);
}

// ============================================================================
// Collection items — source string `collection:{uuid}`.
// Media usage is SQLite metadata keyed by projectId (mediaRepo), exactly like
// pages/globals — NOT scope/storage. Callers pass scope.projectId.
// ============================================================================

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
  // SEO social image, at parity with page media tracking.
  if (itemData?.seo?.og_image && typeof itemData.seo.og_image === "string") {
    const normalized = normalizeMediaPath(itemData.seo.og_image);
    if (normalized) mediaPaths.add(normalized);
  }
  return Array.from(mediaPaths);
}

/**
 * Full usage refresh for one collection item under `collection:{uuid}`, or — while the
 * item has no uuid — under its pending slug id, which needs `collectionType`.
 */
export async function updateCollectionItemMediaUsage(projectId, itemData, collectionType = null) {
  const itemUuid = itemData?.uuid;
  try {
    const mediaPaths = extractMediaPathsFromCollectionItem(itemData);
    const mediaData = await readMediaFile(projectId);
    const matchedFileIds = findFileIdsByPaths(mediaData.files, mediaPaths);
    const source = itemUsageSource(itemData, collectionType);
    if (!source) {
      console.warn(`Collection item has no uuid and no known type; media usage not recorded (${itemData?.slug})`);
      return { success: false, mediaPaths };
    }
    mediaRepo.updateMediaUsageForSource(projectId, source, matchedFileIds);
    // A real uuid supersedes any row a read-only rebuild left under the slug.
    if (itemUuid && collectionType && itemData?.slug) {
      mediaRepo.updateMediaUsageForSource(projectId, usageSource.pendingItem(collectionType, itemData.slug), []);
    }
    return { success: true, mediaPaths };
  } catch (error) {
    console.error(`Error updating collection item media usage (${itemUuid}):`, error);
    throw error;
  }
}

/**
 * Remove one collection item's source from media usage entirely.
 * @param {string} projectId
 * @param {string|{uuid?: string, slug?: string}} item - the item's uuid, or the item
 * @param {string|null} [collectionType] - needed to clear a pending (slug-keyed) row
 */
export async function removeCollectionItemFromMediaUsage(projectId, item, collectionType = null) {
  try {
    const source = itemUsageSource(item, collectionType);
    if (source) mediaRepo.updateMediaUsageForSource(projectId, source, []);
    return { success: true };
  } catch (error) {
    console.error(`Error removing collection item from media usage (${item?.slug ?? item}):`, error);
    throw error;
  }
}

/**
 * Keep collection-item media usage in sync after a write. A rename keeps the item's
 * uuid, so there is no previous source left behind to clean up.
 */
export async function syncCollectionItemMediaUsageOnWrite(projectId, itemData, collectionType = null) {
  return updateCollectionItemMediaUsage(projectId, itemData, collectionType);
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
 * Refresh media usage tracking for a project, reading content from an explicit
 * project working directory. Resets all usedIn arrays and rebuilds them by scanning
 * the project's pages, global widgets, theme settings, and collection items under
 * `projectDir`. `projectId` keys only the DB reads/writes (media + media_usage), so
 * any shell can drive it by supplying the right working dir — OSS getProjectDir(folder),
 * or hosted's per-user CloudStorageAdapter.getProjectBase(scope).
 * @param {{ projectId: string, projectDir: string }} args
 * @returns {Promise<{success: boolean, message: string}>} Result with summary message
 * @throws {Error} If media file read/write fails
 */
export async function refreshAllMediaUsageFromDir({ projectId, projectDir }) {
  try {
    const pagesDir = path.join(projectDir, "pages");

    // The pages dir may be absent on a collections-only or freshly-imported
    // project. Don't early-return on it — theme settings and collection items
    // live under the project dir (independent of pages/) and must still be
    // scanned + rewritten via replaceMediaUsage. Only the page scan is gated.
    const pagesExist = await fs.pathExists(pagesDir);

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

    // A file written before uuids existed gets one now, so its usage identity is the
    // same before and after its next save. Without this the rebuild would have to invent
    // a fallback id that a later save would leave behind as a stale "in use" row.
    async function identityOf(filePath, data, fallback) {
      if (data?.uuid) return data.uuid;
      const uuid = randomUUID();
      // Write a sibling temp file and rename over the original: a partial write (a full
      // disk, say) then leaves the content file untouched instead of truncating it.
      const tempPath = `${filePath}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(tempPath, JSON.stringify({ ...data, uuid }, null, 2));
        await fs.rename(tempPath, filePath);
        return uuid;
      } catch (error) {
        await fs.remove(tempPath).catch(() => {});
        // Read-only working dir: keep a pending id so the migration is retried later.
        console.warn(`Could not stamp a uuid on ${filePath}: ${error.message}`);
        return fallback;
      }
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

    // Process each page (skipped when pages/ is absent — globals/theme/collections
    // below still run).
    let pageCount = 0;
    if (pagesExist) {
      const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });
      const pageFiles = allEntries.filter(
        (entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "global",
      );
      pageCount = pageFiles.length;

      for (const fileEntry of pageFiles) {
        const pageId = fileEntry.name.replace(".json", "");
        const pagePath = path.join(pagesDir, fileEntry.name);

        try {
          const pageContent = await fs.readFile(pagePath, "utf8");
          const pageData = JSON.parse(pageContent);
          const identity = await identityOf(pagePath, pageData, null);
          addUsageForPaths(
            extractMediaPathsFromPage(pageData),
            identity ? usageSource.page(identity) : usageSource.pendingPage(pageId),
          );
        } catch (error) {
          console.warn(`Error processing page ${pageId} for media usage:`, error.message);
        }
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
            const globalId = usageSource.global(fileName.replace(".json", ""));
            addUsageForPaths(extractMediaPathsFromGlobalWidget(globalData), globalId);
          } catch (error) {
            console.warn(`Error processing global widget ${fileName} for media usage:`, error.message);
          }
        }
      }
    }

    // Also scan theme settings (e.g. favicon in settings.global.branding)
    const themeJsonPath = path.join(projectDir, "theme.json");
    if (await fs.pathExists(themeJsonPath)) {
      try {
        const themeContent = await fs.readFile(themeJsonPath, "utf8");
        const themeData = JSON.parse(themeContent);
        addUsageForPaths(extractMediaPathsFromThemeSettings(themeData), THEME_SETTINGS_USAGE_ID);
      } catch (error) {
        console.warn("Error processing theme settings for media usage:", error.message);
      }
    }

    // Business details live on the project row, not under projectDir.
    try {
      addUsageForPaths(
        extractMediaPathsFromSiteIdentity(projectRepo.getProjectById(projectId)?.siteIdentity),
        SITE_IDENTITY_USAGE_ID,
      );
    } catch (error) {
      console.warn("Error processing business details for media usage:", error.message);
    }

    // Also scan collection items (collections/<type>/<slug>.json). This is the
    // safety-net full rescan; it reads via fs like the page/global/theme scans
    // above (the OSS refresh path is adapter-agnostic). The collection type comes
    // from a directory entry under the per-tenant project root — not request
    // input — and is only ever re-joined under that same root.
    let collectionItemCount = 0;
    const collectionsDir = path.join(projectDir, "collections");
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
            const itemPath = path.join(typeDir, itemName);
            const itemData = JSON.parse(await fs.readFile(itemPath, "utf8"));
            const identity = await identityOf(itemPath, itemData, null);
            addUsageForPaths(
              extractMediaPathsFromCollectionItem(itemData),
              // The pending id keeps the collection type: two types can hold the same slug.
              identity ? usageSource.item(identity) : usageSource.pendingItem(collectionType, itemSlug),
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
      message: `Refreshed usage tracking for ${pageCount} pages, ${collectionItemCount} collection items, global widgets, and theme settings`,
    };
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    throw error;
  }
}

/**
 * Refresh media usage for a project by folderName — resolves the OSS on-disk working
 * dir via the global config helper, then delegates to the dir-explicit core. Used by
 * the OSS structural-change callers (project create/duplicate/import, theme updates);
 * hosted and the Refresh-Usage handler call the core with their own working dir.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{success: boolean, message: string}>} Result with summary message
 * @throws {Error} If media file read/write fails
 */
export async function refreshAllMediaUsage(projectId) {
  const projectFolderName = await getProjectFolderName(projectId);
  return refreshAllMediaUsageFromDir({ projectId, projectDir: getProjectDir(projectFolderName) });
}

// One check per project per process: the rebuild is only ever needed once.
const usageFormatChecked = new Set();

/**
 * Rebuild a project's usage rows once if any still carry the old slug-based ids.
 * Usage is derived data, so rebuilding it from content is safer than a migration that
 * would have to guess which uuid an old `about` or `collection:news/story` row meant.
 * Takes the caller's working dir for the same reason `refreshMediaUsage` does: under a
 * shell that namespaces content per actor, the OSS-global path is the wrong (empty)
 * directory, and a rescan there would wipe every usage row instead of rebuilding it.
 * @param {{ projectId: string, projectDir: string }} args
 * @returns {Promise<void>}
 */
export async function ensureUsageSourceFormat({ projectId, projectDir }) {
  if (!projectId || !projectDir || usageFormatChecked.has(projectId)) return;
  usageFormatChecked.add(projectId);
  try {
    const mediaData = await readMediaFile(projectId);
    if (mediaData.files.some((file) => (file.usedIn || []).some(isLegacyUsageSource))) {
      await refreshAllMediaUsageFromDir({ projectId, projectDir });

      // Pending rows mean the rebuild could not write uuids (read-only dir). Leave the
      // project unmarked so the next attempt retries instead of settling for them.
      const rebuilt = await readMediaFile(projectId);
      if (rebuilt.files.some((file) => (file.usedIn || []).some(isLegacyUsageSource))) {
        usageFormatChecked.delete(projectId);
      }
    }
  } catch (error) {
    usageFormatChecked.delete(projectId);
    console.warn(`[mediaUsage] Could not rebuild legacy usage rows: ${error.message}`);
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
