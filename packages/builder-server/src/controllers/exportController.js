import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { getProjectDir, getPublishDir, APP_ROOT, STATIC_CORE_ASSETS_DIR } from "../config.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import { renderWidget, renderPageLayout, renderCollectionItemPage, widgetSupportsTransparentHeader } from "../services/renderingService.js";
import {
  listCollectionSchemas,
  listCollectionItems,
  loadCollectionTemplate,
  loadCollectionItemsByUuid,
} from "../services/collectionService.js";
import { listPagesFromDir, readGlobalWidgetFromDir, readThemeDataFromDir } from "../utils/projectContentFs.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { formatHtml, validateHtml, generateIssuesReport } from "../utils/htmlProcessor.js";
import { buildSitemap, buildRobotsTxt } from "../services/seoArtifacts.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { generateExportSiteIcons } from "../utils/siteIconHelpers.js";
import { buildFormsManifest } from "../services/formsManifestService.js";
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

// Resolve a stored outputDir to an absolute path within the publish directory.
function resolveOutputDir(outputDir) {
  if (!outputDir) return null;
  return path.join(getPublishDir(), path.basename(outputDir));
}

// Recursively sum the byte size of every file under a directory. Cheap for the
// small static sites this targets; used to surface an export's total size.
async function getDirectorySize(dirPath) {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirectorySize(full);
    } else if (entry.isFile()) {
      total += (await fs.stat(full)).size;
    }
  }
  return total;
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
    await getProjectFolderName(projectId);
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
 * Exports a project to a directory of static HTML files with assets, sitemap, and robots.txt.
 * This is the core export logic used by the export endpoint.
 * @param {string} projectId - Project UUID
 * @param {object} [options] - Export options
 * @param {boolean} [options.exportMarkdown=false] - Also export pages as markdown
 * @returns {Promise<{outputDir: string, version: number, exportDirName: string, exportRecord: object}>}
 */
