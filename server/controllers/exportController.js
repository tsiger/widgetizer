import fs from "fs-extra";
import path from "path";
import prettier from "prettier";
import archiver from "archiver";
import { getProjectDir, PUBLISH_DIR } from "../config.js";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { readProjectThemeData } from "./themeController.js";
import { listProjectPagesData, readGlobalWidgetData } from "./pageController.js";

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
  } catch (error) {
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
        } catch (error) {
          console.warn(`Failed to delete old export directory: ${exportToDelete.outputDir}`, error);
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

    const projectDir = getProjectDir(projectId);
    const version = await getNextVersion(projectId);
    const outputBaseDir = PUBLISH_DIR; // Base directory for all exports
    const outputDir = path.join(outputBaseDir, `${projectId}-v${version}`);
    const outputAssetsDir = path.join(outputDir, "assets");
    const outputUploadsDir = path.join(outputDir, "uploads"); // Define uploads base in output
    const outputImagesDir = path.join(outputUploadsDir, "images"); // Define images dir in output

    // Ensure output directories exist
    await fs.ensureDir(outputDir);
    await fs.ensureDir(outputAssetsDir);
    await fs.ensureDir(outputImagesDir); // Ensure uploads/images exists

    const rawThemeSettings = await readProjectThemeData(projectId);

    // Fetch list of page data using the helper function

    const pagesDataArray = await listProjectPagesData(projectId);

    const headerData = await readGlobalWidgetData(projectId, "header");
    const footerData = await readGlobalWidgetData(projectId, "footer");

    // Handle case where no pages are found (except for theme files etc)
    if (pagesDataArray.length === 0) {
      console.warn(`No exportable pages found for project ${projectId}. Only copying assets/images.`); // Updated log message
      // Proceed to asset copying, but maybe indicate this in the response?
    }

    let headerHtml = "";
    if (headerData) {
      headerHtml = await renderWidget(projectId, "header_widget", headerData, rawThemeSettings, "publish");
    }
    let footerHtml = "";
    if (footerData) {
      footerHtml = await renderWidget(projectId, "footer_widget", footerData, rawThemeSettings, "publish");
    }

    for (const pageData of pagesDataArray) {
      // Render page-specific widgets
      let pageWidgetsHtml = "";
      if (pageData.widgets && pageData.widgetsOrder) {
        const widgetPromises = pageData.widgetsOrder.map(async (widgetId) => {
          // Skip header/footer as they are rendered separately
          if (widgetId === "header_widget" || widgetId === "footer_widget") {
            return null;
          }
          const widget = pageData.widgets[widgetId];
          if (!widget) {
            console.warn(` -> Widget data missing for ID: ${widgetId} on page ${pageData.id}`);
            return null;
          }
          return await renderWidget(projectId, widgetId, widget, rawThemeSettings, "publish");
        });
        const renderedWidgets = (await Promise.all(widgetPromises)).filter((html) => html !== null);
        pageWidgetsHtml = renderedWidgets.join("");
      } else {
      }

      // Combine header + page widgets + footer for layout content
      const contentForLayout = headerHtml + pageWidgetsHtml + footerHtml;

      // Render layout with combined content
      const renderedHtml = await renderPageLayout(projectId, contentForLayout, pageData, rawThemeSettings, "publish");

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

    // --- Copy Images ---
    const projectImagesDir = path.join(projectDir, "uploads", "images");
    try {
      if (await fs.pathExists(projectImagesDir)) {
        await fs.copy(projectImagesDir, outputImagesDir);
      } else {
        console.warn(`Project images directory not found: ${projectImagesDir}`);
      }
    } catch (copyError) {
      console.error("Error copying images:", copyError);
    }
    // --- End Copy ---

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
  } catch (error) {
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
    } catch (error) {
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
