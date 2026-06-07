import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import { getProjectDir, CORE_WIDGETS_DIR } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
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
import { YouTubeTag } from "../../src/core/tags/youtubeTag.js";
import { EnqueuePreloadTag } from "../../src/core/tags/enqueuePreload.js";
import { registerMediaMetaFilter } from "../../src/core/filters/mediaMetaFilter.js";
import { registerHandleizeFilter } from "../../src/core/filters/handleizeFilter.js";
import { registerCollectionFilter } from "../../src/core/filters/collectionFilter.js";
import { registerSafeUrlFilter } from "../../src/core/filters/safeUrlFilter.js";
import { sanitizeHref } from "../../src/core/utils/urlSafety.js";
import {
  listCollectionItems,
  getCollectionSchema,
  prepareCollectionItemForRender,
} from "./collectionService.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { buildRuntimeSiteIcons, prefixSiteIcons } from "../utils/siteIconHelpers.js";
import { prefixInternalHref, normalize } from "../utils/linkPrefixer.js";
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
  engine.registerTag("youtube", YouTubeTag);
  engine.registerTag("enqueue_preload", EnqueuePreloadTag);

  // Register custom filters
  registerMediaMetaFilter(engine);
  registerHandleizeFilter(engine);
  registerCollectionFilter(engine);
  registerSafeUrlFilter(engine);
}

// Global engine for fallback/static use if needed (optional, can be removed if strictly per-request)
// Removing global engine significantly reduces risk of shared state pollution

/**
 * Helper function to get project data by ID
 */
function getProjectData(projectId) {
  try {
    return projectRepo.getProjectById(projectId) || null;
  } catch (error) {
    console.warn(`Could not load project data for ${projectId}: ${error.message}`);
    return null;
  }
}

