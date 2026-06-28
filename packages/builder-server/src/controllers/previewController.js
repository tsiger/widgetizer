import fs from "fs-extra";
import path from "path";
import { getProjectDir, CORE_WIDGETS_DIR, LOCALES_DIR } from "../config.js";
import { getContentType } from "../utils/mimeTypes.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import { getSetting } from "../db/repositories/settingsRepository.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import {
  renderWidget,
  renderPageLayout,
  renderCollectionItemPage,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader,
} from "../services/renderingService.js";
import {
  getCollectionSchema,
  loadCollectionTemplate,
  loadCollectionItemsByUuid,
} from "../services/collectionService.js";
import { readProjectThemeData } from "./themeController.js";
import { listProjectPagesData, readGlobalWidgetData } from "./pageController.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { updateGlobalWidgetMediaUsage } from "../services/mediaUsageService.js";
import { isProjectResolutionError } from "../utils/projectErrors.js";
import { generateToken, getToken } from "../services/previewTokenStore.js";

// Inject the runtime script and base tag into rendered HTML
function injectRuntimeScript(html, previewMode = "editor") {
  const safeMode = previewMode === "standalone" ? "standalone" : "editor";
  const script = `<script src="/runtime/previewRuntime.js" type="module" data-preview-mode="${safeMode}"></script>`;
  html = html.replace(/<\/body>/i, `${script}\n</body>`);

  // Editor mode: inject designMode flag in <head> so it's available before
  // any deferred widget scripts run (module scripts execute after defer scripts)
  if (safeMode === "editor") {
    const designModeScript = `<script>window.Widgetizer={designMode:true};</script>`;
    html = html.replace(/<\/head>/i, `${designModeScript}\n</head>`);
  }

  return html;
}

// Inject base tag for relative URL resolution
function injectBaseTag(html) {
  const apiUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const baseTag = `<base href="${apiUrl}">`;
  return html.replace(/<\/head>/i, `${baseTag}\n</head>`);
}

// Derive the scope-aware collection capability for the render path from the
// request, so the `| collection` filter can read items through the same storage
// adapter the API path uses. Null when scope/storage are unavailable (the filter
// then returns []), keeping non-collection previews unchanged.
function collectionDepsFromReq(req) {
  const storage = req?.adapters?.storage;
  const scope = req?.scope;
  return storage && scope ? { storage, scope } : null;
}


/**
 * Core rendering logic for preview HTML generation.
 * Renders header, page widgets, footer, and injects runtime script.
 * @param {Object} pageData - Page content including widgets and metadata
 * @param {Object} rawThemeSettings - Theme settings for rendering
 * @param {string} previewMode - "editor" or "standalone"
 * @returns {Promise<string>} Rendered HTML string
 */
