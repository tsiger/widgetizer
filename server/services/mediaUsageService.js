import fs from "fs-extra";
import path from "path";
import { getProjectPagesDir, getProjectThemeJsonPath } from "../config.js";
import { readMediaFile, writeMediaFile, atomicUpdateMediaFile } from "../controllers/mediaController.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

const THEME_SETTINGS_USAGE_ID = "global:theme-settings";

/**
 * Extract all media paths (images, videos, audios) from page content.
 * Scans all widget settings and block settings for upload paths.
 * @param {object} pageData - Page data object containing widgets
 * @returns {string[]} Array of unique media paths found (e.g., '/uploads/images/photo.jpg')
 */
function extractMediaPathsFromPage(pageData) {
  const mediaPaths = new Set();

  // Check SEO social media image (og_image)
  if (pageData.seo?.og_image && typeof pageData.seo.og_image === "string") {
    const ogImage = pageData.seo.og_image;
    // Handle both absolute paths (/uploads/...) and relative paths (uploads/...)
    if (ogImage.startsWith("/uploads/images/")) {
      mediaPaths.add(ogImage);
    } else if (ogImage.startsWith("uploads/images/")) {
      mediaPaths.add("/" + ogImage);
    }
  }

  if (!pageData.widgets) return Array.from(mediaPaths);

  // Helper function to extract media from settings object
  function extractFromSettings(settings) {
    if (!settings) return;

    Object.values(settings).forEach((value) => {
      // Track images, videos, and audios
      if (
        typeof value === "string" &&
        (value.startsWith("/uploads/images/") ||
          value.startsWith("/uploads/videos/") ||
          value.startsWith("/uploads/audios/"))
      ) {
        mediaPaths.add(value);
      }
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
      if (
        typeof value === "string" &&
        (value.startsWith("/uploads/images/") ||
          value.startsWith("/uploads/videos/") ||
          value.startsWith("/uploads/audios/"))
      ) {
        mediaPaths.add(value);
      }
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
    if (typeof value !== "string") return;
    if (
      value.startsWith("/uploads/images/") ||
      value.startsWith("/uploads/videos/") ||
      value.startsWith("/uploads/audios/")
    ) {
      mediaPaths.add(value);
    } else if (
      value.startsWith("uploads/images/") ||
      value.startsWith("uploads/videos/") ||
      value.startsWith("uploads/audios/")
    ) {
      mediaPaths.add("/" + value);
    }
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
 * Update media usage tracking for theme settings (e.g. favicon).
 * @param {string} projectId - The project's UUID
 * @param {object} themeData - Theme data object (theme.json shape) with settings.global
 * @returns {Promise<{success: boolean, mediaPaths: string[]}>}
 */
export async function updateThemeSettingsMediaUsage(projectId, themeData) {
  try {
    const mediaPaths = extractMediaPathsFromThemeSettings(themeData);

    await atomicUpdateMediaFile(projectId, (mediaData) => {
      mediaData.files.forEach((file) => {
        if (file.usedIn) {
          file.usedIn = file.usedIn.filter((slug) => slug !== THEME_SETTINGS_USAGE_ID);
        }
      });
      mediaPaths.forEach((mediaPath) => {
        const file = mediaData.files.find((f) => f.path === mediaPath);
        if (file) {
          if (!file.usedIn) file.usedIn = [];
          if (!file.usedIn.includes(THEME_SETTINGS_USAGE_ID)) file.usedIn.push(THEME_SETTINGS_USAGE_ID);
        }
      });
    });

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

    // Atomic read-modify-write to prevent race conditions with concurrent saves
    await atomicUpdateMediaFile(projectId, (mediaData) => {
      // First, remove this page from all media files' usedIn arrays
      mediaData.files.forEach((file) => {
        if (file.usedIn) {
          file.usedIn = file.usedIn.filter((slug) => slug !== pageId);
        }
      });

      // Then, add this page to the usedIn array of files that are actually used
      mediaPaths.forEach((mediaPath) => {
        const file = mediaData.files.find((f) => f.path === mediaPath);
        if (file) {
          if (!file.usedIn) {
            file.usedIn = [];
          }
          if (!file.usedIn.includes(pageId)) {
            file.usedIn.push(pageId);
          }
        }
      });
    });

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

    // Atomic read-modify-write to prevent race conditions with concurrent saves
    await atomicUpdateMediaFile(projectId, (mediaData) => {
      // Remove old usage
      mediaData.files.forEach((file) => {
        if (file.usedIn) {
          file.usedIn = file.usedIn.filter((slug) => slug !== usageId);
        }
      });

      // Add new usage
      mediaPaths.forEach((mediaPath) => {
        const file = mediaData.files.find((f) => f.path === mediaPath);
        if (file) {
          if (!file.usedIn) {
            file.usedIn = [];
          }
          if (!file.usedIn.includes(usageId)) {
            file.usedIn.push(usageId);
          }
        }
      });
    });

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
    // Atomic read-modify-write to prevent race conditions with concurrent saves
    await atomicUpdateMediaFile(projectId, (mediaData) => {
      mediaData.files.forEach((file) => {
        if (file.usedIn) {
          file.usedIn = file.usedIn.filter((slug) => slug !== pageId);
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing page from media usage:", error);
    throw error;
  }
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
    const mediaData = await readMediaFile(projectId);
    const file = mediaData.files.find((f) => f.id === fileId);

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

    // Reset all usedIn arrays
    const mediaData = await readMediaFile(projectId);
    mediaData.files.forEach((file) => {
      file.usedIn = [];
    });

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

        // Extract media paths and update usage
        const mediaPaths = extractMediaPathsFromPage(pageData);
        mediaPaths.forEach((mediaPath) => {
          const file = mediaData.files.find((f) => f.path === mediaPath);
          if (file) {
            if (!file.usedIn.includes(pageId)) {
              file.usedIn.push(pageId);
            }
          }
        });
      } catch (error) {
        console.warn(`Error processing page ${pageId} for media usage:`, error.message);
      }
    }

    // Also scan global widgets (header and footer)
    const globalWidgetsDir = path.join(pagesDir, "global");
    if (await fs.pathExists(globalWidgetsDir)) {
      const globalWidgetFiles = ["header.json", "footer.json"];

      for (const fileName of globalWidgetFiles) {
        const globalFilePath = path.join(globalWidgetsDir, fileName);
        if (await fs.pathExists(globalFilePath)) {
          try {
            const globalContent = await fs.readFile(globalFilePath, "utf8");
            const globalData = JSON.parse(globalContent);
            const globalId = `global:${fileName.replace(".json", "")}`; // e.g., "global:header"

            // Extract media from global widget settings
            const mediaPaths = extractMediaPathsFromGlobalWidget(globalData);
            mediaPaths.forEach((mediaPath) => {
              const file = mediaData.files.find((f) => f.path === mediaPath);
              if (file) {
                if (!file.usedIn.includes(globalId)) {
                  file.usedIn.push(globalId);
                }
              }
            });
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
        const themeMediaPaths = extractMediaPathsFromThemeSettings(themeData);
        themeMediaPaths.forEach((mediaPath) => {
          const file = mediaData.files.find((f) => f.path === mediaPath);
          if (file) {
            if (!file.usedIn.includes(THEME_SETTINGS_USAGE_ID)) {
              file.usedIn.push(THEME_SETTINGS_USAGE_ID);
            }
          }
        });
      } catch (error) {
        console.warn("Error processing theme settings for media usage:", error.message);
      }
    }

    // Write updated media data (using locked write function to prevent race conditions)
    await writeMediaFile(projectId, mediaData);

    return {
      success: true,
      message: `Refreshed usage tracking for ${pageFiles.length} pages, global widgets, and theme settings`,
    };
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    throw error;
  }
}