function buildPageTitle(pageData, projectData) {
  const pageTitle =
    pageData?.seo?.title && typeof pageData.seo.title === "string" && pageData.seo.title.trim()
      ? pageData.seo.title.trim()
      : pageData?.name || "";
  const siteTitle =
    projectData?.siteTitle && typeof projectData.siteTitle === "string" && projectData.siteTitle.trim()
      ? projectData.siteTitle.trim()
      : "";

  return siteTitle ? `${pageTitle} - ${siteTitle}` : pageTitle;
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
function resolveLinkValue(linkValue, pagesByUuid, outputPathPrefix = "") {
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
    // Page exists - update href to current slug, depth-aware for nested pages
    return {
      ...linkValue,
      href: prefixInternalHref(`${page.slug}.html`, outputPathPrefix),
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
function resolveWidgetPageLinks(widgetData, pagesByUuid, outputPathPrefix = "") {
  if (!widgetData || !pagesByUuid || pagesByUuid.size === 0) {
    return widgetData;
  }

  // Deep clone to avoid mutating original
  const resolved = JSON.parse(JSON.stringify(widgetData));

  // Resolve links in widget settings
  if (resolved.settings && typeof resolved.settings === "object") {
    for (const [key, value] of Object.entries(resolved.settings)) {
      if (isLinkObject(value)) {
        resolved.settings[key] = resolveLinkValue(value, pagesByUuid, outputPathPrefix);
      }
    }
  }

  // Resolve links in blocks
  if (resolved.blocks && typeof resolved.blocks === "object") {
    for (const [blockId, block] of Object.entries(resolved.blocks)) {
      if (block && block.settings && typeof block.settings === "object") {
        for (const [key, value] of Object.entries(block.settings)) {
          if (isLinkObject(value)) {
            resolved.blocks[blockId].settings[key] = resolveLinkValue(value, pagesByUuid, outputPathPrefix);
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
function resolveMenuItemLinks(menuItems, pagesByUuid, outputPathPrefix = "") {
  if (!menuItems || !Array.isArray(menuItems)) {
    return menuItems;
  }

  return menuItems.map((item) => {
    const resolved = { ...item };

    // Resolve the href for this item, computing both the emitted (depth-aware,
    // prefixed) `link` and the un-prefixed `canonicalPath` used for active-state
    // matching. Every item is processed — including custom URLs — so links work
    // from any output depth, not just pageUuid-resolved ones.
    if (item.pageUuid) {
      const page = pagesByUuid && pagesByUuid.get(item.pageUuid);
      if (page) {
        const href = `${page.slug}.html`;
        resolved.link = prefixInternalHref(href, outputPathPrefix);
        resolved.canonicalPath = normalize(href);
      } else {
        // Page was deleted - clear the link
        resolved.link = "";
        resolved.canonicalPath = "";
        delete resolved.pageUuid;
      }
    } else if (typeof item.link === "string" && item.link) {
      resolved.link = prefixInternalHref(item.link, outputPathPrefix);
      resolved.canonicalPath = normalize(item.link);
    } else {
      resolved.canonicalPath = "";
    }

    // Block dangerous protocols in author-entered custom links (parity with
    // setting-type "link" fields). pageUuid links resolve to internal slugs and
    // are unaffected; this catches javascript:/data:/vbscript: in custom URLs.
    if (typeof resolved.link === "string") {
      resolved.link = sanitizeHref(resolved.link);
    }

    // Recursively resolve children
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      resolved.items = resolveMenuItemLinks(item.items, pagesByUuid, outputPathPrefix);
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
function resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix = "") {
  if (!menuData || !menuData.items) {
    return menuData;
  }

  return {
    ...menuData,
    items: resolveMenuItemLinks(menuData.items, pagesByUuid, outputPathPrefix),
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
 * Load all menus for a project and return maps for UUID and slug-based lookup.
 * @param {string} projectFolderName - The project folder name
 * @returns {Promise<{byUuid: Map, bySlug: Map}>} Maps for UUID and slug-based lookup
 */
async function loadMenuMaps(projectFolderName) {
  const byUuid = new Map();
  const bySlug = new Map();

  try {
    const menusDir = path.join(getProjectDir(projectFolderName), "menus");

    let files;
    try {
      files = await fs.readdir(menusDir);
    } catch {
      return { byUuid, bySlug };
    }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await fs.readFile(path.join(menusDir, file), "utf8");
        const menu = JSON.parse(content);
        if (menu.uuid) {
          byUuid.set(menu.uuid, menu);
        }
        const slugId = file.replace(".json", "");
        bySlug.set(slugId, menu);
      } catch {
        // Skip unreadable menu files
      }
    }
  } catch (error) {
    console.warn(`Could not load menus for UUID resolution: ${error.message}`);
  }

  return { byUuid, bySlug };
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

  // Depth-aware prefix for nested item pages. Read from sharedGlobals because it
  // is set per-render (before this context is built) and differs by output depth
  // ("" at the export root, "../" one level deep). Pages always use "".
  const outputPathPrefix = (sharedGlobals && sharedGlobals.outputPathPrefix) || "";

  // Determine image base path based on render mode
  // Publish mode uses assets/images/ for consistent CSS path resolution
  const imageBasePath =
    renderMode === "publish"
      ? `${outputPathPrefix}assets/images`
      : `${apiUrl}/api/media/projects/${projectId}/uploads/images`;

  // Determine file base path based on render mode (for PDF and other file assets)
  const fileBasePath =
    renderMode === "publish"
      ? `${outputPathPrefix}assets/files`
      : `${apiUrl}/api/media/projects/${projectId}/uploads/files`;

  const siteIconSrc = processedThemeSettings?.general?.favicon || "";

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

  // Form submit URL and Turnstile site key — configurable via env vars.
  // In preview mode, uses the local server URL. In publish mode, the
  // public form endpoint must be provided via FORMS_PUBLIC_SUBMIT_URL.
  const formSubmitUrl =
    renderMode === "preview"
      ? `${apiUrl}/api/forms/submit`
      : process.env.FORMS_PUBLIC_SUBMIT_URL || "";
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";

  // Use shared globals if provided, otherwise create new ones
  const globals = sharedGlobals || {
    projectId,
    apiUrl,
    renderMode,
    themeSettingsRaw: rawThemeSettings,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
    formSubmitUrl,
    turnstileSiteKey,
  };

  // Always ensure projectId and apiUrl are present in globals (whether shared or new)
  if (!globals.projectId) globals.projectId = projectId;
  if (!globals.apiUrl) globals.apiUrl = apiUrl;

  // Always ensure form config is present in globals (whether shared or new)
  if (globals.formSubmitUrl === undefined) {
    globals.formSubmitUrl = formSubmitUrl;
    globals.turnstileSiteKey = turnstileSiteKey;
  }

  // Always ensure icons are present in globals (whether shared or new)
  if (!globals.icons) {
    globals.icons = flatIcons;
    globals.iconPrefix = projectIcons.prefix || "";
  }

  // Expose depth-aware path globals (defaults keep pages at the export root).
  // `outputPathPrefix` prefixes relative asset/link URLs; `currentCanonicalPath`
  // is the un-prefixed path of the page being rendered, used for menu
  // active-state matching (Phase 16).
  if (globals.outputPathPrefix === undefined) globals.outputPathPrefix = outputPathPrefix;
  if (globals.currentCanonicalPath === undefined) globals.currentCanonicalPath = "";

  // Collection items loader for the `| collection` filter (Phase 8). Attached
  // once per render; results cached per (type, options) on `globals` so multiple
  // widgets reading the same collection only hit the filesystem once. The cache
  // is per-render (scoped to `globals`) because `outputPathPrefix` differs across
  // output depths, so a root page and a nested item page must not share a `url`.
  if (!globals.collectionCache) globals.collectionCache = new Map();
  if (!globals.getCollectionItems) {
    const collectionProjectFolder = await getProjectFolderName(projectId);
    globals.getCollectionItems = async (collectionType, options = {}) => {
      const cacheKey = `${collectionType}:${JSON.stringify(options ?? {})}`;
      if (globals.collectionCache.has(cacheKey)) return globals.collectionCache.get(cacheKey);

      // Sort in the service, but apply limit/offset HERE — after excluding
      // invalid items — so `limit` counts valid items (an invalid item must not
      // consume a slot in the returned window).
      const { limit, offset, ...sortOptions } = options ?? {};
      const [items, schema] = await Promise.all([
        listCollectionItems(collectionProjectFolder, collectionType, sortOptions),
        getCollectionSchema(collectionProjectFolder, collectionType),
      ]);

      const outputPathPrefix = globals.outputPathPrefix || "";
      const pagesByUuid = globals.pagesByUuid || new Map();

      const excluded = items.filter((item) => item.invalid);
      if (excluded.length > 0 && process.env.NODE_ENV !== "production") {
        console.warn(
          `[collections] "${collectionType}": excluding ${excluded.length} invalid item(s): ${excluded
            .map((i) => i.slug)
            .join(", ")}`,
        );
      }

      let valid = items.filter((item) => !item.invalid);
      if (offset) valid = valid.slice(offset);
      if (limit != null) valid = valid.slice(0, limit);

      const result = valid.map((item) => {
          const resolved = prepareCollectionItemForRender(item, schema, pagesByUuid, outputPathPrefix);
          const url = schema?.hasItemPages
            ? `${outputPathPrefix}${schema.slugPrefix}/${resolved.slug}.html`
            : null;
          return {
            id: resolved.id,
            uuid: resolved.uuid,
            slug: resolved.slug,
            url,
            created: resolved.created,
            updated: resolved.updated,
            settings: resolved.settings,
          };
        });

      globals.collectionCache.set(cacheKey, result);
      return result;
    };
  }

  // Return the base context
  return {
    theme: processedThemeSettings,
    mediaFiles,
    globals,
    imagePath: imageBasePath,
    filePath: fileBasePath,
    // Export-generated site icons carry root-relative filenames, so prefix them
    // per render depth. Runtime icons are built from the already-prefixed
    // imageBasePath, so they need no further prefixing.
    site_icons: globals.siteIcons
      ? prefixSiteIcons(globals.siteIcons, outputPathPrefix)
      : buildRuntimeSiteIcons(siteIconSrc, mediaFiles, imageBasePath),
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

    // Depth-aware prefix for links/menus emitted by this widget ("" for pages).
    const outputPathPrefix = (sharedGlobals && sharedGlobals.outputPathPrefix) || "";

    // Handle menu settings - check schema for menu type settings
    const menuSettingIds = new Set();
    if (Array.isArray(schema.settings)) {
      schema.settings.forEach((setting) => {
        if (setting.type === "menu") {
          menuSettingIds.add(setting.id);
        }
      });
    }

    // Also collect menu-type setting IDs from block schemas
    const blockMenuSettingIds = {};
    for (const [blockType, blockSettings] of Object.entries(blockSchemas)) {
      if (Array.isArray(blockSettings)) {
        blockSettings.forEach((setting) => {
          if (setting.type === "menu") {
            if (!blockMenuSettingIds[blockType]) blockMenuSettingIds[blockType] = new Set();
            blockMenuSettingIds[blockType].add(setting.id);
          }
        });
      }
    }

    // Load menu maps (UUID and slug-based) — cached in sharedGlobals across widgets
    let menuMaps;
    if (sharedGlobals && sharedGlobals.menuMaps) {
      menuMaps = sharedGlobals.menuMaps;
    } else {
      menuMaps = await loadMenuMaps(projectFolderName);
      if (sharedGlobals) {
        sharedGlobals.menuMaps = menuMaps;
      }
    }

    // Resolve menu-type settings: try UUID first, fall back to slug-based ID
    for (const [key, value] of Object.entries(enhancedSettings)) {
      if (menuSettingIds.has(key)) {
        try {
          if (value) {
            const menuData = menuMaps.byUuid.get(value) || menuMaps.bySlug.get(value);
            // Resolve page links in menu items (pageUuid -> current slug)
            enhancedSettings[key] = resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix) || { items: [] };
          } else {
            enhancedSettings[key] = { items: [] }; // Ensure empty menu if no value set
          }
        } catch (err) {
          console.error(`Error loading menu data for setting ${key}:`, err);
          enhancedSettings[key] = { items: [] }; // Fallback to empty menu on error
        }
      }
    }

    // Resolve menu-type settings inside blocks
    for (const [blockId, block] of Object.entries(enhancedBlocks)) {
      const menuIds = block.type && blockMenuSettingIds[block.type];
      if (!menuIds || !block.settings) continue;
      for (const settingId of menuIds) {
        const value = block.settings[settingId];
        try {
          if (value) {
            const menuData = menuMaps.byUuid.get(value) || menuMaps.bySlug.get(value);
            block.settings[settingId] = resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix) || { items: [] };
          } else {
            block.settings[settingId] = { items: [] };
          }
        } catch (err) {
          console.error(`Error loading menu data for block ${blockId} setting ${settingId}:`, err);
          block.settings[settingId] = { items: [] };
        }
      }
    }

    // Resolve page links (pageUuid -> current slug) in widget settings and blocks
    // This ensures internal links stay valid even after page renames
    const resolvedWidgetData = resolveWidgetPageLinks(
      { settings: enhancedSettings, blocks: enhancedBlocks },
      pagesByUuid,
      outputPathPrefix,
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

    // 2. Create context for layout render (use shared globals)
    const baseContext = await createBaseRenderContext(projectId, rawThemeSettings, renderMode, sharedGlobals);

    // 3. Load project data
    const projectData = await getProjectData(projectId);

    // 4. Add page-specific context with separated content sections
    // Base body class defaults to `page-${slug}`; a caller (e.g. collection
    // item-page export) may override it via contentSections.bodyClass. Pages
    // never set bodyClass, so they keep the default.
    const defaultBodyClass = pageData?.slug ? `page-${pageData.slug}` : "";
    const baseBodyClass = contentSections.bodyClass !== undefined ? contentSections.bodyClass : defaultBodyClass;
    const bodyClasses = [baseBodyClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
    const renderContext = {
      ...baseContext,
      header: contentSections.headerContent || "",
      main_content: contentSections.mainContent || "",
      footer: contentSections.footerContent || "",
      page: pageData,
      project: projectData,
      page_title: buildPageTitle(pageData, projectData),
      body_class: bodyClasses,
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

/**
 * Render an arbitrary Liquid template string through the project's cached engine
 * (so theme snippets, tags and filters all resolve). Used by the collection
 * item-page export to render a collection type's template.liquid with a
 * per-item context.
 * @param {string} projectId
 * @param {string} templateString - raw Liquid source
 * @param {object} context - render context (theme, mediaFiles, item/page data, etc.)
 * @param {object} [sharedGlobals] - globals map; falls back to context.globals
 * @returns {Promise<string>} rendered HTML
 */
async function renderLiquidTemplate(projectId, templateString, context, sharedGlobals = null) {
  const projectFolderName = await getProjectFolderName(projectId);
  const projectDir = getProjectDir(projectFolderName);
  const themeSnippetsDir = path.join(projectDir, "snippets");
  const engine = getOrCreateEngine(projectDir, themeSnippetsDir);
  return engine.parseAndRender(templateString, context, {
    globals: sharedGlobals || (context && context.globals) || {},
  });
}

/**
 * Render enqueued asset tags from sharedGlobals into HTML.
 * Used by renderSingleWidget so that dynamically enqueued assets
 * are included in the morph response and picked up by the preview runtime.
 */
function renderEnqueuedAssetTags(sharedGlobals) {
  const apiUrl = sharedGlobals.apiUrl || "";
  const projectId = sharedGlobals.projectId || "";
  const renderMode = sharedGlobals.renderMode || "preview";
  const outputPathPrefix = sharedGlobals.outputPathPrefix || "";
  let output = "";

  function resolveUrl(filepath, opts) {
    if (renderMode === "publish") {
      const version = sharedGlobals.exportVersion;
      return version ? `${outputPathPrefix}assets/${filepath}?v=${version}` : `${outputPathPrefix}assets/${filepath}`;
    }
    if (opts.source === "widget" && opts.widgetType) {
      return `${apiUrl}/api/preview/assets/${projectId}/widgets/${opts.widgetType}/${filepath}`;
    }
    return `${apiUrl}/api/preview/assets/${projectId}/assets/${filepath}`;
  }

  const styles = sharedGlobals.enqueuedStyles;
  if (styles?.size > 0) {
    const sorted = [...styles.entries()]
      .map(([filepath, opts]) => ({ filepath, opts }))
      .sort((a, b) => a.opts.priority - b.opts.priority);
    for (const { filepath, opts } of sorted) {
      let tag = `<link rel="stylesheet" href="${resolveUrl(filepath, opts)}"`;
      if (opts.media) tag += ` media="${opts.media}"`;
      if (opts.id) tag += ` id="${opts.id}"`;
      output += tag + ">\n";
    }
  }

  const scripts = sharedGlobals.enqueuedScripts;
  if (scripts?.size > 0) {
    const sorted = [...scripts.entries()]
      .map(([filepath, opts]) => ({ filepath, opts }))
      .sort((a, b) => a.opts.priority - b.opts.priority);
    for (const { filepath, opts } of sorted) {
      let tag = `<script src="${resolveUrl(filepath, opts)}"`;
      if (opts.defer) tag += " defer";
      if (opts.async) tag += " async";
      output += tag + "></script>\n";
    }
  }

  return output;
}

/**
 * Checks if a widget type declares transparent header support in its schema.
 * Reads the widget's schema.json and looks for `"supportsTransparentHeader": true`.
 */
async function widgetSupportsTransparentHeader(projectId, widgetType) {
  try {
    const projectFolderName = await getProjectFolderName(projectId);
    const projectDir = getProjectDir(projectFolderName);
    const isCoreWidget = widgetType.startsWith("core-");

    let schemaPath;
    if (isCoreWidget) {
      schemaPath = path.join(CORE_WIDGETS_DIR, widgetType, "schema.json");
    } else {
      schemaPath = path.join(projectDir, "widgets", widgetType, "schema.json");
    }

    const schemaContent = await fs.readFile(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);
    return schema.supportsTransparentHeader === true;
  } catch {
    return false;
  }
}

export {
  renderWidget,
  renderPageLayout,
  renderLiquidTemplate,
  createBaseRenderContext,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader,
  resolveLinkValue,
  resolveMenuItemLinks,
  resolveMenuPageLinks,
};