export async function exportProjectToDir(projectId, options = {}, collectionDeps = null) {
  const { exportMarkdown = false } = options;

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  // Look up the project by UUID to get folderName (slug) for filesystem paths
  const projectData = projectRepo.getProjectById(projectId);

  if (!projectData) {
    throw new Error(`Project with ID "${projectId}" not found`);
  }

  const projectFolderName = projectData.folderName;
  const projectDir = getProjectDir(projectFolderName);
  const siteUrl = projectData.siteUrl || "";

  const version = exportRepo.getNextVersion(projectId);
  const outputBaseDir = getPublishDir();
  const outputDir = path.join(outputBaseDir, `${projectFolderName}-v${version}`);
    const outputAssetsDir = path.join(outputDir, "assets");
    const outputImagesDir = path.join(outputAssetsDir, "images");

    // The scope-aware collection capability (storage adapter + scope) supplied by
    // the export route; absent callers get no collection enumeration.
    const collectionStorage = collectionDeps?.storage || null;
    const collectionScope = collectionDeps?.scope || null;
    const collectionsEnabled = !!(collectionStorage && collectionScope);

    // --- Read-only setup + ALL fail-fast validation BEFORE any disk write, so a
    // blocked export (missing homepage / invalid collection items / missing
    // template) leaves no output directory, favicon, or manifest behind. Nothing
    // below touches disk until the "validation passed" marker. ---
    const rawThemeSettings = await readThemeDataFromDir(projectDir);
    const processedThemeSettings = preprocessThemeSettings(rawThemeSettings);

    // Fetch list of page data using the helper function
    const pagesDataArray = await listPagesFromDir(projectDir);

    // Validate that at least one page has the "index" slug (required for homepage)
    // Note: page.id is derived from filename, which is the authoritative slug
    const hasIndexPage = pagesDataArray.some((page) => page.id === "index");
    if (!hasIndexPage) {
      const err = new Error('Your project must have a page with the slug "index" to serve as the homepage. Please create or rename a page to have the slug "index" before exporting.');
      err.statusCode = 400;
      err.errorTitle = "Export failed: No homepage found";
      throw err;
    }

    // Two-pass collection validation (fail-fast): gather every invalid item across
    // all collections up front and refuse the export with a full per-item-per-field
    // error list. Also preflight templates. No HTML is written when this trips.
    // `manifestCollections` (every collection) feeds manifest.json; `itemPagesForSeo`
    // (valid items of hasItemPages collections, in listing order) feeds sitemap/robots
    // and the item-page render loop.
    const collectionSchemas = collectionsEnabled ? await listCollectionSchemas(collectionStorage, collectionScope) : [];
    const manifestCollections = [];
    const itemPagesForSeo = [];
    const invalidCollectionItems = [];
    const missingTemplates = [];
    for (const schema of collectionSchemas) {
      const items = await listCollectionItems(collectionStorage, collectionScope, schema.type);
      manifestCollections.push({ type: schema.type, itemPages: !!schema.hasItemPages, itemCount: items.length });
      for (const item of items) {
        if (item.invalid) {
          invalidCollectionItems.push({ collection: schema.type, slug: item.slug, errors: item.validationErrors });
        }
      }
      if (schema.hasItemPages) {
        const validItems = items.filter((item) => !item.invalid);
        itemPagesForSeo.push({ slugPrefix: schema.slugPrefix, items: validItems });
        // A hasItemPages collection with renderable items but no template.liquid
        // must fail BEFORE any disk write, not midway with partial artifacts.
        if (validItems.length > 0) {
          const template = await loadCollectionTemplate(collectionStorage, collectionScope, schema.type);
          if (template === null) missingTemplates.push(schema.type);
        }
      }
    }
    if (invalidCollectionItems.length > 0) {
      const err = new Error(
        `Export blocked: ${invalidCollectionItems.length} collection item(s) have validation errors. Fix them before exporting.`,
      );
      err.statusCode = 400;
      err.errorTitle = "Export failed: invalid collection items";
      err.validationErrors = invalidCollectionItems;
      throw err;
    }
    if (missingTemplates.length > 0) {
      const err = new Error(
        `Export blocked: collection(s) ${missingTemplates.join(", ")} have hasItemPages: true with renderable items but no template.liquid. Add the template before exporting.`,
      );
      err.statusCode = 400;
      err.errorTitle = "Export failed: missing collection template";
      throw err;
    }

    // --- Validation passed: from here on, disk writes are safe ---
    await fs.ensureDir(outputDir);
    await fs.ensureDir(outputAssetsDir);
    await fs.ensureDir(outputImagesDir);
    const generatedSiteIcons = await generateExportSiteIcons({
      outputDir,
      projectDir,
      projectName: projectData.name,
      siteTitle: projectData.siteTitle,
      siteIconSrc: processedThemeSettings?.general?.favicon || "",
    });

    // --- Generate sitemap.xml and robots.txt (shared pure builders; collection
    // item pages included via itemPagesForSeo) ---
    if (siteUrl && siteUrl.trim() !== "") {
      try {
        const sitemapXml = await buildSitemap(pagesDataArray, siteUrl, itemPagesForSeo);
        if (sitemapXml) {
          await fs.writeFile(path.join(outputDir, "sitemap.xml"), sitemapXml);
        }
        const robotsTxt = buildRobotsTxt(pagesDataArray, siteUrl, itemPagesForSeo);
        if (robotsTxt) {
          await fs.writeFile(path.join(outputDir, "robots.txt"), robotsTxt);
        }
      } catch (err) {
        console.warn(`Skipping sitemap/robots generation due to invalid siteUrl: ${siteUrl}`, err.message);
      }
    } else {
      console.warn(`Project ${projectId} has no siteUrl defined. Skipping sitemap.xml and robots.txt generation.`);
    }
    // --- End of new SEO file generation ---

    let validSiteUrl = false;
    if (siteUrl && siteUrl.trim() !== "") {
      try {
        new URL(siteUrl);
        validSiteUrl = true;
      } catch { /* invalid URL */ }
    }

    const headerData = await readGlobalWidgetFromDir(projectDir, "header");
    const footerData = await readGlobalWidgetFromDir(projectDir, "footer");

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
        siteIcons: generatedSiteIcons,
        enqueuedStyles: new Map(),
        enqueuedScripts: new Map(),
        exportVersion: version, // For cache busting
        currentCanonicalPath: `${pageData.slug || ""}.html`,
      };

      // Render header if exists (for each page to capture enqueued assets)
      if (headerData) {
        headerHtml = await renderWidget(projectId, "header", headerData, rawThemeSettings, "publish", sharedGlobals, null, collectionDeps);
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
            collectionDeps,
          );
        }
      }

      // Render footer if exists
      if (footerData) {
        footerHtml = await renderWidget(projectId, "footer", footerData, rawThemeSettings, "publish", sharedGlobals, null, collectionDeps);
      }

      // Determine if transparent header should be active for this page
      let extraBodyClasses = "";
      if (headerData?.settings?.transparent_on_hero) {
        const widgetOrder = pageData.widgetsOrder || Object.keys(pageData.widgets || {});
        const firstWidgetId = widgetOrder[0];
        const firstWidget = firstWidgetId && pageData.widgets?.[firstWidgetId];
        if (firstWidget && await widgetSupportsTransparentHeader(projectId, firstWidget.type)) {
          extraBodyClasses = "transparent-header";
        }
      }

      // Pass separated content sections to layout
      const renderedHtml = await renderPageLayout(
        projectId,
        {
          headerContent: headerHtml,
          mainContent: pageWidgetsHtml,
          footerContent: footerHtml,
          extraBodyClasses,
        },
        pageData,
        rawThemeSettings,
        "publish",
        sharedGlobals,
        collectionDeps,
      );

      // Format HTML using Prettier
      const formatResult = await formatHtml(renderedHtml);
      let processedHtml = formatResult.html;
      if (!formatResult.success) {
        console.warn(`Could not format HTML for ${pageData.id}.html: ${formatResult.error}. Writing unformatted HTML.`);
      }

      // Rewrite any remaining /uploads/ storage paths to their published asset locations.
      // Dedicated tags ({% image %}) already use the publish-mode base path, but generic
      // link fields store the raw storage path which needs rewriting here.
      processedHtml = processedHtml
        .replaceAll("/uploads/images/", "assets/images/")
        .replaceAll("/uploads/files/", "assets/files/");

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

      // Inject markdown alternate link into <head> when markdown export is enabled
      if (exportMarkdown) {
        const mdFilename = pageData.id === "index" || pageData.id === "home" ? "index.md" : `${pageData.id}.md`;
        let mdHref = mdFilename;
        if (validSiteUrl) {
          try {
            mdHref = new URL(mdFilename, siteUrl).href;
          } catch { /* fall back to relative */ }
        }
        processedHtml = processedHtml.replace("</head>", `  <link rel="alternate" type="text/markdown" href="${mdHref}">\n</head>`);
      }

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

    // --- Render collection item pages (spec Section 13) ---
    // For each hasItemPages collection, render every valid item to
    // {slugPrefix}/{itemSlug}.html with fresh per-item globals (no asset bleed),
    // the full header/footer/layout wrap, and the same HTML post-processing pages
    // receive — at outputPathPrefix "../" since items live one dir deep. Runs
    // BEFORE the validation report so item-page issues are included in it.
    if (collectionsEnabled) {
      // uuid -> page map for resolving item links (built once, shared across items).
      const pagesByUuidForItems = new Map();
      for (const page of pagesDataArray) {
        if (page.uuid) pagesByUuidForItems.set(page.uuid, page);
      }
      // Stable collection-item refs for resolving `menu`/`link`-type item settings
      // that target another item — loaded once, shared across every item. (Menu
      // maps are loaded lazily inside renderCollectionItemPage.)
      const collectionItemsByUuidForItems = await loadCollectionItemsByUuid(collectionStorage, collectionScope);
      const itemAppVersion = await getAppVersion();
      const itemEasterEgg = `<!--\nMade with Widgetizer v${itemAppVersion}\nPer aspera ad astra\n-->\n`;

      for (const schema of collectionSchemas) {
        if (!schema.hasItemPages) continue;

        const items = await listCollectionItems(collectionStorage, collectionScope, schema.type);
        const validItems = items.filter((item) => !item.invalid);
        if (validItems.length === 0) continue;

        // Template existence was preflighted in the two-pass validation; re-check
        // defensively so a race can never write partial output.
        const template = await loadCollectionTemplate(collectionStorage, collectionScope, schema.type);
        if (template === null) {
          const err = new Error(
            `Collection "${schema.type}" has hasItemPages: true but no template.liquid file at collection-types/${schema.type}/template.liquid`,
          );
          err.statusCode = 400;
          err.errorTitle = "Export failed: missing collection template";
          throw err;
        }

        const collectionOutputDir = path.join(outputDir, schema.slugPrefix);
        await fs.ensureDir(collectionOutputDir);

        for (const item of validItems) {
          // Fresh globals per item so enqueued assets never bleed between items.
          const sharedGlobals = {
            projectId,
            apiUrl: "",
            renderMode: "publish",
            themeSettingsRaw: rawThemeSettings,
            siteIcons: generatedSiteIcons,
            enqueuedStyles: new Map(),
            enqueuedScripts: new Map(),
            collectionCache: new Map(),
            pagesByUuid: pagesByUuidForItems,
            collectionItemsByUuid: collectionItemsByUuidForItems,
            exportVersion: version,
            outputPathPrefix: "../",
            currentCanonicalPath: `${schema.slugPrefix}/${item.slug}.html`,
          };

          // One shared pipeline renders the item page — header/footer + resolved
          // item + template + layout — identical to the page path. Everything
          // below (format, storage-path rewrite, markdown) stays export-specific.
          const {
            html: itemHtmlRendered,
            mainContentHtml: itemContentHtml,
            itemPageData,
          } = await renderCollectionItemPage(
            projectId,
            {
              schema,
              item,
              template,
              rawThemeSettings,
              renderMode: "publish",
              sharedGlobals,
              headerData,
              footerData,
              projectData,
              siteUrl,
            },
            collectionDeps,
          );
          let itemHtml = itemHtmlRendered;

          const itemFormat = await formatHtml(itemHtml);
          itemHtml = itemFormat.html;
          if (!itemFormat.success) {
            console.warn(`Could not format HTML for ${schema.slugPrefix}/${item.slug}.html: ${itemFormat.error}.`);
          }

          // Storage-path rewrite at the item's depth ("../").
          itemHtml = itemHtml
            .replaceAll("/uploads/images/", "../assets/images/")
            .replaceAll("/uploads/files/", "../assets/files/");

          if (devModeEnabled) {
            const validation = await validateHtml(itemHtml, `${schema.slugPrefix}/${item.slug}`);
            if (validation.issues.length > 0) {
              validationIssues.push({
                page: `${schema.slugPrefix}/${item.slug}`,
                filename: `${schema.slugPrefix}/${item.slug}.html`,
                issues: validation.issues,
              });
            }
          }

          itemHtml = itemEasterEgg + itemHtml;

          // Markdown alternate link → the item's .md (same dir; absolute when siteUrl valid).
          if (exportMarkdown) {
            let mdHref = `${item.slug}.md`;
            if (validSiteUrl) {
              try {
                mdHref = new URL(`${schema.slugPrefix}/${item.slug}.md`, siteUrl).href;
              } catch { /* fall back to relative */ }
            }
            itemHtml = itemHtml.replace("</head>", `  <link rel="alternate" type="text/markdown" href="${mdHref}">\n</head>`);
          }

          await fs.outputFile(path.join(collectionOutputDir, `${item.slug}.html`), itemHtml);

          // Markdown parity: content-only .md alongside the item HTML.
          if (exportMarkdown) {
            try {
              const turndown = new TurndownService({
                headingStyle: "atx",
                codeBlockStyle: "fenced",
                bulletListMarker: "-",
              });
              turndown.remove(["style", "script", "noscript", "form", "input", "button", "select", "textarea"]);
              const cleanHtml = itemContentHtml
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "")
                .replace(/<img[^>]*src=["'][^"']*placeholder[^"']*["'][^>]*>/gi, "");
              const itemMarkdown = turndown.turndown(cleanHtml);
              const frontmatter = [
                "---",
                `title: ${itemPageData.name || item.slug}`,
                `description: ${itemPageData.seo?.description || ""}`,
                `collection: ${schema.type}`,
                `slug: ${item.slug}`,
                "source_url:",
                `  html: '${item.slug}.html'`,
                `  md: '${item.slug}.md'`,
                "---",
                "",
                "",
              ].join("\n");
              await fs.outputFile(path.join(collectionOutputDir, `${item.slug}.md`), frontmatter + itemMarkdown);
            } catch (mdError) {
              console.warn(`Could not generate markdown for ${schema.slugPrefix}/${item.slug}: ${mdError.message}`);
            }
          }
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
        // Skip OS/system metadata (.DS_Store, __MACOSX, …) so it never lands in
        // the export directory or the packaged ZIP.
        await fs.copy(projectAssetsDir, outputAssetsDir, { filter: (src) => isExportableEntry(src) });
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
      const { readMediaFile } = await import("../services/mediaService.js");
      const mediaData = await readMediaFile(projectId);

      if (mediaData && mediaData.files) {
        const usedImages = mediaData.files.filter(
          (file) => file.usedIn && file.usedIn.length > 0 && file.path.startsWith("/uploads/images/"),
        );

        let copiedCount = 0;
        let skippedCount = 0;

        for (const imageFile of usedImages) {
          const sourceImagePath = path.join(projectDir, imageFile.path.replace(/^\//, ""));
          // Export images under the public assets/images/ directory.
          const targetImagePath = path.join(outputDir, "assets", "images", path.basename(imageFile.path));
          const hasLargeVariant = Boolean(imageFile.sizes?.large?.path);
          const isSvg = imageFile.type === "image/svg+xml" || imageFile.filename?.toLowerCase().endsWith(".svg");

          // Keep originals internal when a public large raster variant exists.
          const shouldCopyOriginal = isSvg || !hasLargeVariant;

          if (shouldCopyOriginal) {
            try {
              if (await fs.pathExists(sourceImagePath)) {
                await fs.ensureDir(path.dirname(targetImagePath));
                await fs.copy(sourceImagePath, targetImagePath);
                copiedCount++;
              }
            } catch (copyError) {
              console.error(`Error copying image ${imageFile.filename}:`, copyError);
            }
          }

          // Copy all generated sizes for this image
          if (imageFile.sizes) {
            for (const [sizeName, sizeInfo] of Object.entries(imageFile.sizes)) {
              // Skip thumb variants — only used for the media library UI
              if (sizeName === "thumb") continue;
              const sourceSizePath = path.join(projectDir, sizeInfo.path.replace(/^\//, ""));
              // Export generated image sizes under the public assets/images/ directory.
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
    // --- End Image Copy ---

    // --- Copy Used File Assets (PDFs, etc.) ---
    try {
      const { readMediaFile: readMediaForFiles } = await import("../services/mediaService.js");
      const mediaDataForFiles = await readMediaForFiles(projectId);

      if (mediaDataForFiles && mediaDataForFiles.files) {
        const usedFiles = mediaDataForFiles.files.filter(
          (file) => file.usedIn && file.usedIn.length > 0 && file.path.startsWith("/uploads/files/"),
        );

        let fileCopiedCount = 0;

        for (const fileAsset of usedFiles) {
          const sourceFilePath = path.join(projectDir, fileAsset.path.replace(/^\//, ""));
          const targetFilePath = path.join(outputDir, "assets", "files", path.basename(fileAsset.path));

          try {
            if (await fs.pathExists(sourceFilePath)) {
              await fs.ensureDir(path.dirname(targetFilePath));
              await fs.copy(sourceFilePath, targetFilePath);
              fileCopiedCount++;
            }
          } catch (copyError) {
            console.error(`Error copying file asset ${fileAsset.filename}:`, copyError);
          }
        }

        if (fileCopiedCount > 0) {
          console.log(`Export: Copied ${fileCopiedCount} used file asset(s) to assets/files/`);
        }
      }
    } catch (fileMediaError) {
      console.error("Error copying file assets for export:", fileMediaError);
      // Fallback to copying all files if tracking fails
      const projectFilesDir = path.join(projectDir, "uploads", "files");
      try {
        if (await fs.pathExists(projectFilesDir)) {
          const outputFilesDir = path.join(outputDir, "assets", "files");
          await fs.copy(projectFilesDir, outputFilesDir);
          console.log("Fallback: Copied all file assets due to tracking error");
        }
      } catch (fallbackError) {
        console.error("Error in fallback file asset copying:", fallbackError);
      }
    }
    // --- End File Asset Copy ---

    // Write manifest.json with export metadata
    const appVersionForManifest = await getAppVersion();
    const manifest = {
      generator: "widgetizer",
      widgetizerVersion: appVersionForManifest,
      themeId: projectData.theme,
      themeVersion: projectData.themeVersion || null,
      exportVersion: version,
      exportedAt: new Date().toISOString(),
      projectName: projectData.name,
      collections: manifestCollections,
    };
    await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    // Write widgetizer.forms.json if the project contains any core-form widgets.
    // Validation errors throw with statusCode 400 and are surfaced by the request handler.
    const { manifest: formsManifest, warnings: formsWarnings } = buildFormsManifest(
      pagesDataArray,
      appVersionForManifest,
    );
    for (const warning of formsWarnings) {
      console.warn(`[forms manifest] ${warning}`);
    }
    if (formsManifest) {
      await fs.writeFile(
        path.join(outputDir, "widgetizer.forms.json"),
        JSON.stringify(formsManifest, null, 2),
      );
      console.log(`Wrote widgetizer.forms.json with ${formsManifest.forms.length} form(s)`);
    }

    // Record this export in history (store relative dir name, not absolute path)
    const exportDirName = `${projectFolderName}-v${version}`;
    const exportRecord = await recordExport(projectId, version, exportDirName, "success");

    return { outputDir, version, exportDirName, exportRecord };
}

/**
 * Express handler: Exports a project to static HTML files.
 * Thin wrapper around exportProjectToDir().
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function exportProject(req, res) {
  const { projectId } = req.scope;

  try {

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Pass the scope-aware collection capability so `| collection` filters in
    // exported pages read items through the same storage adapter as the API path.
    // Kept separate from `req.body` options so a client can't inject it.
    const collectionDeps =
      req.adapters?.storage && req.scope ? { storage: req.adapters.storage, scope: req.scope } : null;
    const result = await exportProjectToDir(projectId, req.body || {}, collectionDeps);

    res.json({
      success: true,
      message: `Project exported successfully as version ${result.version}`,
      outputDir: result.outputDir,
      version: result.version,
      exportRecord: result.exportRecord,
    });
  } catch (error) {
    // Try to record failed export
    try {
      const version = exportRepo.getNextVersion(projectId);
      await recordExport(projectId, version, null, "failed");
    } catch (recordError) {
      console.error("Failed to record export failure:", recordError);
    }
    // Handle errors with explicit status codes (e.g., no index page)
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.errorTitle || "Export failed",
        message: error.message,
      });
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

// An export dir belongs to the actor only when it is the active project's own
// bundle. Reject any separator / parent-segment token first (a
// "<folder>-v1/../<otherTenant>-v1" would otherwise pass a bare prefix check and
// path.join would normalize it back INTO the publish dir, inside isWithinDirectory's
// bound), then anchor to `<folderName>-v<digits>` (the exportProject naming).
function exportDirBelongsToScope(req, exportDir) {
  const folderName = req.scope?.folderName;
  if (!folderName || typeof exportDir !== "string") return false;
  if (exportDir.includes("/") || exportDir.includes("\\") || exportDir.includes("..")) return false;
  if (exportDir === folderName) return true;
  const prefix = `${folderName}-v`;
  return exportDir.startsWith(prefix) && /^\d+$/.test(exportDir.slice(prefix.length));
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
    // Bind to the owner-resolved scope (see exportDirBelongsToScope).
    if (!exportDirBelongsToScope(req, exportDir)) {
      return res.status(404).json({ error: "Export directory not found" });
    }

    const userPublishDir = getPublishDir();
    const fullPath = path.join(userPublishDir, exportDir);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(userPublishDir);

    if (!isWithinDirectory(resolvedPath, publishPath)) {
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

// OS/system metadata that must never ship inside an exported ZIP. archiver globs
// with dot:true, so these would otherwise be bundled (the same junk the theme
// upload path already strips via removeDSStoreRecursive / __MACOSX filtering).
const SYSTEM_JUNK_FILENAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "ehthumbs.db",
  "Desktop.ini",
  ".Spotlight-V100",
  ".Trashes",
]);

/**
 * Whether a directory entry (path relative to the export root) should be included
 * in the exported ZIP. Excludes OS/system metadata files and __MACOSX trees.
 * @param {string} relPath - Forward-slash relative path of the entry
 * @returns {boolean}
 */
export function isExportableEntry(relPath) {
  const segments = relPath.split("/");
  if (segments.includes("__MACOSX")) return false;
  return !SYSTEM_JUNK_FILENAMES.has(segments[segments.length - 1]);
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
    // Bind to the owner-resolved scope (see exportDirBelongsToScope).
    if (!exportDirBelongsToScope(req, exportDir)) {
      return res.status(404).json({ error: "Export directory not found" });
    }

    const userPublishDir = getPublishDir();
    const fullPath = path.join(userPublishDir, exportDir);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const publishPath = path.resolve(userPublishDir);

    if (!isWithinDirectory(resolvedPath, publishPath)) {
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

    // Add all files from the export directory to the ZIP, skipping OS/system
    // metadata (.DS_Store, __MACOSX, etc.) so it never ships in the download.
    archive.directory(fullPath, false, (entry) => (isExportableEntry(entry.name) ? entry : false));

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

    const { projectId } = req.scope;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Validate project belongs to this user
    await getProjectFolderName(projectId);

    const exports = exportRepo.getExports(projectId);

    // Attach the on-disk total size per export (null when the directory is gone, e.g. a
    // failed export or one cleaned up by retention). Computed on read — no stored column.
    const exportsWithSize = await Promise.all(
      exports.map(async (record) => {
        const dir = resolveOutputDir(record.outputDir);
        let sizeBytes = null;
        // Whether this export carries an HTML-validation report. The report is
        // only written when developer mode was on AND issues were found, so its
        // presence reliably means "issues found"; its absence means clean OR
        // not validated (we can't tell which without a stored column).
        let hasIssuesReport = false;
        if (dir && (await fs.pathExists(dir))) {
          try {
            sizeBytes = await getDirectorySize(dir);
          } catch (err) {
            console.warn(`Could not compute size for export ${record.outputDir}:`, err.message);
          }
          hasIssuesReport = await fs.pathExists(path.join(dir, "__export__issues.html"));
        }
        return { ...record, sizeBytes, hasIssuesReport };
      }),
    );

    // Get the configured limit for exports to show + whether developer mode is on
    // (the latter gates the Issues column in the history UI).
    let maxExports = 10; // default fallback
    let developerMode = false;
    try {
      const { getSetting } = await import("./appSettingsController.js");
      const maxVersionsSetting = await getSetting("export.maxVersionsToKeep");
      maxExports = parseInt(maxVersionsSetting || "10", 10) || 10;
      developerMode = Boolean(await getSetting("developer.enabled"));
    } catch (error) {
      console.warn("Could not load app settings for export display limit, using default of 10. Error:", error.message);
    }

    res.json({
      success: true,
      exports: exportsWithSize,
      totalExports: exportsWithSize.length,
      maxVersionsToKeep: maxExports,
      developerMode,
    });
  } catch (error) {
    if (handleProjectResolutionError(res, error)) return;
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

    const { version } = req.params;
    const { projectId } = req.scope;

    if (!projectId || !version) {
      return res.status(400).json({ error: "Project ID and version are required" });
    }

    // Validate project belongs to this user
    await getProjectFolderName(projectId);

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
    if (handleProjectResolutionError(res, error)) return;
    console.error("Error deleting export:", error);
    res.status(500).json({
      error: "Failed to delete export",
      message: error.message,
    });
  }
}
