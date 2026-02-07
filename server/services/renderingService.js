import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import { getProjectDir, CORE_WIDGETS_DIR } from "../config.js";
// TODO: Controllers shouldn't ideally be imported into services.
// We might need to move readProjectsFile/readMediaFile to utils or their own services later.
import { readMediaFile } from "../controllers/mediaController.js";
import { getMenuById } from "../controllers/menuController.js";
import { readProjectsFile } from "../controllers/projectController.js";
import { listProjectPagesData } from "../controllers/pageController.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ThemeSettingsTag } from "../../src/core/tags/themeSettings.js";
import { AssetTag } from "../../src/core/tags/assetTag.js";
import { FontsTag } from "../../src/core/tags/FontsTag.js";
import { SeoTag } from "../../src/core/tags/SeoTag.js";
import { EnqueueStyleTag } from "../../src/core/tags/enqueueStyle.js";
import { EnqueueScriptTag } from "../../src/core/tags/enqueueScript.js";
import { RenderHeaderAssetsTag } from "../../src/core/tags/renderHeaderAssets.js";
import { RenderFooterAssetsTag } from "../../src/core/tags/renderFooterAssets.js";
import { PlaceholderImageTag } from "../../src/core/tags/placeholderImageTag.js";
import { CustomCssTag } from "../../src/core/tags/customCssTag.js";
import { CustomHeadScriptsTag } from "../../src/core/tags/customHeadScriptsTag.js";
import { CustomFooterScriptsTag } from "../../src/core/tags/customFooterScriptsTag.js";
import { ImageTag } from "../../src/core/tags/imageTag.js";
import { VideoTag } from "../../src/core/tags/videoTag.js";
import { AudioTag } from "../../src/core/tags/audioTag.js";
import { YouTubeTag } from "../../src/core/tags/youtubeTag.js";
import { EnqueuePreloadTag } from "../../src/core/tags/enqueuePreload.js";
import { registerMediaMetaFilter } from "../../src/core/filters/mediaMetaFilter.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { isProjectResolutionError } from "../utils/projectErrors.js";
import { sanitizeWidgetData } from "./sanitizationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    outputEscape: "escape",
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
  engine.registerTag("fonts", FontsTag);
  engine.registerTag("seo", SeoTag);
  engine.registerTag("enqueue_style", EnqueueStyleTag);
  engine.registerTag("enqueue_script", EnqueueScriptTag);
  engine.registerTag("header_assets", RenderHeaderAssetsTag);
  engine.registerTag("footer_assets", RenderFooterAssetsTag);
  engine.registerTag("placeholder_image", PlaceholderImageTag);
  engine.registerTag("custom_css", CustomCssTag);
  engine.registerTag("custom_head_scripts", CustomHeadScriptsTag);
  engine.registerTag("custom_footer_scripts", CustomFooterScriptsTag);
  engine.registerTag("image", ImageTag);
  engine.registerTag("video", VideoTag);
  engine.registerTag("audio", AudioTag);
  engine.registerTag("youtube", YouTubeTag);
  engine.registerTag("enqueue_preload", EnqueuePreloadTag);

  // Register custom filters
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
 * Check if a value is a link object (has href property and is an object)
 */
function isLinkObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "href" in value;
}

/**
 * Resolve a single link object's pageUuid to current slug.
 * If pageUuid exists but page is deleted, clears the link.
 * @param {object} linkValue - The link object { pageUuid?, href, text, target }
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {object} Resolved link object
 */
function resolveLinkValue(linkValue, pagesByUuid) {
  if (!linkValue || typeof linkValue !== "object") {
    return linkValue;
  }

  const { pageUuid } = linkValue;

  // If no pageUuid, this is a custom URL - pass through unchanged
  if (!pageUuid) {
    return linkValue;
  }

  // Look up the page by uuid
  const page = pagesByUuid.get(pageUuid);

  if (page) {
    // Page exists - update href to current slug
    return {
      ...linkValue,
      href: `${page.slug}.html`,
    };
  } else {
    // Page was deleted - clear the link
    return {
      href: "",
      text: "",
      target: "_self",
    };
  }
}

