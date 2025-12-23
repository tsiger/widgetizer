import fs from "fs-extra";
import path from "path";
import prettier from "prettier";
import archiver from "archiver";
import { getProjectDir, PUBLISH_DIR } from "../config.js";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { readProjectThemeData } from "./themeController.js";
import { listProjectPagesData, readGlobalWidgetData } from "./pageController.js";
import { readProjectsFile } from "./projectController.js";

// Export history file path
const EXPORT_HISTORY_FILE = path.join(PUBLISH_DIR, "export-history.json");

// Helper function to read export history
async function readExportHistory() {
  try {
    if (await fs.pathExists(EXPORT_HISTORY_FILE)) {
      const data = await fs.readFile(EXPORT_HISTORY_FILE, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Error reading export history:", error);
    return {};
  }
}

// Helper function to write export history
async function writeExportHistory(history) {
  try {
    await fs.ensureDir(PUBLISH_DIR);
    await fs.writeFile(EXPORT_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error("Error writing export history:", error);
    throw error;
  }
}

// Helper function to get next version number for a project
async function getNextVersion(projectId) {
  const history = await readExportHistory();
  if (!history[projectId]) {
    return 1;
  }
  return history[projectId].nextVersion || 1;
}

// Helper function to record export in history
async function recordExport(projectId, version, outputDir, status = "success") {
  const history = await readExportHistory();

  if (!history[projectId]) {
    history[projectId] = {
      nextVersion: 1,
      exports: [],
    };
  }

  // Add new export record
  const exportRecord = {
    version,
    timestamp: new Date().toISOString(),
    outputDir,
    status,
  };

  history[projectId].exports.unshift(exportRecord); // Add to beginning
  history[projectId].nextVersion = version + 1;

  // Get the max exports setting from app settings
  let maxExports = 10; // default
  try {
    const { getSetting } = await import("./appSettingsController.js");
    const maxVersionsSetting = await getSetting("export.maxVersionsToKeep");
    maxExports = parseInt(maxVersionsSetting || "10", 10) || 10;
  } catch {
    console.warn("Could not load app settings for export limit, using default of 10");
  }

  // Clean up old exports if we exceed the limit
  if (history[projectId].exports.length > maxExports) {
    const exportsToDelete = history[projectId].exports.slice(maxExports);

    // Delete physical directories for exports being removed
    for (const exportToDelete of exportsToDelete) {
      if (exportToDelete.outputDir && (await fs.pathExists(exportToDelete.outputDir))) {
        try {
          await fs.remove(exportToDelete.outputDir);
          console.log(`Cleaned up old export: ${exportToDelete.outputDir}`);
        } catch {
          console.warn(`Failed to delete old export directory: ${exportToDelete.outputDir}`);
        }
      }
    }

    // Keep only the allowed number of exports
    history[projectId].exports = history[projectId].exports.slice(0, maxExports);
  }

  await writeExportHistory(history);
  return exportRecord;
}

// Helper function to clean up all exports for a deleted project
export async function cleanupProjectExports(projectId) {
  try {
    console.log(`Cleaning up exports for deleted project: ${projectId}`);

    const history = await readExportHistory();
    const projectHistory = history[projectId];

    if (!projectHistory) {
      console.log(`No export history found for project ${projectId}`);
      return { deletedDirs: 0, deletedHistory: false };
    }

    // Delete all physical export directories for this project
    const deletedDirs = [];
    for (const exportRecord of projectHistory.exports) {
      if (exportRecord.outputDir && (await fs.pathExists(exportRecord.outputDir))) {
        try {
          await fs.remove(exportRecord.outputDir);
          deletedDirs.push(exportRecord.outputDir);
          console.log(`Deleted export directory: ${exportRecord.outputDir}`);
        } catch (error) {
          console.warn(`Failed to delete export directory: ${exportRecord.outputDir}`, error);
        }
      }
    }

    // Remove the entire project entry from export history
    delete history[projectId];
    await writeExportHistory(history);

    console.log(
      `Cleaned up ${deletedDirs.length} export directories and removed export history for project ${projectId}`,
    );
    return { deletedDirs: deletedDirs.length, deletedHistory: true };
  } catch (error) {
    console.error(`Error cleaning up exports for project ${projectId}:`, error);
    throw error;
  }
}

// Main function to handle the export request

export async function exportProject(req, res) {
  const { projectId } = req.params;

  try {
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Read projects file to get slug and metadata
    const projectsData = await readProjectsFile();
    const projectData = projectsData.projects.find((p) => p.id === projectId);

    if (!projectData) {
      throw new Error(`Project with ID "${projectId}" not found in projects.json`);
    }

    const projectSlug = projectData.slug || projectData.id;
    const projectDir = getProjectDir(projectSlug);
    const siteUrl = projectData.siteUrl || "";

    // Continue with defining export version and output directories.
    const version = await getNextVersion(projectId);
    const outputBaseDir = PUBLISH_DIR;
    const outputDir = path.join(outputBaseDir, `${projectSlug}-v${version}`);
    const outputAssetsDir = path.join(outputDir, "assets");
    const outputImagesDir = path.join(outputAssetsDir, "images"); // Images now in assets/images/
    const outputVideosDir = path.join(outputAssetsDir, "videos"); // Videos now in assets/videos/
    const outputAudiosDir = path.join(outputAssetsDir, "audios"); // Audios now in assets/audios/

    // Ensure output directories exist
    await fs.ensureDir(outputDir);
    await fs.ensureDir(outputAssetsDir);
    await fs.ensureDir(outputImagesDir);
    await fs.ensureDir(outputVideosDir);
    await fs.ensureDir(outputAudiosDir);

    const rawThemeSettings = await readProjectThemeData(projectSlug);

    // Fetch list of page data using the helper function
    const pagesDataArray = await listProjectPagesData(projectSlug);

    // --- Generate sitemap.xml and robots.txt ---
    if (siteUrl) {
      // 1. Generate sitemap.xml
      const sitemapUrls = pagesDataArray
        .filter((page) => !page.seo?.robots?.includes("noindex")) // Filter out 'noindex' pages
        .map((page) => {
          const pageUrl = new URL(`${page.slug}.html`, siteUrl).href;
          const lastMod = page.updated || page.gcreated || new Date().toISOString();
          return `
  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastMod.split("T")[0]}</lastmod>
  </url>`;
        });

      const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.join("")}
</urlset>`;

      const formattedSitemap = await prettier.format(sitemapContent, { parser: "html" });
      await fs.writeFile(path.join(outputDir, "sitemap.xml"), formattedSitemap);

      // 2. Generate robots.txt
      const sitemapUrl = new URL("sitemap.xml", siteUrl).href;
      const robotsContent = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}`;

      await fs.writeFile(path.join(outputDir, "robots.txt"), robotsContent);
    } else {
      console.warn(`Project ${projectId} has no siteUrl defined. Skipping sitemap.xml and robots.txt generation.`);
    }
    // --- End of new SEO file generation ---

    const headerData = await readGlobalWidgetData(projectSlug, "header");
    const footerData = await readGlobalWidgetData(projectSlug, "footer");

    // Handle case where no pages are found (except for theme files etc)
    if (pagesDataArray.length === 0) {
      console.warn(`No exportable pages found for project ${projectId}. Only copying assets/images.`); // Updated log message
      // Proceed to asset copying, but maybe indicate this in the response?
    }

    let headerHtml = "";
    let footerHtml = "";

    for (const pageData of pagesDataArray) {
      // Create shared globals for this page (each page gets fresh enqueue Maps)
      const sharedGlobals = {
        projectId,
        apiUrl: "",
        renderMode: "publish",
        themeSettingsRaw: rawThemeSettings,
        enqueuedStyles: new Map(),
        enqueuedScripts: new Map(),
      };

      // Render header if exists (for each page to capture enqueued assets)
      if (headerData) {
        headerHtml = await renderWidget(
          projectId,
          "header_widget",
          headerData,
          rawThemeSettings,
          "publish",
          sharedGlobals,
        );
      }

      // Render page-specific widgets sequentially
      let pageWidgetsHtml = "";
      if (pageData.widgets && pageData.widgetsOrder) {
        for (const widgetId of pageData.widgetsOrder) {
          // Skip header/footer as they are rendered separately
          if (widgetId === "header_widget" || widgetId === "footer_widget") {
            continue;
          }
          const widget = pageData.widgets[widgetId];
          if (!widget) {
            console.warn(` -> Widget data missing for ID: ${widgetId} on page ${pageData.id}`);
            continue;
          }
          pageWidgetsHtml += await renderWidget(
            projectId,
            widgetId,
            widget,
            rawThemeSettings,
            "publish",
            sharedGlobals,
          );
        }
      }

      // Render footer if exists
      if (footerData) {
        footerHtml = await renderWidget(
          projectId,
          "footer_widget",
          footerData,
          rawThemeSettings,
          "publish",
          sharedGlobals,
        );
      }

      // Pass separated content sections to layout
      const renderedHtml = await renderPageLayout(
        projectId,
        {
          headerContent: headerHtml,
          mainContent: pageWidgetsHtml,
          footerContent: footerHtml,
        },
        pageData,
        rawThemeSettings,
        "publish",
        sharedGlobals,
      );

      let processedHtml = renderedHtml; // Start with the rendered HTML

      // --- Format HTML using Prettier ---
      try {
        const formattedHtml = await prettier.format(processedHtml, {
          parser: "html",
          // Add any specific Prettier options here if needed
          // e.g., printWidth: 100
        });
        processedHtml = formattedHtml; // Update processedHtml with formatted version
      } catch (formatError) {
        console.warn(
          `Could not format HTML for ${pageData.id}.html: ${formatError.message}. Writing unformatted HTML.`,
        );
        // Keep the unformatted 'processedHtml'
      }
      // --- End Formatting ---

      // Determine output filename (e.g., index.html for homepage, slug.html otherwise)
      const outputFilename = pageData.id === "index" || pageData.id === "home" ? "index.html" : `${pageData.id}.html`;
      const outputFilePath = path.join(outputDir, outputFilename);

      // Write the processed (and potentially formatted) HTML file
      await fs.outputFile(outputFilePath, processedHtml);
    }

    // --- Copy Assets ---
    const projectAssetsDir = path.join(projectDir, "assets");
    try {
      if (await fs.pathExists(projectAssetsDir)) {
        await fs.copy(projectAssetsDir, outputAssetsDir);
      } else {
        console.warn(`Project assets directory not found: ${projectAssetsDir}`);
      }
    } catch (copyError) {
      console.error("Error copying assets:", copyError);
    }

    // --- Copy Core Assets (placeholder images) ---
    try {
      const coreAssetsDir = path.join(process.cwd(), "src", "core", "assets");
      const placeholderFiles = [
        "placeholder.svg", // landscape (default)
        "placeholder-portrait.svg", // portrait
        "placeholder-square.svg", // square
      ];
      for (const file of placeholderFiles) {
        const src = path.join(coreAssetsDir, file);
        if (await fs.pathExists(src)) {
          await fs.copy(src, path.join(outputAssetsDir, file));
        }
      }
    } catch (coreAssetError) {
      console.warn("Could not copy core placeholder assets:", coreAssetError.message);
    }

    // --- Copy Widget Assets (CSS/JS) ---
    const projectWidgetsDir = path.join(projectDir, "widgets");
    try {
      if (await fs.pathExists(projectWidgetsDir)) {
        // Recursively find .css and .js files in the widgets directory
        const widgetAssetFiles = await findFilesRecursive(projectWidgetsDir, [/.css$/, /.js$/]);

        // Copy each found asset to the output assets directory
        for (const sourcePath of widgetAssetFiles) {
          const filename = path.basename(sourcePath);
          const destPath = path.join(outputAssetsDir, filename);
          try {
            // Use { overwrite: true } ? Or error/warn if exists? Let's overwrite for simplicity now.
            await fs.copy(sourcePath, destPath, { overwrite: true });
          } catch (widgetCopyError) {
            console.error(`Error copying widget asset ${filename}:`, widgetCopyError);
          }
        }
      } else {
        // It's normal for a project not to have a widgets/ directory if it uses none
        // console.log(`Project widgets directory not found (this may be normal): ${projectWidgetsDir}`);
      }
    } catch (findError) {
      console.error("Error finding or copying widget assets:", findError);
    }

    // --- Copy Only Used Images ---
    try {
      const { readMediaFile } = await import("./mediaController.js");
      const mediaData = await readMediaFile(projectId);

      if (mediaData && mediaData.files) {
        const usedImages = mediaData.files.filter(
          (file) => file.usedIn && file.usedIn.length > 0 && file.path.startsWith("/uploads/images/"),
        );

        let copiedCount = 0;
        let skippedCount = 0;

        for (const imageFile of usedImages) {
          const sourceImagePath = path.join(projectDir, imageFile.path.replace(/^\//, ""));
          // Changed: Export images to assets/images/ instead of uploads/images/
          const targetImagePath = path.join(outputDir, "assets", "images", path.basename(imageFile.path));

          // Copy original image
          try {
            if (await fs.pathExists(sourceImagePath)) {
              await fs.ensureDir(path.dirname(targetImagePath));
              await fs.copy(sourceImagePath, targetImagePath);
              copiedCount++;
            }
          } catch (copyError) {
            console.error(`Error copying image ${imageFile.filename}:`, copyError);
          }

          // Copy all generated sizes for this image
          if (imageFile.sizes) {
            for (const [sizeName, sizeInfo] of Object.entries(imageFile.sizes)) {
              const sourceSizePath = path.join(projectDir, sizeInfo.path.replace(/^\//, ""));
              // Changed: Export image sizes to assets/images/ instead of uploads/images/
              const targetSizePath = path.join(outputDir, "assets", "images", path.basename(sizeInfo.path));

              try {
                if (await fs.pathExists(sourceSizePath)) {
                  await fs.ensureDir(path.dirname(targetSizePath));
                  await fs.copy(sourceSizePath, targetSizePath);
                }
              } catch (sizeError) {
                console.error(`Error copying ${sizeName} size for ${imageFile.filename}:`, sizeError);
              }
            }
          }
        }

        // Count unused images for reporting
        const allImages = mediaData.files.filter((file) => file.path.startsWith("/uploads/images/"));
        skippedCount = allImages.length - usedImages.length;

        console.log(
          `Export optimization: Copied ${copiedCount} used images to assets/images/, skipped ${skippedCount} unused images`,
        );
      } else {
        console.log("No media data found or no images to process");
      }
    } catch (mediaError) {
      console.error("Error reading media data for selective export:", mediaError);
      // Fallback to copying all images if media tracking fails
      const projectImagesDir = path.join(projectDir, "uploads", "images");
      try {
        if (await fs.pathExists(projectImagesDir)) {
          await fs.copy(projectImagesDir, outputImagesDir);
          console.log("Fallback: Copied all images due to media tracking error");
        }
      } catch (fallbackError) {
        console.error("Error in fallback image copying:", fallbackError);
      }
    }
    // --- End Copy ---

    // --- Copy Only Used Videos ---
    try {
      const { readMediaFile } = await import("./mediaController.js");
      const mediaData = await readMediaFile(projectId);

      if (mediaData && mediaData.files) {
        const usedVideos = mediaData.files.filter(
          (file) =>
            file.type.startsWith("video/") &&
            file.usedIn &&
            file.usedIn.length > 0 &&
            file.path.startsWith("/uploads/videos/"),
        );

        let copiedCount = 0;
        let skippedCount = 0;

        for (const videoFile of usedVideos) {
          const sourceVideoPath = path.join(projectDir, videoFile.path.replace(/^\//, ""));
          // Changed: Export videos to assets/videos/ instead of uploads/videos/
          const targetVideoPath = path.join(outputDir, "assets", "videos", path.basename(videoFile.path));

          try {
            if (await fs.pathExists(sourceVideoPath)) {
              await fs.ensureDir(path.dirname(targetVideoPath));
              await fs.copy(sourceVideoPath, targetVideoPath);
              copiedCount++;
            }
          } catch (copyError) {
            console.error(`Error copying video ${videoFile.filename}:`, copyError);
          }
        }

        const allVideos = mediaData.files.filter((file) => file.type.startsWith("video/"));
        skippedCount = allVideos.length - usedVideos.length;

        console.log(
          `Export optimization: Copied ${copiedCount} used videos to assets/videos/, skipped ${skippedCount} unused videos`,
        );
      } else {
        console.log("No media data found or no videos to process");
      }
    } catch (mediaError) {
      console.error("Error reading media data for video export:", mediaError);
      // Fallback to copying all videos if media tracking fails
      const projectVideosDir = path.join(projectDir, "uploads", "videos");
      try {
        if (await fs.pathExists(projectVideosDir)) {
          await fs.copy(projectVideosDir, outputVideosDir);
          console.log("Fallback: Copied all videos due to media tracking error");
        }
      } catch (fallbackError) {
        console.error("Error in fallback video copying:", fallbackError);
      }
    }

    // Copy used audio files to assets/audios/
    try {
      const { readMediaFile } = await import("./mediaController.js");
      const mediaData = await readMediaFile(projectId);

      if (mediaData && mediaData.files) {
        const usedAudios = mediaData.files.filter(
          (file) =>
            file.type.startsWith("audio/") &&
            file.usedIn &&
            file.usedIn.length > 0 &&
            file.path.startsWith("/uploads/audios/"),
        );

        let copiedCount = 0;
        let skippedCount = 0;

        for (const audioFile of usedAudios) {
          const sourceAudioPath = path.join(projectDir, audioFile.path.replace(/^\//, ""));
          const targetAudioPath = path.join(outputDir, "assets", "audios", path.basename(audioFile.path));

          try {
            if (await fs.pathExists(sourceAudioPath)) {
              await fs.ensureDir(path.dirname(targetAudioPath));
              await fs.copy(sourceAudioPath, targetAudioPath);
              copiedCount++;
            }
          } catch (copyError) {
            console.error(`Error copying audio ${audioFile.filename}:`, copyError);
          }
        }

        const allAudios = mediaData.files.filter((file) => file.type.startsWith("audio/"));
        skippedCount = allAudios.length - usedAudios.length;

        console.log(
          `Export optimization: Copied ${copiedCount} used audios to assets/audios/, skipped ${skippedCount} unused audios`,
        );
      } else {
        console.log("No media data found or no audios to process");
      }
    } catch (mediaError) {
      console.error("Error reading media data for audio export:", mediaError);
      // Fallback to copying all audios if media tracking fails
      const projectAudiosDir = path.join(projectDir, "uploads", "audios");
      try {
        if (await fs.pathExists(projectAudiosDir)) {
          await fs.copy(projectAudiosDir, outputAudiosDir);
          console.log("Fallback: Copied all audios due to media tracking error");
        }
      } catch (fallbackError) {
        console.error("Error in fallback audio copying:", fallbackError);
      }
    }

    // Record this export in history
    const exportRecord = await recordExport(projectId, version, outputDir, "success");

    res.json({
      success: true,
      message: `Project exported successfully as version ${version}`,
      outputDir: outputDir,
      version: version,
      exportRecord: exportRecord,
    });
  } catch (error) {
    // Try to record failed export
    try {
      const version = await getNextVersion(projectId);
      await recordExport(projectId, version, null, "failed");
    } catch (recordError) {
      console.error("Failed to record export failure:", recordError);
    }
    // Send specific error if theme read failed
    if (error.message.includes("Theme settings file not found")) {
      return res.status(404).json({
        error: "Failed to export: Theme settings not found",
        message: error.message,
      });
    }
    // Add specific handling for page listing errors if the helper throws them
    if (error.message.includes("Failed to list pages data")) {
      return res.status(500).json({
        error: "Failed to export: Could not read project pages",
        message: error.message,
      });
    }
    // General error
    res.status(500).json({
      error: "Failed to export project",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
}

// Helper function to recursively find files matching regex patterns
async function findFilesRecursive(dir, patterns) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(await findFilesRecursive(fullPath, patterns));
    } else if (patterns.some((pattern) => pattern.test(dirent.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Get files in an export directory to find the best entry point
async function findEntryFile(exportDir) {
  try {
    const files = await fs.readdir(exportDir);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    // Prefer index.html, then home.html, then the first HTML file
    if (htmlFiles.includes("index.html")) {
      return "index.html";
    }
    if (htmlFiles.includes("home.html")) {
      return "home.html";
    }
    if (htmlFiles.length > 0) {
      return htmlFiles[0];
    }

    return "index.html"; // fallback
  } catch {
    return "index.html"; // fallback on error
  }
}

// Get export files info for frontend
export async function getExportFiles(req, res) {
  try {
    const { exportDir } = req.params;

    if (!exportDir) {
      return res.status(400).json({ error: "Export directory is required" });
    }

    const fullPath = path.join(PUBLISH_DIR, exportDir);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(PUBLISH_DIR);

    if (!resolvedPath.startsWith(publishPath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({ error: "Export directory not found" });
    }

    const entryFile = await findEntryFile(fullPath);

    res.json({
      success: true,
      entryFile: entryFile,
    });
  } catch (error) {
    console.error("Error getting export files:", error);
    res.status(500).json({
      error: "Failed to get export files",
      message: error.message,
    });
  }
}

// Download export as ZIP
export async function downloadExport(req, res) {
  try {
    const { exportDir } = req.params;

    if (!exportDir) {
      return res.status(400).json({ error: "Export directory is required" });
    }

    const fullPath = path.join(PUBLISH_DIR, exportDir);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(PUBLISH_DIR);

    if (!resolvedPath.startsWith(publishPath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({ error: "Export directory not found" });
    }

    // Set response headers for ZIP download
    const zipName = `${exportDir}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle archiver errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add all files from the export directory to the ZIP
    archive.directory(fullPath, false);

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error("Error downloading export:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to download export",
        message: error.message,
      });
    }
  }
}

// Get export history for a project
export async function getExportHistory(req, res) {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const history = await readExportHistory();
    const projectHistory = history[projectId] || { exports: [] };

    // Get the configured limit for exports to show
    let maxExports = 10; // default fallback
    try {
      const { getSetting } = await import("./appSettingsController.js");
      const maxVersionsSetting = await getSetting("export.maxVersionsToKeep");
      maxExports = parseInt(maxVersionsSetting || "10", 10) || 10;
    } catch {
      console.warn("Could not load app settings for export display limit, using default of 10");
    }

    // Return all available exports (they should already be limited by the cleanup process)
    const availableExports = projectHistory.exports;

    res.json({
      success: true,
      exports: availableExports,
      totalExports: projectHistory.exports.length,
      maxVersionsToKeep: maxExports,
    });
  } catch (error) {
    console.error("Error getting export history:", error);
    res.status(500).json({
      error: "Failed to get export history",
      message: error.message,
    });
  }
}

// Delete a specific export
export async function deleteExport(req, res) {
  try {
    const { projectId, version } = req.params;

    if (!projectId || !version) {
      return res.status(400).json({ error: "Project ID and version are required" });
    }

    const history = await readExportHistory();
    const projectHistory = history[projectId];

    if (!projectHistory) {
      return res.status(404).json({ error: "No exports found for this project" });
    }

    // Find the export to delete
    const exportIndex = projectHistory.exports.findIndex((exp) => exp.version === parseInt(version));

    if (exportIndex === -1) {
      return res.status(404).json({ error: "Export version not found" });
    }

    const exportToDelete = projectHistory.exports[exportIndex];

    // Delete the physical directory if it exists
    if (exportToDelete.outputDir && (await fs.pathExists(exportToDelete.outputDir))) {
      await fs.remove(exportToDelete.outputDir);
    }

    // Remove from history
    projectHistory.exports.splice(exportIndex, 1);
    await writeExportHistory(history);

    res.json({
      success: true,
      message: `Export version ${version} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting export:", error);
    res.status(500).json({
      error: "Failed to delete export",
      message: error.message,
    });
  }
}