async function generatePreviewHtml(pageData, rawThemeSettings, previewMode, collectionDeps = null) {
  const activeProjectId = projectRepo.getActiveProjectId();

  if (!activeProjectId) {
    throw Object.assign(new Error("No active project found"), { status: 404 });
  }

  // Create shared globals for asset enqueue system
  const apiUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const sharedGlobals = {
    projectId: activeProjectId,
    apiUrl,
    renderMode: "preview",
    themeSettingsRaw: rawThemeSettings,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
    currentCanonicalPath: `${pageData.slug || ""}.html`,
  };

  let headerContent = "";
  let mainContent = "";
  let footerContent = "";

  // Render header widget first (if it exists)
  if (pageData.globalWidgets?.header) {
    try {
      headerContent = await renderWidget(
        activeProjectId,
        "header",
        pageData.globalWidgets.header,
        rawThemeSettings,
        "preview",
        sharedGlobals,
        null,
        collectionDeps,
      );
    } catch (error) {
      console.error("Error rendering header widget:", error);
    }
  }

  // Render page widgets in the middle
  const widgetOrder = pageData.widgetsOrder || Object.keys(pageData.widgets || {});

  if (widgetOrder.length > 0 && pageData.widgets) {
    let widgetIndex = 0;
    for (const widgetId of widgetOrder) {
      const widget = pageData.widgets[widgetId];
      if (!widget) continue;
      widgetIndex += 1;
      const renderedWidgetHtml = await renderWidget(
        activeProjectId,
        widgetId,
        widget,
        rawThemeSettings,
        "preview",
        sharedGlobals,
        widgetIndex,
        collectionDeps,
      );
      mainContent += renderedWidgetHtml;
    }
  } else {
    // No page widgets - show empty state message
    let emptyStateTitle = "No widgets yet";
    let emptyStateDescription = "Start building your page by adding widgets from the sidebar";

    try {
      const userLocale = getSetting("general.language") || "en";
      const localePath = path.join(LOCALES_DIR, `${userLocale}.json`);
      if (await fs.pathExists(localePath)) {
        const localeData = JSON.parse(await fs.readFile(localePath, "utf-8"));
        emptyStateTitle = localeData?.preview?.emptyState?.title || emptyStateTitle;
        emptyStateDescription = localeData?.preview?.emptyState?.description || emptyStateDescription;
      }
    } catch (error) {
      console.warn("Could not load translations for empty state, using default:", error.message);
    }

    mainContent += `
      <div class="preview-empty-state">
        <style>
          .preview-empty-state {
            min-height: 30vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: var(--space-3xl, 3rem);
            text-align: center;
          }
          .preview-empty-state-title {
            font-size: var(--font-size-lg, 1.125rem);
            color: var(--text-muted, #6b7280);
            margin-bottom: 0.5rem;
            font-weight: var(--font-weight-medium, 500);
          }
          .preview-empty-state-description {
            font-size: var(--font-size-sm, 0.875rem);
            color: var(--text-muted, #6b7280);
            max-width: 28rem;
          }
        </style>
        <p class="preview-empty-state-title">
          ${emptyStateTitle}
        </p>
        <p class="preview-empty-state-description">
          ${emptyStateDescription}
        </p>
      </div>
    `;
  }

  // Render footer widget last (if it exists)
  if (pageData.globalWidgets?.footer) {
    try {
      footerContent = await renderWidget(
        activeProjectId,
        "footer",
        pageData.globalWidgets.footer,
        rawThemeSettings,
        "preview",
        sharedGlobals,
        null,
        collectionDeps,
      );
    } catch (error) {
      console.error("Error rendering footer widget:", error);
    }
  }

  // Determine if transparent header should be active for this page
  let extraBodyClasses = "";
  const headerSettings = pageData.globalWidgets?.header?.settings;
  if (headerSettings?.transparent_on_hero) {
    const widgetOrder = pageData.widgetsOrder || Object.keys(pageData.widgets || {});
    const firstWidgetId = widgetOrder[0];
    const firstWidget = firstWidgetId && pageData.widgets?.[firstWidgetId];
    if (firstWidget && await widgetSupportsTransparentHeader(activeProjectId, firstWidget.type)) {
      extraBodyClasses = "transparent-header";
    }
  }

  let renderedHtml = await renderPageLayout(
    activeProjectId,
    { headerContent, mainContent, footerContent, extraBodyClasses },
    pageData,
    rawThemeSettings,
    "preview",
    sharedGlobals,
    collectionDeps,
  );

  renderedHtml = injectBaseTag(renderedHtml);
  renderedHtml = injectRuntimeScript(renderedHtml, previewMode);

  return renderedHtml;
}

/**
 * Generates a full HTML preview of a page with header, widgets, and footer.
 * @param {import('express').Request} req - Express request object with pageData, themeSettings, and previewMode in body
 * @param {import('express').Response} res - Express response object (sends HTML)
 * @returns {Promise<void>}
 */
export async function generatePreview(req, res) {
  try {
    const { pageData, themeSettings: rawThemeSettings, previewMode } = req.body;
    const html = await generatePreviewHtml(pageData, rawThemeSettings, previewMode, collectionDepsFromReq(req));
    res.send(html);
  } catch (error) {
    console.error("Error generating preview:", error);
    if (error.status === 404 || isProjectResolutionError(error)) {
      return res.status(404).send(`<html><body><h1>Preview Error</h1><pre>${error.message}</pre></body></html>`);
    }
    res.status(500).send(`<html><body><h1>Preview Error</h1><pre>${error.message}\n${error.stack}</pre></body></html>`);
  }
}

/**
 * Creates a preview token for token-based preview rendering.
 * Generates the preview HTML and stores it behind a short-lived token.
 * @param {import('express').Request} req - Express request object with pageData, themeSettings, and previewMode in body
 * @param {import('express').Response} res - Express response object (sends { token })
 * @returns {Promise<void>}
 */
