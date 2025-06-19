import fs from "fs-extra";
import path from "path";
import { getProjectPagesDir, getProjectMediaJsonPath } from "../config.js";
import { readMediaFile } from "../controllers/mediaController.js";

/**
 * Extract all image paths from page content (widgets and blocks)
 */
function extractImagePathsFromPage(pageData) {
  const imagePaths = new Set();

  if (!pageData.widgets) return Array.from(imagePaths);

  // Helper function to extract images from settings object
  function extractFromSettings(settings) {
    if (!settings) return;

    Object.values(settings).forEach((value) => {
      if (typeof value === "string" && value.startsWith("/uploads/images/")) {
        imagePaths.add(value);
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

  return Array.from(imagePaths);
}

/**
 * Update usage tracking for a specific page
 */
export async function updatePageMediaUsage(projectId, pageId, pageData) {
  try {
    // Extract all image paths from the page
    const imagePaths = extractImagePathsFromPage(pageData);

    // Read current media data
    const mediaData = await readMediaFile(projectId);

    // First, remove this page from all media files' usedIn arrays
    mediaData.files.forEach((file) => {
      if (file.usedIn) {
        file.usedIn = file.usedIn.filter((slug) => slug !== pageId);
      }
    });

    // Then, add this page to the usedIn array of files that are actually used
    imagePaths.forEach((imagePath) => {
      const file = mediaData.files.find((f) => f.path === imagePath);
      if (file) {
        if (!file.usedIn) {
          file.usedIn = [];
        }
        if (!file.usedIn.includes(pageId)) {
          file.usedIn.push(pageId);
        }
      }
    });

    // Write updated media data
    const mediaFilePath = getProjectMediaJsonPath(projectId);
    await fs.outputFile(mediaFilePath, JSON.stringify(mediaData, null, 2));

    return { success: true, imagePaths };
  } catch (error) {
    console.error("Error updating page media usage:", error);
    throw error;
  }
}

/**
 * Remove a page from all media usage tracking
 */
export async function removePageFromMediaUsage(projectId, pageId) {
  try {
    const mediaData = await readMediaFile(projectId);

    // Remove the page from all usedIn arrays
    mediaData.files.forEach((file) => {
      if (file.usedIn) {
        file.usedIn = file.usedIn.filter((slug) => slug !== pageId);
      }
    });

    // Write updated media data
    const mediaFilePath = getProjectMediaJsonPath(projectId);
    await fs.outputFile(mediaFilePath, JSON.stringify(mediaData, null, 2));

    return { success: true };
  } catch (error) {
    console.error("Error removing page from media usage:", error);
    throw error;
  }
}

/**
 * Get pages that use a specific media file
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
 * Refresh media usage for all pages in a project
 */
export async function refreshAllMediaUsage(projectId) {
  try {
    const pagesDir = getProjectPagesDir(projectId);

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

        // Extract image paths and update usage
        const imagePaths = extractImagePathsFromPage(pageData);
        imagePaths.forEach((imagePath) => {
          const file = mediaData.files.find((f) => f.path === imagePath);
          if (file) {
            if (!file.usedIn.includes(pageId)) {
              file.usedIn.push(pageId);
            }
          }
        });
      } catch (error) {
        console.error(`Error processing page ${pageId}:`, error);
      }
    }

    // Write updated media data
    const mediaFilePath = getProjectMediaJsonPath(projectId);
    await fs.outputFile(mediaFilePath, JSON.stringify(mediaData, null, 2));

    return {
      success: true,
      message: `Refreshed usage tracking for ${pageFiles.length} pages`,
    };
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    throw error;
  }
}
