import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { getProjectDir, PUBLISH_DIR, APP_ROOT, STATIC_CORE_ASSETS_DIR } from "../config.js";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { readProjectThemeData } from "./themeController.js";
import { listProjectPagesData, readGlobalWidgetData } from "./pageController.js";
import { readProjectsFile } from "./projectController.js";
import { formatHtml, formatXml, validateHtml, generateIssuesReport } from "../utils/htmlProcessor.js";
import TurndownService from "turndown";
import * as exportRepo from "../db/repositories/exportRepository.js";

const PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
let cachedAppVersion = null;

async function getAppVersion() {
  if (cachedAppVersion) {
    return cachedAppVersion;
  }

  try {
    const packageJson = await fs.readJson(PACKAGE_JSON_PATH);
    cachedAppVersion = packageJson?.version || "unknown";
  } catch (error) {
    console.warn("Could not read package.json version:", error.message);
    cachedAppVersion = "unknown";
  }

  return cachedAppVersion;
}

// Resolve a stored outputDir to an absolute path.
// New exports store just the directory name (e.g. "my-project-v1");
// legacy data may still have full absolute paths.
function resolveOutputDir(outputDir) {
  if (!outputDir) return null;
  if (path.isAbsolute(outputDir)) return outputDir;
  return path.join(PUBLISH_DIR, outputDir);
}

// Helper function to record an export and trim old versions
async function recordExport(projectId, version, outputDir, status = "success") {
  const exportRecord = exportRepo.recordExport(projectId, version, outputDir, status);

  // Get the max exports setting from app settings
  let maxExports = 10; // default
  try {
    const { getSetting } = await import("./appSettingsController.js");
    const maxVersionsSetting = await getSetting("export.maxVersionsToKeep");
    maxExports = parseInt(maxVersionsSetting || "10", 10) || 10;
  } catch (error) {
    console.warn("Could not load app settings for export limit, using default of 10. Error:", error.message);
  }

  // Trim old exports beyond the limit
  const trimmed = exportRepo.trimExports(projectId, maxExports);
  for (const old of trimmed) {
    const dir = resolveOutputDir(old.outputDir);
    if (dir && (await fs.pathExists(dir))) {
      try {
        await fs.remove(dir);
        console.log(`Cleaned up old export: ${dir}`);
      } catch (error) {
        console.warn(`Failed to delete old export directory: ${dir}. Error: ${error.message}`);
      }
    }
  }

  return exportRecord;
}

/**
 * Cleans up all export directories and history for a deleted project.
 * @param {string} projectId - The project UUID
 * @returns {Promise<{deletedDirs: number, deletedHistory: boolean}>} Cleanup results
 * @throws {Error} If cleanup fails
 */
