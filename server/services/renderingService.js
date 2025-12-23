import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import { getProjectDir, CORE_WIDGETS_DIR } from "../config.js";
// TODO: Controllers shouldn't ideally be imported into services.
// We might need to move readProjectsFile/readMediaFile to utils or their own services later.
import { readMediaFile } from "../controllers/mediaController.js";
import { getMenuById } from "../controllers/menuController.js";
import { readProjectsFile } from "../controllers/projectController.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ThemeSettingsTag } from "../../src/core/tags/themeSettings.js";
import { AssetTag } from "../../src/core/tags/assetTag.js";
import { FontsPreconnectTag } from "../../src/core/tags/FontsPreconnectTag.js";
import { FontsStylesheetTag } from "../../src/core/tags/FontsStylesheetTag.js";
import { SeoTag } from "../../src/core/tags/SeoTag.js";
import { EnqueueStyleTag } from "../../src/core/tags/enqueueStyle.js";
import { EnqueueScriptTag } from "../../src/core/tags/enqueueScript.js";
import { RenderStylesTag } from "../../src/core/tags/renderStyles.js";
import { RenderScriptsTag } from "../../src/core/tags/renderScripts.js";
import { PlaceholderImageTag } from "../../src/core/tags/placeholderImageTag.js";
import { registerImageFilter } from "../../src/core/filters/imageFilter.js";
import { registerVideoFilter } from "../../src/core/filters/videoFilter.js";
import { registerAudioFilter } from "../../src/core/filters/audioFilter.js";
import { registerYouTubeFilter } from "../../src/core/filters/youtubeFilter.js";
import { registerMediaMetaFilter } from "../../src/core/filters/mediaMetaFilter.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { getProjectSlug } from "../utils/projectHelpers.js";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the path to core snippets (adjust path relative to this service file)
const coreSnippetsDir = path.join(__dirname, "../../src/core/snippets");

// Cache for LiquidJS engines, keyed by project directory path
const engineCache = new Map();

// Helper to get or create an engine for a specific project
function getOrCreateEngine(projectDir, themeSnippetsDir) {
  const cacheKey = projectDir;

  if (engineCache.has(cacheKey)) {
    return engineCache.get(cacheKey);
  }

  // Create a NEW engine instance with correct roots
  const engine = new Liquid({
    extname: ".liquid",
    cache: process.env.NODE_ENV === "production",
    root: [themeSnippetsDir, coreSnippetsDir],
    partials: [themeSnippetsDir, coreSnippetsDir],
  });

  configureLiquidEngine(engine);

  engineCache.set(cacheKey, engine);
  return engine;
}

// Configure LiquidJS engine helper
function configureLiquidEngine(engine) {
  // Register custom tags
  engine.registerTag("theme_settings", ThemeSettingsTag);
  engine.registerTag("asset", AssetTag);
  engine.registerTag("fonts_preconnect", FontsPreconnectTag);
  engine.registerTag("fonts_stylesheet", FontsStylesheetTag);
  engine.registerTag("seo", SeoTag);
  engine.registerTag("enqueue_style", EnqueueStyleTag);
  engine.registerTag("enqueue_script", EnqueueScriptTag);
  engine.registerTag("render_styles", RenderStylesTag);
  engine.registerTag("render_scripts", RenderScriptsTag);
  engine.registerTag("placeholder_image", PlaceholderImageTag);

  // Register custom filters
  registerImageFilter(engine);
  registerVideoFilter(engine);
  registerAudioFilter(engine);
  registerYouTubeFilter(engine);
  registerMediaMetaFilter(engine);
}

// Global engine for fallback/static use if needed (optional, can be removed if strictly per-request)
// Removing global engine significantly reduces risk of shared state pollution

/**
 * Helper function to get project data by ID
 */
async function getProjectData(projectId) {
  try {
    const projectsData = await readProjectsFile();
    return projectsData.projects.find((p) => p.id === projectId) || null;
  } catch (error) {
    console.warn(`Could not load project data for ${projectId}: ${error.message}`);
    return null;
  }
}

/**
 * Creates base render context with common properties
 * @param {string} projectId
 * @param {object} rawThemeSettings
 * @param {string} renderMode
 * @param {object} sharedGlobals - Optional shared globals object to preserve enqueued assets
 */
