import fs from "fs-extra";
import path from "path";
import { getProjectDir } from "../config.js";
import { getContentType } from "../utils/mimeTypes.js";
import { isWithinDirectory } from "../utils/pathSecurity.js";
import { getSetting } from "../db/repositories/settingsRepository.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { updateGlobalWidgetMediaUsage } from "../services/mediaUsageService.js";
import { isProjectResolutionError } from "../utils/projectErrors.js";
import { generateToken, getToken } from "../services/previewTokenStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inject the runtime script and base tag into rendered HTML
function injectRuntimeScript(html, previewMode = "editor") {
  const safeMode = previewMode === "standalone" ? "standalone" : "editor";
  const builderOriginAttr =
    process.env.PREVIEW_ISOLATION === "true" && process.env.BUILDER_ORIGIN
      ? ` data-builder-origin="${process.env.BUILDER_ORIGIN}"`
      : "";
  const script = `<script src="/runtime/previewRuntime.js" type="module" data-preview-mode="${safeMode}"${builderOriginAttr}></script>`;
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

/**
 * Core rendering logic for preview HTML generation.
 * Renders header, page widgets, footer, and injects runtime script.
 * @param {Object} pageData - Page content including widgets and metadata
 * @param {Object} rawThemeSettings - Theme settings for rendering
 * @param {string} previewMode - "editor" or "standalone"
 * @param {string} userId - The user ID for path scoping
 * @returns {Promise<string>} Rendered HTML string
 */
async function generatePreviewHtml(pageData, rawThemeSettings, previewMode, userId) {
  const activeProjectId = projectRepo.getActiveProjectId(userId);

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
        userId,
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
        userId,
      );
      mainContent += renderedWidgetHtml;
    }
  } else {
    // No page widgets - show empty state message
    let emptyStateTitle = "No widgets yet";
    let emptyStateDescription = "Start building your page by adding widgets from the sidebar";

    try {
      const userLocale = getSetting("general.language", userId) || "en";
      const localePath = path.join(__dirname, `../../src/locales/${userLocale}.json`);
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
        userId,
      );
    } catch (error) {
      console.error("Error rendering footer widget:", error);
    }
  }

  let renderedHtml = await renderPageLayout(
    activeProjectId,
    { headerContent, mainContent, footerContent },
    pageData,
    rawThemeSettings,
    "preview",
    sharedGlobals,
    userId,
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
    const html = await generatePreviewHtml(pageData, rawThemeSettings, previewMode, req.userId);
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
    const html = await generatePreviewHtml(pageData, rawThemeSettings, previewMode, req.userId);
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
 * Renders a single widget HTML for real-time preview updates.
 * @param {import('express').Request} req - Express request object with widgetId, widget data, and themeSettings in body
 * @param {import('express').Response} res - Express response object (sends HTML)
 * @returns {Promise<void>}
 */
export async function renderSingleWidget(req, res) {
  try {
    const { widgetId, widget, themeSettings: rawThemeSettings } = req.body; // Expect themeSettings too

    // Get active project
    const activeProjectId = projectRepo.getActiveProjectId(req.userId);

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Call the service function, passing projectId and rawThemeSettings
    const renderedWidget = await renderWidget(activeProjectId, widgetId, widget, rawThemeSettings || {}, "preview", null, null, req.userId);

    res.send(renderedWidget);
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
    // Get active project
    const activeProjectId = projectRepo.getActiveProjectId(req.userId);

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectFolderName = await getProjectFolderName(activeProjectId, req.userId);
    const projectDir = getProjectDir(projectFolderName, req.userId);
    // Global widgets *data* is stored in pages/global, not widgets/global
    const globalPagesDir = path.join(projectDir, "pages", "global");

    // Read header.json and footer.json
    const globalWidgets = {};

    const headerPath = path.join(globalPagesDir, "header.json");
    if (await fs.pathExists(headerPath)) {
      try {
        const headerContent = await fs.readFile(headerPath, "utf-8");
        globalWidgets.header = JSON.parse(headerContent);
      } catch (readError) {
        console.error(`Error reading global header data for project ${activeProjectId}:`, readError);
        globalWidgets.header = null; // Set to null on read/parse error
      }
    } else {
      console.warn(`Global header data file not found for project ${activeProjectId}.`);
      globalWidgets.header = null;
    }

    const footerPath = path.join(globalPagesDir, "footer.json");
    if (await fs.pathExists(footerPath)) {
      try {
        const footerContent = await fs.readFile(footerPath, "utf-8");
        globalWidgets.footer = JSON.parse(footerContent);
      } catch (readError) {
        console.error(`Error reading global footer data for project ${activeProjectId}:`, readError);
        globalWidgets.footer = null; // Set to null on read/parse error
      }
    } else {
      console.warn(`Global footer data file not found for project ${activeProjectId}.`);
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

    // Get active project
    const activeProjectId = projectRepo.getActiveProjectId(req.userId);

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectFolderName = await getProjectFolderName(activeProjectId, req.userId);
    const projectDir = getProjectDir(projectFolderName, req.userId);
    const globalPagesDir = path.join(projectDir, "pages", "global");

    // Ensure global directory exists
    await fs.ensureDir(globalPagesDir);

    // Save the widget
    const filePath = path.join(globalPagesDir, `${type}.json`);
    await fs.outputFile(filePath, JSON.stringify(widgetData, null, 2));

    // Update media usage
    try {
      await updateGlobalWidgetMediaUsage(activeProjectId, `global:${type}`, widgetData, req.userId);
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
  // Express 5 wildcard returns an array of path segments - join them
  const assetSubpath = Array.isArray(filepath) ? filepath.join("/") : filepath;

  if (!assetSubpath) {
    return res.status(400).send("Asset path is required");
  }

  // Build the path to the asset file
  const projectFolderName = await getProjectFolderName(projectId, req.userId);
  const baseDir = path.join(getProjectDir(projectFolderName, req.userId), folder);
  const normalizedSubpath = path.normalize(assetSubpath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.resolve(baseDir, normalizedSubpath);

  if (!isWithinDirectory(filePath, baseDir)) {
    return res.status(400).send("Invalid asset path");
  }

  try {
    // Check if file exists using fs-extra
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).send(`Asset ${assetSubpath} not found in ${folder}`);
    }

    // File exists, read it (readFile is compatible)
    const fileContent = await fs.readFile(filePath);

    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
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