/**
 * Recursively resolve all page links in widget settings and blocks.
 * Walks through the widget data structure and resolves any link objects
 * that have a pageUuid to their current slug.
 * @param {object} widgetData - Widget data with settings and blocks
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {object} Widget data with resolved links
 */
function resolveWidgetPageLinks(widgetData, pagesByUuid) {
  if (!widgetData || !pagesByUuid || pagesByUuid.size === 0) {
    return widgetData;
  }

  // Deep clone to avoid mutating original
  const resolved = JSON.parse(JSON.stringify(widgetData));

  // Resolve links in widget settings
  if (resolved.settings && typeof resolved.settings === "object") {
    for (const [key, value] of Object.entries(resolved.settings)) {
      if (isLinkObject(value)) {
        resolved.settings[key] = resolveLinkValue(value, pagesByUuid);
      }
    }
  }

  // Resolve links in blocks
  if (resolved.blocks && typeof resolved.blocks === "object") {
    for (const [blockId, block] of Object.entries(resolved.blocks)) {
      if (block && block.settings && typeof block.settings === "object") {
        for (const [key, value] of Object.entries(block.settings)) {
          if (isLinkObject(value)) {
            resolved.blocks[blockId].settings[key] = resolveLinkValue(value, pagesByUuid);
          }
        }
      }
    }
  }

  return resolved;
}

/**
 * Recursively resolve page links in menu items.
 * Each menu item may have a pageUuid that needs to be resolved to current slug.
 * @param {Array} menuItems - Array of menu items
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {Array} Menu items with resolved links
 */
function resolveMenuItemLinks(menuItems, pagesByUuid) {
  if (!menuItems || !Array.isArray(menuItems) || pagesByUuid.size === 0) {
    return menuItems;
  }

  return menuItems.map((item) => {
    const resolved = { ...item };

    // If item has pageUuid, resolve to current slug
    if (item.pageUuid) {
      const page = pagesByUuid.get(item.pageUuid);
      if (page) {
        // Page exists - update link to current slug
        resolved.link = `${page.slug}.html`;
      } else {
        // Page was deleted - clear the link
        resolved.link = "";
        delete resolved.pageUuid;
      }
    }

    // Recursively resolve children
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      resolved.items = resolveMenuItemLinks(item.items, pagesByUuid);
    }

    return resolved;
  });
}

/**
 * Resolve page links in a menu object.
 * @param {object} menuData - Menu data with items array
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @returns {object} Menu data with resolved links
 */
function resolveMenuPageLinks(menuData, pagesByUuid) {
  if (!menuData || !menuData.items) {
    return menuData;
  }

  return {
    ...menuData,
    items: resolveMenuItemLinks(menuData.items, pagesByUuid),
  };
}

/**
 * Load all pages for a project and return a map of uuid -> page data.
 * Results are cached per projectId during a single render pass.
 * @param {string} projectFolderName - The project folder name
 * @returns {Promise<Map>} Map of uuid -> page data
 */