export async function cleanupProjectExports(projectId) {
  try {
    console.log(`Cleaning up exports for deleted project: ${projectId}`);

    const records = exportRepo.getExports(projectId);

    if (records.length === 0) {
      console.log(`No export history found for project ${projectId}`);
      return { deletedDirs: 0, deletedHistory: false };
    }

    // Delete all physical export directories for this project
    const deletedDirs = [];
    for (const record of records) {
      const dir = resolveOutputDir(record.outputDir);
      if (dir && (await fs.pathExists(dir))) {
        try {
          await fs.remove(dir);
          deletedDirs.push(dir);
          console.log(`Deleted export directory: ${dir}`);
        } catch (error) {
          console.warn(`Failed to delete export directory: ${dir}`, error);
        }
      }
    }

    // Remove all export records from the database
    exportRepo.deleteAllExports(projectId);

    console.log(
      `Cleaned up ${deletedDirs.length} export directories and removed export history for project ${projectId}`,
    );
    return { deletedDirs: deletedDirs.length, deletedHistory: true };
  } catch (error) {
    console.error(`Error cleaning up exports for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Exports a project to static HTML files with assets, sitemap, and robots.txt.
 * Renders all pages with widgets, copies used media, and records the export in history.
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function exportProject(req, res) {
  const { projectId } = req.params;
  const { exportMarkdown = false } = req.body || {};

  try {
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Read projects file to resolve UUID to folderName (slug) for filesystem paths
    const projectsData = await readProjectsFile();
    const projectData = projectsData.projects.find((p) => p.id === projectId);

    if (!projectData) {
      throw new Error(`Project with ID "${projectId}" not found`);
    }

    const projectFolderName = projectData.folderName;
    const projectDir = getProjectDir(projectFolderName);
    const siteUrl = projectData.siteUrl || "";

    const version = exportRepo.getNextVersion(projectId);
    const outputBaseDir = PUBLISH_DIR;
    const outputDir = path.join(outputBaseDir, `${projectFolderName}-v${version}`);
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
    const rawThemeSettings = await readProjectThemeData(projectId);

    // Fetch list of page data using the helper function
    const pagesDataArray = await listProjectPagesData(projectFolderName);

    // Validate that at least one page has the "index" slug (required for homepage)
    // Note: page.id is derived from filename, which is the authoritative slug
    const hasIndexPage = pagesDataArray.some((page) => page.id === "index");
    if (!hasIndexPage) {
      return res.status(400).json({
        error: "Export failed: No homepage found",
        message:
          'Your project must have a page with the slug "index" to serve as the homepage. Please create or rename a page to have the slug "index" before exporting.',
      });
    }

    // --- Generate sitemap.xml and robots.txt ---
    if (siteUrl && siteUrl.trim() !== "") {
      try {
        // Validate URL format first
        new URL(siteUrl); // Will throw if invalid

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

        const sitemapResult = await formatXml(sitemapContent);
        await fs.writeFile(path.join(outputDir, "sitemap.xml"), sitemapResult.xml);

        // 2. Generate robots.txt
        const sitemapUrl = new URL("sitemap.xml", siteUrl).href;
        const disallowPaths = Array.from(
          new Set(
            pagesDataArray
              .filter((page) => page.seo?.robots?.includes("noindex"))
              .map((page) => {
                const pageId = page.id || page.slug;
                if (!pageId) return null;
                const filename = pageId === "index" || pageId === "home" ? "index.html" : `${pageId}.html`;
                return `/${filename}`;
              })
              .filter(Boolean),
          ),
        );
        const robotsLines = [
          "User-agent: *",
          "Allow: /",
          ...disallowPaths.map((path) => `Disallow: ${path}`),
          "",
          `Sitemap: ${sitemapUrl}`,
        ];
        const robotsContent = robotsLines.join("\n");

        await fs.writeFile(path.join(outputDir, "robots.txt"), robotsContent);
      } catch (err) {
        console.warn(`Skipping sitemap/robots generation due to invalid siteUrl: ${siteUrl}`, err.message);
      }
    } else {
      console.warn(`Project ${projectId} has no siteUrl defined. Skipping sitemap.xml and robots.txt generation.`);
    }
    // --- End of new SEO file generation ---

    const headerData = await readGlobalWidgetData(projectFolderName, "header");
    const footerData = await readGlobalWidgetData(projectFolderName, "footer");

    // Handle case where no pages are found (except for theme files etc)
    if (pagesDataArray.length === 0) {
      console.warn(`No exportable pages found for project ${projectId}. Only copying assets/images.`); // Updated log message
      // Proceed to asset copying, but maybe indicate this in the response?
    }

    let headerHtml = "";
    let footerHtml = "";

    // Check if developer mode is enabled for HTML validation
    let devModeEnabled = false;
    try {
      const { getSetting } = await import("./appSettingsController.js");
      devModeEnabled = await getSetting("developer.enabled");
    } catch (error) {
      console.warn("Could not check developer mode setting:", error.message);
    }

    // Track HTML validation issues across all pages (only when dev mode is on)
    const validationIssues = [];

    for (const pageData of pagesDataArray) {
      // Create shared globals for this page (each page gets fresh enqueue Maps)
      const sharedGlobals = {
        projectId,
        apiUrl: "",
        renderMode: "publish",
        themeSettingsRaw: rawThemeSettings,
        enqueuedStyles: new Map(),
        enqueuedScripts: new Map(),
        exportVersion: version, // For cache busting
      };

      // Render header if exists (for each page to capture enqueued assets)
      if (headerData) {
        headerHtml = await renderWidget(projectId, "header", headerData, rawThemeSettings, "publish", sharedGlobals);
      }

      // Render page-specific widgets sequentially
      let pageWidgetsHtml = "";
      if (pageData.widgets && pageData.widgetsOrder) {
        let widgetIndex = 0;
        for (const widgetId of pageData.widgetsOrder) {
          // Skip header/footer as they are rendered separately
          if (widgetId === "header" || widgetId === "footer") {
            continue;
          }
          const widget = pageData.widgets[widgetId];
          if (!widget) {
            console.warn(` -> Widget data missing for ID: ${widgetId} on page ${pageData.id}`);
            continue;
          }
          widgetIndex += 1; // 1-based index (first widget = 1, second = 2, etc.)
          pageWidgetsHtml += await renderWidget(
            projectId,
            widgetId,
            widget,
            rawThemeSettings,
            "publish",
            sharedGlobals,
            widgetIndex,
          );
        }
      }

      // Render footer if exists
      if (footerData) {
        footerHtml = await renderWidget(projectId, "footer", footerData, rawThemeSettings, "publish", sharedGlobals);
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

      // Format HTML using Prettier
      const formatResult = await formatHtml(renderedHtml);
      let processedHtml = formatResult.html;
      if (!formatResult.success) {
        console.warn(`Could not format HTML for ${pageData.id}.html: ${formatResult.error}. Writing unformatted HTML.`);
      }

      // Validate HTML (only when developer mode is enabled)
      if (devModeEnabled) {
        const validation = await validateHtml(processedHtml, pageData.id);
        if (validation.issues.length > 0) {
          validationIssues.push({
            page: pageData.id,
            filename: pageData.id === "index" || pageData.id === "home" ? "index.html" : `${pageData.id}.html`,
            issues: validation.issues,
          });
        }
      }

      const appVersion = await getAppVersion();

      // Add easter egg ASCII art comment before doctype
      const easterEggComment = `<!--
Made with Widgetizer v${appVersion}
Per aspera ad astra
-->
`;
      // Prepend easter egg at the very beginning of the HTML
      processedHtml = easterEggComment + processedHtml;

      // Determine output filename (e.g., index.html for homepage, slug.html otherwise)
      const outputFilename = pageData.id === "index" || pageData.id === "home" ? "index.html" : `${pageData.id}.html`;
      const outputFilePath = path.join(outputDir, outputFilename);

      // Write the processed (and potentially formatted) HTML file
      await fs.outputFile(outputFilePath, processedHtml);

      // Generate markdown version (content only, no layout) - if enabled
      if (exportMarkdown) {
        try {
          const turndown = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced",
            bulletListMarker: "-",
          });
          // Remove non-content elements (they don't make sense in markdown)
          turndown.remove(["style", "script", "noscript", "form", "input", "button", "select", "textarea"]);
          // Strip style/script/form tags and placeholder images from HTML
          const cleanHtml = pageWidgetsHtml
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "")
            .replace(/<img[^>]*src=["'][^"']*placeholder[^"']*["'][^>]*>/gi, "");
          const markdownContent = turndown.turndown(cleanHtml);
          const mdFilename = pageData.id === "index" || pageData.id === "home" ? "index.md" : `${pageData.id}.md`;

          // Add YAML frontmatter
          const frontmatter = [
            "---",
            `title: ${pageData.name || pageData.id}`,
            `description: ${pageData.seo?.description || pageData.description || ""}`,
            "source_url:",
            `  html: '${outputFilename}'`,
            `  md: '${mdFilename}'`,
            "---",
            "",
            "",
          ].join("\n");

          await fs.outputFile(path.join(outputDir, mdFilename), frontmatter + markdownContent);
        } catch (mdError) {
          console.warn(`Could not generate markdown for ${pageData.id}: ${mdError.message}`);
        }
      }
    }

    // Generate validation issues report if any (only when developer mode is enabled)
    if (devModeEnabled) {
      if (validationIssues.length > 0) {
        const totalIssues = validationIssues.reduce((sum, page) => sum + page.issues.length, 0);
        const issuesHtml = generateIssuesReport(validationIssues);
        await fs.outputFile(path.join(outputDir, "__export__issues.html"), issuesHtml);
        console.log(`HTML validation: ${totalIssues} issue(s) found. See __export__issues.html`);
      } else {
        console.log("HTML validation: No issues found.");
      }
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
      const coreAssetsDir = STATIC_CORE_ASSETS_DIR;
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
      console.warn("Error finding or copying widget assets:", findError.message);
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

    // Write manifest.json with export metadata
    const manifest = {
      generator: "widgetizer",
      widgetizerVersion: await getAppVersion(),
      themeId: projectData.theme,
      themeVersion: projectData.themeVersion || null,
      exportVersion: version,
      exportedAt: new Date().toISOString(),
      projectName: projectData.name,
    };
    await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    // Record this export in history (store relative dir name, not absolute path)
    const exportDirName = `${projectFolderName}-v${version}`;
    const exportRecord = await recordExport(projectId, version, exportDirName, "success");

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
      const version = exportRepo.getNextVersion(projectId);
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
    console.warn("Error finding entry file in export directory:", error.message);
    return "index.html"; // fallback on error
  }
}

/**
 * Retrieves information about an export directory, including the entry file.
 * @param {import('express').Request} req - Express request object with exportDir in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
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

/**
 * Downloads an export directory as a ZIP archive.
 * @param {import('express').Request} req - Express request object with exportDir in params
 * @param {import('express').Response} res - Express response object (streams ZIP)
 * @returns {Promise<void>}
 */
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

/**
 * Retrieves the export history for a project including all past export records.
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getExportHistory(req, res) {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const exports = exportRepo.getExports(projectId);

    // Get the configured limit for exports to show
    let maxExports = 10; // default fallback
    try {
      const { getSetting } = await import("./appSettingsController.js");
      const maxVersionsSetting = await getSetting("export.maxVersionsToKeep");
      maxExports = parseInt(maxVersionsSetting || "10", 10) || 10;
    } catch (error) {
      console.warn("Could not load app settings for export display limit, using default of 10. Error:", error.message);
    }

    res.json({
      success: true,
      exports,
      totalExports: exports.length,
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

/**
 * Deletes a specific export version and its directory from a project.
 * @param {import('express').Request} req - Express request object with projectId and version in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteExport(req, res) {
  try {
    const { projectId, version } = req.params;

    if (!projectId || !version) {
      return res.status(400).json({ error: "Project ID and version are required" });
    }

    const exports = exportRepo.getExports(projectId);

    if (exports.length === 0) {
      return res.status(404).json({ error: "No exports found for this project" });
    }

    // Delete the export record from the database
    const deleted = exportRepo.deleteExportRecord(projectId, parseInt(version));

    if (!deleted) {
      return res.status(404).json({ error: "Export version not found" });
    }

    // Delete the physical directory if it exists
    const dir = resolveOutputDir(deleted.outputDir);
    if (dir && (await fs.pathExists(dir))) {
      await fs.remove(dir);
    }

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