export async function createPreviewToken(req, res) {
  try {
    const { pageData, themeSettings: rawThemeSettings, previewMode } = req.body;
    const html = await generatePreviewHtml(pageData, rawThemeSettings, previewMode, collectionDepsFromReq(req));
    const token = generateToken(html);
    res.json({ token });
  } catch (error) {
    console.error("Error creating preview token:", error);
    if (error.status === 404 || isProjectResolutionError(error)) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create preview token", message: error.message });
  }
}

/**
 * Renders a preview from a stored token.
 * @param {import('express').Request} req - Express request object with token in params
 * @param {import('express').Response} res - Express response object (sends HTML or 404)
 * @returns {void}
 */
export function renderPreviewToken(req, res) {
  const { token } = req.params;
  const html = getToken(token);
  if (!html) {
    return res.status(404).send("<html><body><h1>Preview expired</h1><p>This preview token has expired or is invalid.</p></body></html>");
  }
  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

/**
 * Builds a render token for a single collection item, rendered through its theme
 * template.liquid inside the layout (header/footer/main) — the same pipeline export
 * uses, in "preview" mode. The body carries the settings to render; the navigable
 * site preview (CollectionItemPagePreview) loads the saved item and passes those in,
 * so this backs the unified, browsable item preview.
 *
 * Collection reads go through the scope-aware storage adapter (collectionDepsFromReq),
 * so the item/template/schema are tenant-isolated exactly like the API path. The
 * single shared `renderCollectionItemPage` pipeline (engine + injected collection
 * helpers) is the same one export drives — no preview-only render fork.
 *
 * Body: { collectionType, slug, settings }. Returns { token }; the caller points an
 * iframe at GET /render/:token (shared token store with page previews).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function createCollectionPreviewToken(req, res) {
  try {
    // Collections are read through the same scope-aware adapter the API path uses.
    const collectionDeps = collectionDepsFromReq(req);
    if (!collectionDeps) {
      return res.status(404).json({ error: "No active project found" });
    }
    const { storage, scope } = collectionDeps;

    const { collectionType, slug, settings } = req.body || {};
    if (!collectionType) {
      return res.status(400).json({ error: "collectionType is required" });
    }

    // Schema must exist; template is required to render an item page.
    const schema = await getCollectionSchema(storage, scope, collectionType);
    if (!schema) {
      return res.status(404).json({ error: `Collection "${collectionType}" not found.` });
    }
    const template = await loadCollectionTemplate(storage, scope, collectionType);
    if (!template) {
      return res.status(400).json({
        error: "Preview unavailable",
        message: `This collection has no template.liquid, so its items have no page to preview. Enable hasItemPages and add a template to ${collectionType}.`,
      });
    }

    const activeProjectId = scope.projectId;
    const projectData = projectRepo.getProjectById(activeProjectId);
    if (!projectData) {
      return res.status(404).json({ error: "No active project found" });
    }
    const folder = projectData.folderName;

    const rawThemeSettings = await readProjectThemeData(activeProjectId);
    const headerData = await readGlobalWidgetData(folder, "header");
    const footerData = await readGlobalWidgetData(folder, "footer");

    // uuid -> page map so pageUuid links inside the item resolve to slugs.
    // listProjectPagesData reads data/projects/<folder>/pages, so it takes the
    // FOLDER name (not the UUID) — matching the export path.
    const pages = await listProjectPagesData(folder);
    const pagesByUuid = new Map();
    for (const page of pages || []) {
      if (page.uuid) pagesByUuid.set(page.uuid, page);
    }
    // Stable collection-item refs for resolving `menu`/`link`-type item settings
    // that target another item. Menu maps are loaded lazily inside the render.
    const collectionItemsByUuid = await loadCollectionItemsByUuid(storage, scope);

    // Assemble the item to render from the posted settings (the navigable preview
    // passes the saved item's settings).
    const safeSlug = (slug && String(slug)) || "preview";
    const now = new Date().toISOString();
    const previewItem = {
      id: safeSlug,
      uuid: "preview",
      slug: safeSlug,
      schemaVersion: schema.schemaVersion,
      created: now,
      updated: now,
      settings: settings || {},
    };

    const apiUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
    // Preview is served at a single URL (root), so no depth prefixing: assets
    // resolve via absolute API URLs in preview mode (outputPathPrefix === "").
    const sharedGlobals = {
      projectId: activeProjectId,
      apiUrl,
      renderMode: "preview",
      themeSettingsRaw: rawThemeSettings,
      enqueuedStyles: new Map(),
      enqueuedScripts: new Map(),
      collectionCache: new Map(),
      pagesByUuid,
      collectionItemsByUuid,
      outputPathPrefix: "",
      currentCanonicalPath: `${schema.slugPrefix}/${safeSlug}.html`,
    };

    // One shared pipeline renders the item page — header/footer + resolved item +
    // template + layout — identical to the export path.
    let { html } = await renderCollectionItemPage(
      activeProjectId,
      {
        schema,
        item: previewItem,
        template,
        rawThemeSettings,
        renderMode: "preview",
        sharedGlobals,
        headerData,
        footerData,
        projectData,
        siteUrl: "",
      },
      collectionDeps,
    );

    html = injectBaseTag(html);
    html = injectRuntimeScript(html, "standalone");

    const token = generateToken(html);
    res.json({ token });
  } catch (error) {
    console.error("Error creating collection preview:", error);
    if (error.status === 404 || isProjectResolutionError(error)) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create collection preview", message: error.message });
  }
}

/**
 * Renders a single widget HTML for real-time preview updates.
 * @param {import('express').Request} req - Express request object with widgetId, widget data, and themeSettings in body
 * @param {import('express').Response} res - Express response object (sends HTML)
 * @returns {Promise<void>}
 */
export async function renderSingleWidget(req, res) {
  try {
    const { widgetId, widget, themeSettings: rawThemeSettings, currentCanonicalPath } = req.body; // Expect themeSettings too
    const activeProjectId = req.activeProject.id;

    // Provide sharedGlobals so we can read back enqueued assets after render.
    // currentCanonicalPath flows from the morph request so a menu-bearing widget
    // (header/footer) keeps its active-state on live edits (D3).
    const sharedGlobals = {
      renderMode: "preview",
      enqueuedStyles: new Map(),
      enqueuedScripts: new Map(),
      currentCanonicalPath: typeof currentCanonicalPath === "string" ? currentCanonicalPath : "",
    };

    const renderedWidget = await renderWidget(activeProjectId, widgetId, widget, rawThemeSettings || {}, "preview", sharedGlobals, null, collectionDepsFromReq(req));

    // Append enqueued asset tags so the preview runtime can load them on morph
    const assetTags = renderEnqueuedAssetTags(sharedGlobals);

    res.send(renderedWidget + assetTags);
  } catch (error) {
    console.error("Widget rendering error:", error);
    if (isProjectResolutionError(error)) {
      return res.status(404).json({ error: "Project not found", message: error.message });
    }
    res.status(500).json({
      error: "Failed to render widget",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
}

/**
 * Retrieves global widgets (header and footer) data for the active project.
 * Returns the raw JSON data, not rendered HTML.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getGlobalWidgets(req, res) {
  try {
    const { scope } = req;
    const { storage } = req.adapters;
    // Global widgets *data* is stored in pages/global, not widgets/global

    // Read header.json and footer.json
    const globalWidgets = {};

    const headerBuf = await storage.read(scope, "pages/global/header.json");
    if (headerBuf != null) {
      try {
        globalWidgets.header = JSON.parse(headerBuf.toString("utf8"));
      } catch (readError) {
        console.error(`Error reading global header data for project ${scope.projectId}:`, readError);
        globalWidgets.header = null; // Set to null on read/parse error
      }
    } else {
      console.warn(`Global header data file not found for project ${scope.projectId}.`);
      globalWidgets.header = null;
    }

    const footerBuf = await storage.read(scope, "pages/global/footer.json");
    if (footerBuf != null) {
      try {
        globalWidgets.footer = JSON.parse(footerBuf.toString("utf8"));
      } catch (readError) {
        console.error(`Error reading global footer data for project ${scope.projectId}:`, readError);
        globalWidgets.footer = null; // Set to null on read/parse error
      }
    } else {
      console.warn(`Global footer data file not found for project ${scope.projectId}.`);
      globalWidgets.footer = null;
    }

    res.json(globalWidgets);
  } catch (error) {
    console.error("Error getting global widgets:", error);
    if (isProjectResolutionError(error)) {
      return res.status(404).json({ error: "Project not found", message: error.message });
    }
    res.status(500).json({
      error: "Failed to get global widgets data",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
}

/**
 * Saves a global widget (header or footer) for the active project.
 * Updates media usage tracking after saving.
 * @param {import('express').Request} req - Express request object with widget type in params and widget data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function saveGlobalWidget(req, res) {
  try {
    const { type } = req.params;
    const widgetData = req.body;

    if (type !== "header" && type !== "footer") {
      return res.status(400).json({ error: "Invalid widget type" });
    }

    const { scope } = req;
    const { storage } = req.adapters;

    // Save the widget — storage.write creates parent directories as needed.
    await storage.write(scope, `pages/global/${type}.json`, JSON.stringify(widgetData, null, 2));

    // Update media usage
    try {
      await updateGlobalWidgetMediaUsage(scope.projectId, `global:${type}`, widgetData);
    } catch (usageError) {
      console.error("Error updating media usage for global widget:", usageError);
      // Don't fail the save if usage update fails, but log it
    }

    res.json({ success: true, data: widgetData });
  } catch (error) {
    console.error("Error saving global widget:", error);
    if (isProjectResolutionError(error)) {
      return res.status(404).json({ error: "Project not found", message: error.message });
    }
    res.status(500).json({ error: "Failed to save global widget" });
  }
}

/**
 * Serves an asset file (CSS, JS, images, fonts) from a project folder.
 * Validates paths to prevent directory traversal attacks.
 * @param {import('express').Request} req - Express request object with projectId, folder, and filepath in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function serveAsset(req, res) {
  const { projectId, folder, filepath } = req.params;
  // Allow-list the folder segment: only "assets" and "widgets" are legitimate.
  // An unsanitized folder of "../.." would widen baseDir below up to DATA_DIR and
  // defeat the isWithinDirectory check against the widened base.
  if (folder !== "assets" && folder !== "widgets") {
    return res.status(400).send("Invalid asset folder");
  }
  // Express 5 wildcard returns an array of path segments - join them
  const assetSubpath = Array.isArray(filepath) ? filepath.join("/") : filepath;

  if (!assetSubpath) {
    return res.status(400).send("Asset path is required");
  }

  const normalizedSubpath = path.normalize(assetSubpath).replace(/^(\.\.(\/|\\|$))+/, "");

  // Core widget assets (type prefixed with "core-") live in CORE_WIDGETS_DIR, not the project dir.
  // The widget type is the first path segment, e.g. "core-divider/preview.png".
  const isCoreWidgetAsset = folder === "widgets" && normalizedSubpath.startsWith("core-");

  // Build the path to the asset file
  const projectFolderName = await getProjectFolderName(projectId);
  const baseDir = isCoreWidgetAsset ? CORE_WIDGETS_DIR : path.join(getProjectDir(projectFolderName), folder);
  const filePath = path.resolve(baseDir, normalizedSubpath);

  if (!isWithinDirectory(filePath, baseDir)) {
    return res.status(400).send("Invalid asset path");
  }

  try {
    let resolvedPath = filePath;

    // Fallback: if a theme widget asset isn't in its widget folder, try the theme assets folder.
    // Core widget assets resolve against CORE_WIDGETS_DIR and have no project-assets fallback.
    if (!isCoreWidgetAsset && !(await fs.pathExists(resolvedPath)) && folder === "widgets") {
      const assetsDir = path.join(getProjectDir(projectFolderName), "assets");
      const fallbackPath = path.resolve(assetsDir, path.basename(normalizedSubpath));
      if (isWithinDirectory(fallbackPath, assetsDir) && (await fs.pathExists(fallbackPath))) {
        resolvedPath = fallbackPath;
      }
    }

    if (!(await fs.pathExists(resolvedPath))) {
      return res.status(404).send(`Asset ${assetSubpath} not found in ${folder}`);
    }

    // File exists, read it (readFile is compatible)
    const fileContent = await fs.readFile(resolvedPath);

    // Set content type based on file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = getContentType(ext, null);
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Send the file
    return res.send(fileContent);
  } catch (error) {
    console.error(`Error serving asset: ${error.message}`);
    console.error(error.stack);
    if (isProjectResolutionError(error)) {
      return res.status(404).json({ error: "Project not found", message: error.message });
    }
    return res.status(500).json({
      error: "Failed to serve asset",
      message: error.message,
      path: filePath,
    });
  }
}