async function loadPagesByUuid(projectFolderName) {
  try {
    const pages = await listProjectPagesData(projectFolderName);
    const map = new Map();
    pages.forEach((page) => {
      if (page.uuid) {
        map.set(page.uuid, page);
      }
    });
    return map;
  } catch (error) {
    console.warn(`Could not load pages for link resolution: ${error.message}`);
    return new Map();
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

  // Cache for project icons (with mtime tracking)
  if (!global.iconsCache) {
    global.iconsCache = new Map(); // projectId -> { icons: {}, prefix: '', mtime: number }
  }

  // Check if icons need to be reloaded (new project, or file changed in preview mode)
  let shouldReloadIcons = !global.iconsCache.has(projectId);

  const projectFolderName = await getProjectFolderName(projectId);
  const projectDir = getProjectDir(projectFolderName);
  const iconsPath = path.join(projectDir, "assets", "icons.json");

  if (!shouldReloadIcons && renderMode === "preview") {
    // In preview mode, check if file has been modified since last cache
    try {
      const stats = await fs.stat(iconsPath);
      const cachedData = global.iconsCache.get(projectId);
      if (!cachedData?.mtime || stats.mtimeMs > cachedData.mtime) {
        shouldReloadIcons = true;
      }
    } catch (error) {
      console.warn(`Failed to check icon file mtime for project ${projectId} in preview mode:`, error.message);
      // File doesn't exist or can't be read, will handle below
    }
  }

  if (shouldReloadIcons) {
    try {
      if (
        await fs
          .access(iconsPath)
          .then(() => true)
          .catch(() => false)
      ) {
        const stats = await fs.stat(iconsPath);
        const content = await fs.readFile(iconsPath, "utf8");
        const iconsData = JSON.parse(content);
        global.iconsCache.set(projectId, { ...iconsData, mtime: stats.mtimeMs });
      } else {
        global.iconsCache.set(projectId, { icons: {}, mtime: 0 });
      }
    } catch (err) {
      console.warn(`Failed to load icons for project ${projectId}:`, err);
      // Ensure we have an entry even if failed
      if (!global.iconsCache.has(projectId)) {
        global.iconsCache.set(projectId, { icons: {}, mtime: 0 });
      }
    }
  }

  const projectIcons = global.iconsCache.get(projectId) || { icons: {} };

  // Flatten grouped icons into a single icons object for Liquid templates
  // Supports both: { icons: {...} } and { groups: { "Category": {...} } }
  let flatIcons = {};
  if (projectIcons.icons && typeof projectIcons.icons === "object") {
    flatIcons = projectIcons.icons;
  } else if (projectIcons.groups && typeof projectIcons.groups === "object") {
    Object.values(projectIcons.groups).forEach((groupIcons) => {
      Object.assign(flatIcons, groupIcons);
    });
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

  // Always ensure icons are present in globals (whether shared or new)
  if (!globals.icons) {
    globals.icons = flatIcons;
    globals.iconPrefix = projectIcons.prefix || "";
  }

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
 * Renders a specific widget template with given data using LiquidJS.
 * Handles core widgets, global widgets (header/footer), and theme widgets.
 * Loads widget schema defaults, merges with provided settings, and resolves menu data.
 * @param {string} projectId - The project's UUID
 * @param {string} widgetId - Unique identifier for this widget instance
 * @param {object} widgetData - Widget configuration containing type, settings, blocks, and blocksOrder
 * @param {object} rawThemeSettings - Raw theme settings from theme.json
 * @param {string} [renderMode='preview'] - Render mode: 'preview' for dev server URLs, 'publish' for relative paths
 * @param {object} [sharedGlobals=null] - Optional shared globals to preserve enqueued assets across widgets
 * @param {number} [index=null] - Optional 1-based index of the widget in the page
 * @returns {Promise<string>} Rendered HTML string, or error HTML if rendering fails
 * @throws {Error} If project resolution fails (re-throws project resolution errors)
 */
async function renderWidget(
  projectId,
  widgetId,
  widgetData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
  index = null,
) {
  try {
    const { type, settings = {}, blocks = {}, blocksOrder = [] } = widgetData;
    const projectFolderName = await getProjectFolderName(projectId);
    const projectDir = getProjectDir(projectFolderName);

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
    } catch (error) {
      // If template not found, return an informative error message instead of crashing
      console.warn(`Widget template not found at ${widgetPath}. Error: ${error.message}`);
      return `<div class="widget-error">Widget template not found: ${type}.liquid</div>`;
    }

    // Load schema from schema.json file
    let schema;
    try {
      const schemaContent = await fs.readFile(schemaPath, "utf-8");
      schema = JSON.parse(schemaContent);
    } catch (error) {
      console.warn(`Widget schema not found or invalid at ${schemaPath}. Using empty schema. Error: ${error.message}`);
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

    // Load pages for resolving pageUuid -> current slug in links and menus
    // Use cached pages from sharedGlobals if available, otherwise load and cache
    let pagesByUuid;
    if (sharedGlobals && sharedGlobals.pagesByUuid) {
      pagesByUuid = sharedGlobals.pagesByUuid;
    } else {
      pagesByUuid = await loadPagesByUuid(projectFolderName);
      if (sharedGlobals) {
        sharedGlobals.pagesByUuid = pagesByUuid;
      }
    }

    // Handle menu settings - check schema for menu type settings
    const menuSettingIds = new Set();
    if (Array.isArray(schema.settings)) {
      schema.settings.forEach((setting) => {
        if (setting.type === "menu") {
          menuSettingIds.add(setting.id);
        }
      });
    }

    // Load menu data for any menu-type settings (using enhancedSettings which includes defaults)
    for (const [key, value] of Object.entries(enhancedSettings)) {
      if (menuSettingIds.has(key)) {
        try {
          if (value) {
            // Use getMenuById instead of direct file access
            const menuData = await getMenuById(projectDir, value);
            // Resolve page links in menu items (pageUuid -> current slug)
            enhancedSettings[key] = resolveMenuPageLinks(menuData, pagesByUuid) || { items: [] };
          } else {
            enhancedSettings[key] = { items: [] }; // Ensure empty menu if no value set
          }
        } catch (err) {
          console.error(`Error loading menu data for setting ${key}:`, err);
          enhancedSettings[key] = { items: [] }; // Fallback to empty menu on error
        }
      }
    }

    // Resolve page links (pageUuid -> current slug) in widget settings and blocks
    // This ensures internal links stay valid even after page renames
    const resolvedWidgetData = resolveWidgetPageLinks(
      { settings: enhancedSettings, blocks: enhancedBlocks },
      pagesByUuid,
    );

    // Sanitize settings based on schema types (text, richtext, link, etc.)
    // This runs after link resolution so resolved URLs are also validated.
    // resolvedWidgetData is already a deep clone, safe to mutate in place.
    sanitizeWidgetData(resolvedWidgetData, schema);

    // Create widget context for template
    const widgetContext = {
      id: widgetId,
      type,
      settings: resolvedWidgetData.settings,
      blocks: resolvedWidgetData.blocks,
      blocksOrder: blocksOrder || [],
      index: index, // 1-based index of widget in page (null for global widgets or when not provided)
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
    if (isProjectResolutionError(error)) {
      throw error;
    }
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
 * Renders a complete page layout by injecting content sections into layout.liquid template.
 * Creates the full HTML document structure with header, main content, and footer.
 * @param {string} projectId - The project's UUID
 * @param {object} contentSections - Pre-rendered content sections
 * @param {string} contentSections.headerContent - Rendered header HTML
 * @param {string} contentSections.mainContent - Rendered main content HTML
 * @param {string} contentSections.footerContent - Rendered footer HTML
 * @param {object} pageData - Page metadata (title, slug, etc.)
 * @param {object} rawThemeSettings - Raw theme settings from theme.json
 * @param {string} [renderMode='preview'] - Render mode: 'preview' for dev server URLs, 'publish' for relative paths
 * @param {object} [sharedGlobals=null] - Optional shared globals with enqueued styles/scripts
 * @returns {Promise<string>} Complete rendered HTML document
 * @throws {Error} If project resolution fails (re-throws project resolution errors)
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
    const projectFolderName = await getProjectFolderName(projectId);
    const projectDir = getProjectDir(projectFolderName);
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
    if (isProjectResolutionError(error)) {
      throw error;
    }
    console.error(`Error rendering page layout for project ${projectId}:`, error);
    return `<html><body><h1>Error rendering page</h1><pre>${error.message}</pre></body></html>`;
  }
}

// Export the necessary functions
export { renderWidget, renderPageLayout };
