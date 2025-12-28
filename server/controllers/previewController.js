import fs from "fs-extra";
import path from "path";
import { getProjectDir, getAppSettingsPath } from "../config.js";
import { readProjectsFile } from "./projectController.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { renderWidget, renderPageLayout } from "../services/renderingService.js";
import { getProjectSlug } from "../utils/projectHelpers.js";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inject the runtime script
function injectRuntimeScript(html) {
  // Use the SERVER_URL environment variable or fallback to localhost
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
  const scriptUrl = `${serverUrl}/runtime/previewRuntime.js`;
  const script = `<script src="${scriptUrl}" type="module"></script>`;
  // Ensure replacement happens even with attributes on body tag
  return html.replace(/<\/body>/i, `${script}\n</body>`);
}

// Generate preview HTML
export async function generatePreview(req, res) {
  try {
    const { pageData, themeSettings: rawThemeSettings } = req.body;

    // Get active project
    const projectsData = await readProjectsFile();
    const activeProjectId = projectsData.activeProjectId;

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
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
        );
      } catch (error) {
        console.error("Error rendering header widget:", error);
        // Continue without header rather than failing completely
      }
    }

    // Render page widgets in the middle
    const widgetOrder = pageData.widgetsOrder || Object.keys(pageData.widgets || {});

    if (widgetOrder.length > 0 && pageData.widgets) {
      // Render widgets sequentially to preserve enqueue order
      for (const widgetId of widgetOrder) {
        const widget = pageData.widgets[widgetId];
        if (!widget) continue;
        const renderedWidgetHtml = await renderWidget(
          activeProjectId,
          widgetId,
          widget,
          rawThemeSettings,
          "preview",
          sharedGlobals,
        );
        mainContent += renderedWidgetHtml;
      }
    } else {
      // No page widgets - show empty state message
      let emptyStateTitle = "No widgets yet";
      let emptyStateDescription = "Start building your page by adding widgets from the sidebar";

      try {
        // Read app settings to get user's locale
        const appSettingsPath = getAppSettingsPath();
        if (await fs.pathExists(appSettingsPath)) {
          const appSettings = JSON.parse(await fs.readFile(appSettingsPath, "utf-8"));
          const userLocale = appSettings?.general?.language || "en";

          // Load the corresponding locale file
          const localePath = path.join(__dirname, `../../src/locales/${userLocale}.json`);
          if (await fs.pathExists(localePath)) {
            const localeData = JSON.parse(await fs.readFile(localePath, "utf-8"));
            emptyStateTitle = localeData?.preview?.emptyState?.title || emptyStateTitle;
            emptyStateDescription = localeData?.preview?.emptyState?.description || emptyStateDescription;
          }
        }
      } catch (error) {
        console.warn("Could not load translations for empty state, using default:", error.message);
        // Fall back to English defaults
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
        );
      } catch (error) {
        console.error("Error rendering footer widget:", error);
        // Continue without footer rather than failing completely
      }
    }

    let renderedHtml = await renderPageLayout(
      activeProjectId,
      { headerContent, mainContent, footerContent }, // Pass separated content sections
      pageData, // Pass the full page data
      rawThemeSettings, // Pass the raw theme settings
      "preview", // Render mode
      sharedGlobals, // Pass shared globals with enqueued assets
    );

    // Inject runtime script
    renderedHtml = injectRuntimeScript(renderedHtml);

    res.send(renderedHtml);
  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).send(`<html><body><h1>Preview Error</h1><pre>${error.message}\n${error.stack}</pre></body></html>`);
  }
}

// Render a single widget (for real-time updates)
export async function renderSingleWidget(req, res) {
  try {
    const { widgetId, widget, themeSettings: rawThemeSettings } = req.body; // Expect themeSettings too

    // Get active project
    const projectsData = await readProjectsFile();
    const activeProjectId = projectsData.activeProjectId;

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Call the service function, passing projectId and rawThemeSettings
    const renderedWidget = await renderWidget(activeProjectId, widgetId, widget, rawThemeSettings || {}, "preview");

    res.send(renderedWidget);
  } catch (error) {
    console.error("Widget rendering error:", error);
    res.status(500).json({
      error: "Failed to render widget",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
}

/**
 * Get global widgets (header and footer) data.
 * Note: This function fetches the *data*, not the rendered HTML.
 */
export async function getGlobalWidgets(req, res) {
  try {
    // Get active project
    const projectsData = await readProjectsFile();
    const activeProjectId = projectsData.activeProjectId;

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = await getProjectSlug(activeProjectId);
    const projectDir = getProjectDir(projectSlug);
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
    res.status(500).json({
      error: "Failed to get global widgets data",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
}

/**
 * Save a global widget (header or footer)
 */
export async function saveGlobalWidget(req, res) {
  try {
    const { type } = req.params;
    const widgetData = req.body;

    if (type !== "header" && type !== "footer") {
      return res.status(400).json({ error: "Invalid widget type" });
    }

    // Get active project
    const projectsData = await readProjectsFile();
    const activeProjectId = projectsData.activeProjectId;

    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = await getProjectSlug(activeProjectId);
    const projectDir = getProjectDir(projectSlug);
    const globalPagesDir = path.join(projectDir, "pages", "global");

    // Ensure global directory exists
    await fs.ensureDir(globalPagesDir);

    // Save the widget
    const filePath = path.join(globalPagesDir, `${type}.json`);
    await fs.outputFile(filePath, JSON.stringify(widgetData, null, 2));

    res.json({ success: true, data: widgetData });
  } catch (error) {
    console.error("Error saving global widget:", error);
    res.status(500).json({ error: "Failed to save global widget" });
  }
}

/**
 * Serve an asset file from a project folder
 */
export async function serveAsset(req, res) {
  const { projectId, folder, filename } = req.params;

  // Build the path to the asset file
  const projectSlug = await getProjectSlug(projectId);
  const filePath = path.join(getProjectDir(projectSlug), folder, filename);

  try {
    // Check if file exists using fs-extra
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).send(`Asset ${filename} not found in ${folder}`);
    }

    // File exists, read it (readFile is compatible)
    const fileContent = await fs.readFile(filePath);

    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
    };

    // Set appropriate content type
    if (contentTypes[ext]) {
      res.setHeader("Content-Type", contentTypes[ext]);
    }

    // Send the file
    return res.send(fileContent);
  } catch (error) {
    console.error(`Error serving asset: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({
      error: "Failed to serve asset",
      message: error.message,
      path: filePath,
    });
  }
}
