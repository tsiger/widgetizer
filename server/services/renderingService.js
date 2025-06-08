import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import { getProjectDir } from "../config.js";
// TODO: Controllers shouldn't ideally be imported into services.
// We might need to move readProjectsFile/readMediaFile to utils or their own services later.
import { readMediaFile } from "../controllers/mediaController.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ThemeSettingsTag } from "../../src/core/tags/themeSettings.js";
import { AssetTag } from "../../src/core/tags/assetTag.js";
import { FontsPreconnectTag } from "../../src/core/tags/FontsPreconnectTag.js";
import { FontsStylesheetTag } from "../../src/core/tags/FontsStylesheetTag.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the path to core snippets (adjust path relative to this service file)
const coreSnippetsDir = path.join(__dirname, "../../src/core/snippets");

// Initialize LiquidJS engine once
const engine = new Liquid({
  extname: ".liquid",
  cache: process.env.NODE_ENV === "production",
  root: [coreSnippetsDir],
  partials: [coreSnippetsDir],
});

// Register custom tags once
engine.registerTag("theme_settings", ThemeSettingsTag);
engine.registerTag("asset", AssetTag);
engine.registerTag("fonts_preconnect", FontsPreconnectTag);
engine.registerTag("fonts_stylesheet", FontsStylesheetTag);

/**
 * Creates base render context with common properties
 */
async function createBaseRenderContext(projectId, rawThemeSettings, renderMode = "preview") {
  // Validate project ID
  if (!projectId) {
    throw new Error("projectId must be provided to create render context");
  }

  // Process theme settings
  const processedThemeSettings =
    rawThemeSettings && rawThemeSettings.settings && rawThemeSettings.settings.global
      ? preprocessThemeSettings(rawThemeSettings)
      : {};

  // Determine API URL based on render mode
  const apiUrl = renderMode === "preview" ? process.env.VITE_API_URL : "";

  // Determine image base path based on render mode
  const imageBasePath =
    renderMode === "publish" ? "uploads/images" : `${apiUrl}/api/media/projects/${projectId}/uploads/images`;

  // Load media metadata
  let mediaMetadata = {};
  try {
    const mediaData = await readMediaFile(projectId);
    if (mediaData && Array.isArray(mediaData.files)) {
      mediaData.files.forEach((file) => {
        if (file.filename) {
          mediaMetadata[file.filename] = {
            width: file.width,
            height: file.height,
            alt: file.metadata?.alt || "",
            title: file.metadata?.title || "",
          };
        }
      });
    }
  } catch (err) {
    console.warn(`Could not read or parse media file for project ${projectId}: ${err.message}`);
  }

  // Return the base context
  return {
    theme: processedThemeSettings,
    mediaMetadata,
    globals: {
      projectId,
      apiUrl,
      renderMode,
      themeSettingsRaw: rawThemeSettings,
    },
    imagePath: imageBasePath,
  };
}

/**
 * Renders a specific widget template with given data.
 */
