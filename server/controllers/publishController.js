import fs from "fs-extra";
import path from "path";
import prettier from "prettier";
import { getProjectDir, PUBLISH_DIR } from "../config.js";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { readProjectThemeData } from "./themeController.js";
import { listProjectPagesData, readGlobalWidgetData } from "./pageController.js";

// Main function to handle the publish request
export async function publishProject(req, res) {
  const { projectId } = req.params;

  try {
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const projectDir = getProjectDir(projectId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Create a safe timestamp
    const outputBaseDir = PUBLISH_DIR; // Base directory for all publishes
    const outputDir = path.join(outputBaseDir, `${projectId}-${timestamp}`);
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
      console.warn(`No publishable pages found for project ${projectId}. Only copying assets/images.`); // Updated log message
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

    res.json({ success: true, message: "Project published successfully", outputDir: outputDir });
  } catch (error) {
    // Send specific error if theme read failed
    if (error.message.includes("Theme settings file not found")) {
      return res.status(404).json({
        error: "Failed to publish: Theme settings not found",
        message: error.message,
      });
    }
    // Add specific handling for page listing errors if the helper throws them
    if (error.message.includes("Failed to list pages data")) {
      return res.status(500).json({
        error: "Failed to publish: Could not read project pages",
        message: error.message,
      });
    }
    // General error
    res.status(500).json({
      error: "Failed to publish project",
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