async function createBaseRenderContext(projectId, rawThemeSettings, renderMode = "preview", sharedGlobals = null) {
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
  const apiUrl =
    renderMode === "preview" ? process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}` : "";

  // Determine image base path based on render mode
  // Publish mode uses assets/images/ for consistent CSS path resolution
  const imageBasePath =
    renderMode === "publish" ? "assets/images" : `${apiUrl}/api/media/projects/${projectId}/uploads/images`;

  // Video base path (also in assets for consistency)
  const videoBasePath =
    renderMode === "publish" ? "assets/videos" : `${apiUrl}/api/media/projects/${projectId}/uploads/videos`;

  // Audio base path (also in assets for consistency)
  const audioBasePath =
    renderMode === "publish" ? "assets/audios" : `${apiUrl}/api/media/projects/${projectId}/uploads/audios`;

  // Load media metadata and create a useful map
  let mediaFiles = {};
  try {
    const mediaData = await readMediaFile(projectId);
    if (mediaData && Array.isArray(mediaData.files)) {
      mediaData.files.forEach((file) => {
        if (file.filename) {
          mediaFiles[file.filename] = file;
        }
      });
    }
  } catch (err) {
    console.warn(`Could not read or parse media file for project ${projectId}: ${err.message}`);
  }

  // Use shared globals if provided, otherwise create new ones
  const globals = sharedGlobals || {
    projectId,
    apiUrl,
    renderMode,
    themeSettingsRaw: rawThemeSettings,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
  };

  // Return the base context
  return {
    theme: processedThemeSettings,
    mediaFiles,
    globals,
    imagePath: imageBasePath,
    videoPath: videoBasePath,
    audioPath: audioBasePath,
  };
}

/**
 * Renders a specific widget template with given data.
 * @param {string} projectId
 * @param {string} widgetId
 * @param {object} widgetData
 * @param {object} rawThemeSettings
 * @param {string} renderMode
 * @param {object} sharedGlobals - Optional shared globals to preserve enqueued assets
 */
async function renderWidget(
  projectId,
  widgetId,
  widgetData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
) {
  try {
    const { type, settings = {}, blocks = {}, blocksOrder = [] } = widgetData;
    const projectSlug = await getProjectSlug(projectId);
    const projectDir = getProjectDir(projectSlug);

    // Determine if this is a core widget (prefixed with "core-")
    const isCoreWidget = type.startsWith("core-");

    // Determine the correct path based on widget type
    let widgetPath;
    let schemaPath;
    if (isCoreWidget) {
      // Core widget (folder structure)
      widgetPath = path.join(CORE_WIDGETS_DIR, type, "widget.liquid");
      schemaPath = path.join(CORE_WIDGETS_DIR, type, "schema.json");
    } else if (type === "header" || type === "footer") {
      // Global theme widget (folder structure)
      widgetPath = path.join(projectDir, "widgets", "global", type, "widget.liquid");
      schemaPath = path.join(projectDir, "widgets", "global", type, "schema.json");
    } else {
      // Regular theme widget (folder structure)
      widgetPath = path.join(projectDir, "widgets", type, "widget.liquid");
      schemaPath = path.join(projectDir, "widgets", type, "schema.json");
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

    // Load schema from schema.json file
    let schema;
    try {
      const schemaContent = await fs.readFile(schemaPath, "utf-8");
      schema = JSON.parse(schemaContent);
    } catch (schemaErr) {
      console.error(`Widget schema not found at ${schemaPath}`);
      schema = { settings: [], blocks: [] };
    }

    // Use template directly for rendering (no embedded schema to remove)
    let templateForRender = template;

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
              // Use getMenuById instead of direct file access
              const menuData = await getMenuById(projectDir, value);
              enhancedSettings[key] = menuData || { items: [] };
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

    // Get base render context (use shared globals if provided)
    const baseContext = await createBaseRenderContext(projectId, rawThemeSettings, renderMode, sharedGlobals);

    // Merge with widget-specific context
    const renderContext = {
      ...baseContext,
      widget: widgetContext,
    };

    // Get theme snippets directory for this project
    const themeSnippetsDir = path.join(projectDir, "snippets");

    // Get or create cached engine
    const engine = getOrCreateEngine(projectDir, themeSnippetsDir);

    // Render the template
    let rendered = await engine.parseAndRender(templateForRender, renderContext, {
      globals: renderContext.globals,
    });
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
 * Renders a page layout with separated content sections
 * @param {string} projectId - The project ID
 * @param {object} contentSections - Object with { headerContent, mainContent, footerContent }
 * @param {object} pageData - Page metadata
 * @param {object} rawThemeSettings - Theme settings
 * @param {string} renderMode - Render mode ('preview' or 'publish')
 * @param {object} sharedGlobals - Optional shared globals with enqueued assets
 */
async function renderPageLayout(
  projectId,
  contentSections,
  pageData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
) {
  try {
    // 1. Fetch layout.liquid for the project
    const projectSlug = await getProjectSlug(projectId);
    const projectDir = getProjectDir(projectSlug);
    const layoutPath = path.join(projectDir, "layout.liquid");

    let layoutTemplate;
    try {
      layoutTemplate = await fs.readFile(layoutPath, "utf-8");
    } catch (readErr) {
      console.error(`Layout template not found at ${layoutPath}`);
      return `<html><body><h1>Error: Layout template not found</h1><pre>${readErr.message}</pre></body></html>`;
    }

    // 2. Create context for layout render (use shared globals
    const baseContext = await createBaseRenderContext(projectId, rawThemeSettings, renderMode, sharedGlobals);

    // 3. Load project data
    const projectData = await getProjectData(projectId);

    // 4. Add page-specific context with separated content sections
    const renderContext = {
      ...baseContext,
      header: contentSections.headerContent || "",
      main_content: contentSections.mainContent || "",
      footer: contentSections.footerContent || "",
      page: pageData,
      project: projectData,
      body_class: pageData?.slug || "",
    };

    // 5. Render the layout with theme snippets path included
    const themeSnippetsDir = path.join(projectDir, "snippets");

    // Get or create cached engine
    const engine = getOrCreateEngine(projectDir, themeSnippetsDir);

    const renderedHtml = await engine.parseAndRender(layoutTemplate, renderContext, {
      globals: renderContext.globals,
    });
    return renderedHtml;
  } catch (error) {
    console.error(`Error rendering page layout for project ${projectId}:`, error);
    return `<html><body><h1>Error rendering page</h1><pre>${error.message}</pre></body></html>`;
  }
}

// Export the necessary functions
export { renderWidget, renderPageLayout };