async function renderWidget(projectId, widgetId, widgetData, rawThemeSettings, renderMode = "preview") {
  try {
    const { type, settings = {}, blocks = {}, blocksOrder = [] } = widgetData;
    const projectDir = getProjectDir(projectId);

    // Determine the correct path based on widget type
    let widgetPath;
    if (type === "header" || type === "footer") {
      widgetPath = path.join(projectDir, "widgets", "global", `${type}.liquid`);
    } else {
      widgetPath = path.join(projectDir, "widgets", `${type}.liquid`);
    }

    // Read the widget template
    let template;
    try {
      template = await fs.readFile(widgetPath, "utf-8");
    } catch (readErr) {
      // If template not found, return an informative error message instead of crashing
      console.error(`Widget template not found at ${widgetPath}`);
      return `<div class="widget-error">Widget template not found: ${type}.liquid</div>`;
    }

    // Extract schema from the template
    const schemaMatch = template.match(/<script type="application\/json" data-widget-schema>([\s\S]*?)<\/script>/);
    const schema = schemaMatch ? JSON.parse(schemaMatch[1]) : { settings: [], blocks: [] };

    let templateForRender = template;
    if (schemaMatch) {
      // Remove the entire matched script block (schemaMatch[0] contains the full match)
      templateForRender = template.replace(schemaMatch[0], "");
    }

    // Create settings with defaults (using the extracted schema)
    const enhancedSettings = {};
    if (Array.isArray(schema.settings)) {
      schema.settings.forEach((setting) => {
        enhancedSettings[setting.id] = setting.default;
      });
    }
    Object.assign(enhancedSettings, settings); // Override with provided settings

    const enhancedBlocks = {};
    const blockSchemas = {};
    if (Array.isArray(schema.blocks)) {
      schema.blocks.forEach((blockSchema) => {
        blockSchemas[blockSchema.type] = blockSchema.settings || [];
      });
    }

    if (blocks && typeof blocks === "object") {
      Object.entries(blocks).forEach(([blockId, blockInstance]) => {
        const blockDefaults = {};
        // Ensure blockInstance and blockInstance.type exist before accessing schema
        const currentBlockSchema = blockInstance && blockInstance.type ? blockSchemas[blockInstance.type] || [] : [];
        if (Array.isArray(currentBlockSchema)) {
          currentBlockSchema.forEach((setting) => {
            blockDefaults[setting.id] = setting.default;
          });
        }
        enhancedBlocks[blockId] = {
          ...(blockInstance || {}), // Keep original type, id etc., handle null blockInstance
          settings: {
            ...blockDefaults,
            ...((blockInstance && blockInstance.settings) || {}), // Handle null blockInstance/settings
          },
        };
      });
    }

    // Handle menu settings
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        if (key.toLowerCase().includes("navigation")) {
          try {
            if (value) {
              const menuPath = path.join(projectDir, "menus", `${value}.json`);
              try {
                const menuData = await fs.readFile(menuPath, "utf8");
                enhancedSettings[key] = JSON.parse(menuData);
              } catch (fileErr) {
                console.warn(`Menu file not found: ${menuPath}. Using empty menu.`);
                enhancedSettings[key] = { items: [] };
              }
            } else {
              enhancedSettings[key] = { items: [] }; // Ensure empty menu if no value set
            }
          } catch (err) {
            console.error(`Error loading menu data for setting ${key}:`, err);
            enhancedSettings[key] = { items: [] }; // Fallback to empty menu on error
          }
        }
      }
    }

    // Create widget context for template
    const widgetContext = {
      id: widgetId,
      type,
      settings: enhancedSettings,
      blocks: enhancedBlocks,
      blocksOrder: blocksOrder || [],
    };

    // Get base render context
    const baseContext = await createBaseRenderContext(projectId, rawThemeSettings, renderMode);

    // Merge with widget-specific context
    const renderContext = {
      ...baseContext,
      widget: widgetContext,
    };

    // Render the template
    let rendered = await engine.parseAndRender(templateForRender, renderContext, { globals: renderContext.globals });
    return rendered;
  } catch (error) {
    console.error(`Error rendering widget ${widgetId} (Project: ${projectId}):`, error);
    // Return a more informative error message in the HTML
    return `<div class="widget-error" data-widget-id="${widgetId}" data-widget-type="${widgetData?.type || "unknown"}">
      <p><strong>Error rendering widget!</strong></p>
      <p>Type: ${widgetData?.type || "unknown"}</p>
      <p>ID: ${widgetId}</p>
      <pre style="white-space: pre-wrap; word-wrap: break-word; background-color: #fdd; padding: 5px; border: 1px solid red;">${
        error.message
      }\n${error.stack}</pre>
    </div>`;
  }
}

/**
 * Renders a page layout with content
 */
async function renderPageLayout(projectId, pageContent, pageData, rawThemeSettings, renderMode = "preview") {
  try {
    // 1. Fetch layout.liquid for the project
    const projectDir = getProjectDir(projectId);
    const layoutPath = path.join(projectDir, "layout.liquid");

    let layoutTemplate;
    try {
      layoutTemplate = await fs.readFile(layoutPath, "utf-8");
    } catch (readErr) {
      console.error(`Layout template not found at ${layoutPath}`);
      return `<html><body><h1>Error: Layout template not found</h1><pre>${readErr.message}</pre></body></html>`;
    }

    // 2. Create context for layout render
    const baseContext = await createBaseRenderContext(projectId, rawThemeSettings, renderMode);

    // 3. Add page-specific context
    const renderContext = {
      ...baseContext,
      content: pageContent,
      page: pageData,
      body_class: pageData?.slug || "",
      page_title: pageData?.name || "Untitled Page",
    };

    // 4. Render the layout
    const renderedHtml = await engine.parseAndRender(layoutTemplate, renderContext, { globals: renderContext.globals });
    return renderedHtml;
  } catch (error) {
    console.error(`Error rendering page layout (Project: ${projectId}):`, error);
    return `<html><body><h1>Error rendering layout</h1><pre>${error.message}\n${error.stack}</pre></body></html>`;
  }
}

// Export the necessary functions
export {
  renderWidget,
  renderPageLayout,
  // Export the engine instance if needed elsewhere (e.g., for direct parsing)
  // engine
};
