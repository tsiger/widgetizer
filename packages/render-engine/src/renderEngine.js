import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import {
  ThemeSettingsTag,
  AssetTag,
  FontsTag,
  SeoTag,
  EnqueueStyleTag,
  EnqueueScriptTag,
  RenderHeaderAssetsTag,
  RenderFooterAssetsTag,
  PlaceholderImageTag,
  CustomCssTag,
  CustomHeadScriptsTag,
  CustomFooterScriptsTag,
  ImageTag,
  YouTubeTag,
  EnqueuePreloadTag,
  registerMediaMetaFilter,
  registerHandleizeFilter,
  registerSafeUrlFilter,
  registerRteFilters,
  registerDateFilter,
  registerCollectionFilter,
} from "@widgetizer/core";
import { resolveRichtextMediaInWidgetData } from "@widgetizer/core/richtextMedia";
import { prefixInternalHref, prefixSiteIcons } from "@widgetizer/core/linkPrefixer";
import { resolveMenuSettings, schemaHasMenuSetting } from "./menuResolver.js";

/**
 * @typedef {object} RenderDeps
 * The per-project rendering context. The shell (OSS or hosted) resolves the
 * project's scope and supplies these — the engine never resolves projects,
 * touches SQLite, or constructs absolute data paths itself.
 *
 * @property {string} projectId - Project UUID (used for cache keys, media URLs).
 * @property {string} projectDir - Absolute path to the project content dir
 *   (templates, snippets, layout.liquid, menus, assets). LiquidJS needs real FS
 *   roots, so this is a path even when storage is otherwise adapter-abstracted.
 * @property {string} coreWidgetsDir - Absolute path to the core widgets dir.
 * @property {string} coreSnippetsDir - Absolute path to the core snippets dir.
 * @property {() => (object|null)} getProjectData - Returns the project row (for
 *   siteTitle), or null. Synchronous (matches the SQLite repo).
 * @property {() => Promise<{files: Array<object>}>} getMediaFiles - Media metadata.
 * @property {() => Promise<Array<object>>} listPages - All page data objects.
 * @property {(resolvedWidgetData: object, schema: object) => void} sanitizeWidgetData
 * @property {(rawThemeSettings: object) => object} preprocessThemeSettings
 * @property {(siteIconSrc: string, mediaFiles: object, imageBasePath: string) => object} buildRuntimeSiteIcons
 */

// Cache for LiquidJS engines, keyed by project directory path
const engineCache = new Map();

// Helper to get or create an engine for a specific project
function getOrCreateEngine(projectDir, themeSnippetsDir, coreSnippetsDir) {
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
  registerSafeUrlFilter(engine);
  registerRteFilters(engine);
  registerDateFilter(engine);
  registerCollectionFilter(engine);
}

/**
 * Helper function to get project data, swallowing repo errors.
 * @param {RenderDeps} deps
 */
function getProjectData(deps) {
  try {
    return deps.getProjectData() || null;
  } catch (error) {
    console.warn(`Could not load project data for ${deps.projectId}: ${error.message}`);
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

/** True when a schema declares at least one `link`-type setting. */
function schemaHasLinkSetting(schema) {
  return Array.isArray(schema?.settings) && schema.settings.some((s) => s.type === "link");
}

/**
 * Resolve a single link object's pageUuid/collectionItemUuid to its current slug.
 * If the target exists but was deleted, clears the link. Resolved internal hrefs
 * are depth-prefixed (outputPathPrefix) so they stay valid from nested item pages.
 * @param {object} linkValue - The link object { pageUuid?, collectionItemUuid?, collectionType?, href, text, target }
 * @param {Map} pagesByUuid - Map of uuid -> page data
 * @param {string} [outputPathPrefix] - "" at root, "../" for nested item pages
 * @param {Map} [collectionItemsByUuid] - Map of item uuid -> { slugPrefix, slug }
 * @returns {object} Resolved link object
 */
function resolveLinkValue(linkValue, pagesByUuid, outputPathPrefix = "", collectionItemsByUuid = null) {
  if (!linkValue || typeof linkValue !== "object") {
    return linkValue;
  }

  const { pageUuid, collectionItemUuid } = linkValue;

  // Stable reference to a collection item page (#11 parity): resolve its current
  // slug so renames follow and deletes clear the link, mirroring pageUuid/menus.
  if (collectionItemUuid) {
    const entry = collectionItemsByUuid && collectionItemsByUuid.get(collectionItemUuid);
    if (entry) {
      return {
        ...linkValue,
        href: prefixInternalHref(`${entry.slugPrefix}/${entry.slug}.html`, outputPathPrefix),
      };
    }
    // Collection item was deleted - clear the link
    return { href: "", text: "", target: "_self" };
  }

  // If no pageUuid, this is a custom URL - pass through unchanged
  if (!pageUuid) {
    return linkValue;
  }

  // Look up the page by uuid
  const page = pagesByUuid?.get(pageUuid);

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
function resolveWidgetPageLinks(widgetData, pagesByUuid, outputPathPrefix = "", collectionItemsByUuid = null) {
  const pagesEmpty = !pagesByUuid || pagesByUuid.size === 0;
  const itemsEmpty = !collectionItemsByUuid || collectionItemsByUuid.size === 0;
  if (!widgetData || (pagesEmpty && itemsEmpty)) {
    return widgetData;
  }

  // Deep clone to avoid mutating original
  const resolved = JSON.parse(JSON.stringify(widgetData));

  // Resolve links in widget settings
  if (resolved.settings && typeof resolved.settings === "object") {
    for (const [key, value] of Object.entries(resolved.settings)) {
      if (isLinkObject(value)) {
        resolved.settings[key] = resolveLinkValue(value, pagesByUuid, outputPathPrefix, collectionItemsByUuid);
      }
    }
  }

  // Resolve links in blocks
  if (resolved.blocks && typeof resolved.blocks === "object") {
    for (const [blockId, block] of Object.entries(resolved.blocks)) {
      if (block && block.settings && typeof block.settings === "object") {
        for (const [key, value] of Object.entries(block.settings)) {
          if (isLinkObject(value)) {
            resolved.blocks[blockId].settings[key] = resolveLinkValue(value, pagesByUuid, outputPathPrefix, collectionItemsByUuid);
          }
        }
      }
    }
  }

  return resolved;
}

// Widget `menu`-type setting resolution is delegated to the shared ./menuResolver
// (resolveMenuSettings) — the single source of truth shared with collection-item
// rendering. The former inline resolveMenuItemLinks/resolveMenuPageLinks (pageUuid
// only, no depth-prefix or collection-item targets) were removed in that
// consolidation (master 741abfb8 follow-up).

/**
 * Load all pages for a project and return a map of uuid -> page data.
 * Results are cached per projectId during a single render pass.
 * @param {RenderDeps} deps
 * @returns {Promise<Map>} Map of uuid -> page data
 */
async function loadPagesByUuid(deps) {
  try {
    const pages = await deps.listPages();
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
 * @param {RenderDeps} deps
 * @returns {Promise<{byUuid: Map, bySlug: Map}>} Maps for UUID and slug-based lookup
 */
async function loadMenuMaps(deps) {
  const byUuid = new Map();
  const bySlug = new Map();

  try {
    const menusDir = path.join(deps.projectDir, "menus");

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
 * @param {RenderDeps} deps
 * @param {object} rawThemeSettings
 * @param {string} renderMode
 * @param {object} sharedGlobals - Optional shared globals object to preserve enqueued assets
 */
async function createBaseRenderContext(deps, rawThemeSettings, renderMode = "preview", sharedGlobals = null) {
  const { projectId } = deps;

  // Validate project ID
  if (!projectId) {
    throw new Error("projectId must be provided to create render context");
  }

  // Process theme settings
  const processedThemeSettings =
    rawThemeSettings && rawThemeSettings.settings && rawThemeSettings.settings.global
      ? deps.preprocessThemeSettings(rawThemeSettings)
      : {};

  // Determine API URL based on render mode
  const apiUrl =
    renderMode === "preview" ? process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}` : "";

  // Depth-aware output prefix for static export. Collection item pages render one
  // directory deep ({slugPrefix}/{slug}.html), so their asset/link hrefs need an
  // `outputPathPrefix` (e.g. "../") to resolve from the nested location. Root pages
  // (and all preview rendering) use "" — behaviour is unchanged for them. The caller
  // passes it in via sharedGlobals; default empty.
  const outputPathPrefix = (sharedGlobals && sharedGlobals.outputPathPrefix) || "";

  // Determine image base path based on render mode
  // Publish mode uses assets/images/ for consistent CSS path resolution
  const imageBasePath =
    renderMode === "publish" ? `${outputPathPrefix}assets/images` : `${apiUrl}/api/media/projects/${projectId}/uploads/images`;

  // Determine file base path based on render mode (for PDF and other file assets)
  const fileBasePath =
    renderMode === "publish" ? `${outputPathPrefix}assets/files` : `${apiUrl}/api/media/projects/${projectId}/uploads/files`;

  const siteIconSrc = processedThemeSettings?.general?.favicon || "";

  // Load media metadata and create a useful map
  let mediaFiles = {};
  try {
    const mediaData = await deps.getMediaFiles();
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

  const iconsPath = path.join(deps.projectDir, "assets", "icons.json");

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
  // active-state matching.
  if (globals.outputPathPrefix === undefined) globals.outputPathPrefix = outputPathPrefix;
  if (globals.currentCanonicalPath === undefined) globals.currentCanonicalPath = "";
  // Published date format (theme-owned, set via the `date_format` theme setting).
  // Consumed by the `format_date` filter; when a theme defines no such setting the
  // filter falls back to its own default, so we only set this when present.
  if (globals.dateFormat === undefined && processedThemeSettings?.general?.date_format) {
    globals.dateFormat = processedThemeSettings.general.date_format;
  }

  // Collection items loader for the `| collection` filter. The shell supplies a
  // scope-aware factory (`deps.buildCollectionItemsLoader`) — the engine never
  // imports the collection service or touches storage itself. Attached once per
  // render; results cached per (type, options) on `globals` so multiple widgets
  // reading the same collection only hit storage once. The cache is per-render
  // (scoped to `globals`) because `outputPathPrefix` differs across output depths,
  // so a root page and a nested item page must not share a `url`.
  if (typeof deps.buildCollectionItemsLoader === "function" && !globals.getCollectionItems) {
    if (!globals.collectionCache) globals.collectionCache = new Map();
    globals.getCollectionItems = deps.buildCollectionItemsLoader({
      globals,
      imageBasePath,
      fileBasePath,
    });
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
      ? prefixSiteIcons(globals.siteIcons, globals.outputPathPrefix || "")
      : deps.buildRuntimeSiteIcons(siteIconSrc, mediaFiles, imageBasePath),
  };
}

/**
 * Renders a specific widget template with given data using LiquidJS.
 * Handles core widgets, global widgets (header/footer), and theme widgets.
 * Loads widget schema defaults, merges with provided settings, and resolves menu data.
 * @param {RenderDeps} deps - Resolved per-project rendering context
 * @param {string} widgetId - Unique identifier for this widget instance
 * @param {object} widgetData - Widget configuration containing type, settings, blocks, and blocksOrder
 * @param {object} rawThemeSettings - Raw theme settings from theme.json
 * @param {string} [renderMode='preview'] - Render mode: 'preview' for dev server URLs, 'publish' for relative paths
 * @param {object} [sharedGlobals=null] - Optional shared globals to preserve enqueued assets across widgets
 * @param {number} [index=null] - Optional 1-based index of the widget in the page
 * @returns {Promise<string>} Rendered HTML string, or error HTML if rendering fails
 */
async function renderWidget(
  deps,
  widgetId,
  widgetData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
  index = null,
) {
  try {
    const { type, settings = {}, blocks = {}, blocksOrder = [] } = widgetData;
    const projectDir = deps.projectDir;

    // Determine if this is a core widget (prefixed with "core-")
    const isCoreWidget = type.startsWith("core-");

    // Determine the correct path based on widget type
    let widgetPath;
    let schemaPath;
    if (isCoreWidget) {
      // Core widget (folder structure)
      widgetPath = path.join(deps.coreWidgetsDir, type, "widget.liquid");
      schemaPath = path.join(deps.coreWidgetsDir, type, "schema.json");
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
      pagesByUuid = await loadPagesByUuid(deps);
      if (sharedGlobals) {
        sharedGlobals.pagesByUuid = pagesByUuid;
      }
    }

    // Load menu maps (UUID and slug-based) — cached in sharedGlobals across widgets
    let menuMaps;
    if (sharedGlobals && sharedGlobals.menuMaps) {
      menuMaps = sharedGlobals.menuMaps;
    } else {
      menuMaps = await loadMenuMaps(deps);
      if (sharedGlobals) {
        sharedGlobals.menuMaps = menuMaps;
      }
    }

    // Depth-aware prefix for links/menus emitted by this widget ("" for root pages
    // and all preview, "../" when rendering inside a nested collection item page).
    const outputPathPrefix = (sharedGlobals && sharedGlobals.outputPathPrefix) || "";

    // Whether the widget (or its blocks) declares any `menu` or `link` setting.
    // Both setting types can target a collection item (collectionItemUuid), so
    // either drives loading the item uuid -> { slugPrefix, slug } map (#11 parity
    // with pageUuid). Loaded once via the shell-supplied deps hook (the engine
    // imports no backend code) and cached across widgets on sharedGlobals;
    // non-collection callers skip the load.
    const hasMenuSettings =
      schemaHasMenuSetting(schema) ||
      Object.values(blockSchemas).some((bs) => Array.isArray(bs) && bs.some((s) => s.type === "menu"));
    const hasLinkSettings =
      schemaHasLinkSetting(schema) ||
      Object.values(blockSchemas).some((bs) => Array.isArray(bs) && bs.some((s) => s.type === "link"));
    let collectionItemsByUuid = (sharedGlobals && sharedGlobals.collectionItemsByUuid) || null;
    if ((hasMenuSettings || hasLinkSettings) && !collectionItemsByUuid && typeof deps.loadCollectionItemsByUuid === "function") {
      try {
        collectionItemsByUuid = await deps.loadCollectionItemsByUuid();
        if (sharedGlobals) sharedGlobals.collectionItemsByUuid = collectionItemsByUuid;
      } catch (err) {
        console.warn(`Could not load collection items for link/menu resolution: ${err.message}`);
      }
    }

    // Resolve `menu`-type settings (widget + blocks) into full menu objects via the
    // shared menuResolver — the single source of truth shared with collection-item
    // rendering: depth-aware links, collection-item targets (#11), and custom-link
    // sanitization. A missing/empty value or unknown menu yields { items: [] }.
    const menuDeps = { menuMaps, pagesByUuid, collectionItemsByUuid: collectionItemsByUuid || new Map(), outputPathPrefix };
    resolveMenuSettings(enhancedSettings, schema.settings, menuDeps);
    for (const block of Object.values(enhancedBlocks)) {
      if (block && block.type && block.settings && Array.isArray(blockSchemas[block.type])) {
        resolveMenuSettings(block.settings, blockSchemas[block.type], menuDeps);
      }
    }

    // Resolve page/collection-item links (uuid -> current slug, depth-aware) in
    // widget settings and blocks, so internal links survive renames.
    const resolvedWidgetData = resolveWidgetPageLinks(
      { settings: enhancedSettings, blocks: enhancedBlocks },
      pagesByUuid,
      outputPathPrefix,
      collectionItemsByUuid,
    );

    // Sanitize settings based on schema types (text, richtext, link, etc.)
    // This runs after link resolution so resolved URLs are also validated.
    // resolvedWidgetData is already a deep clone, safe to mutate in place.
    deps.sanitizeWidgetData(resolvedWidgetData, schema);

    // Base context first: it carries the mode-aware media bases (imagePath/filePath),
    // which resolve embedded media paths inside richtext settings before the template
    // renders — so a richtext <img> loads in both preview and export with no per-template
    // wiring. Runs on the already-sanitized clone; stored values keep their portable path.
    const baseContext = await createBaseRenderContext(deps, rawThemeSettings, renderMode, sharedGlobals);
    resolveRichtextMediaInWidgetData(resolvedWidgetData, schema, baseContext.imagePath, baseContext.filePath);

    // Create widget context for template
    const widgetContext = {
      id: widgetId,
      type,
      settings: resolvedWidgetData.settings,
      blocks: resolvedWidgetData.blocks,
      blocksOrder: blocksOrder || [],
      index: index, // 1-based index of widget in page (null for global widgets or when not provided)
    };

    // Merge with widget-specific context
    const renderContext = {
      ...baseContext,
      widget: widgetContext,
    };

    // Get theme snippets directory for this project
    const themeSnippetsDir = path.join(projectDir, "snippets");

    // Get or create cached engine
    const engine = getOrCreateEngine(projectDir, themeSnippetsDir, deps.coreSnippetsDir);

    // Render the template
    let rendered = await engine.parseAndRender(templateForRender, renderContext, {
      globals: renderContext.globals,
    });
    return rendered;
  } catch (error) {
    console.error(`Error rendering widget ${widgetId} (Project: ${deps.projectId}):`, error);
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
 * @param {RenderDeps} deps - Resolved per-project rendering context
 * @param {object} contentSections - Pre-rendered content sections
 * @param {string} contentSections.headerContent - Rendered header HTML
 * @param {string} contentSections.mainContent - Rendered main content HTML
 * @param {string} contentSections.footerContent - Rendered footer HTML
 * @param {object} pageData - Page metadata (title, slug, etc.)
 * @param {object} rawThemeSettings - Raw theme settings from theme.json
 * @param {string} [renderMode='preview'] - Render mode: 'preview' for dev server URLs, 'publish' for relative paths
 * @param {object} [sharedGlobals=null] - Optional shared globals with enqueued styles/scripts
 * @returns {Promise<string>} Complete rendered HTML document
 */
async function renderPageLayout(
  deps,
  contentSections,
  pageData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
) {
  try {
    // 1. Fetch layout.liquid for the project
    const projectDir = deps.projectDir;
    const layoutPath = path.join(projectDir, "layout.liquid");

    let layoutTemplate;
    try {
      layoutTemplate = await fs.readFile(layoutPath, "utf-8");
    } catch (readErr) {
      console.error(`Layout template not found at ${layoutPath}`);
      return `<html><body><h1>Error: Layout template not found</h1><pre>${readErr.message}</pre></body></html>`;
    }

    // 2. Create context for layout render (use shared globals)
    const baseContext = await createBaseRenderContext(deps, rawThemeSettings, renderMode, sharedGlobals);

    // 3. Load project data
    const projectData = await getProjectData(deps);

    // 4. Add page-specific context with separated content sections
    const pageSlugClass = pageData?.slug ? `page-${pageData.slug}` : "";
    const bodyClasses = [pageSlugClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
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
    const engine = getOrCreateEngine(projectDir, themeSnippetsDir, deps.coreSnippetsDir);

    const renderedHtml = await engine.parseAndRender(layoutTemplate, renderContext, {
      globals: renderContext.globals,
    });
    return renderedHtml;
  } catch (error) {
    console.error(`Error rendering page layout for project ${deps.projectId}:`, error);
    return `<html><body><h1>Error rendering page</h1><pre>${error.message}</pre></body></html>`;
  }
}

/**
 * Render a single collection item's page: header/footer + resolved item +
 * the collection type's template + the page layout — the item-page equivalent
 * of the page render path, sharing `renderWidget`/`renderPageLayout` so the
 * output matches pages exactly. Depth (`outputPathPrefix`), the page map
 * (`pagesByUuid`), and the collection-item map (`collectionItemsByUuid`) are read
 * off `sharedGlobals`; menu maps are loaded lazily here (engine-internal,
 * fs-based) when absent, so the depth used to resolve item links can never
 * disagree with the depth the layout renders at.
 *
 * The collection-specific item resolution + page-data shaping live in
 * builder-server `collectionService`, so the shell injects them as
 * `prepareItem` / `buildItemPageData` callbacks — the engine imports no backend
 * code and stays storage/scope-free.
 *
 * @param {RenderDeps} deps
 * @param {object} args
 * @param {object} args.schema - Normalized collection schema.
 * @param {object} args.item - Raw/normalized item (export or preview).
 * @param {string} args.template - The collection type's `template.liquid` source.
 * @param {object} args.rawThemeSettings - Raw theme settings.
 * @param {string} args.renderMode - "publish" | "preview".
 * @param {object} args.sharedGlobals - Caller-built globals (mode-specific). Must
 *   carry `outputPathPrefix`; the caller supplies `pagesByUuid` +
 *   `collectionItemsByUuid` when item links/menus must resolve.
 * @param {object|null} args.headerData - Global header widget data, or null.
 * @param {object|null} args.footerData - Global footer widget data, or null.
 * @param {object} args.projectData - Project object for the item template's `project` context.
 * @param {string} args.siteUrl - Site URL for canonical/og resolution ("" in preview).
 * @param {Function} args.prepareItem - collectionService.prepareCollectionItemForRender
 * @param {Function} args.buildItemPageData - collectionService.buildCollectionItemPageData
 * @returns {Promise<{ html: string, mainContentHtml: string, itemPageData: object, resolvedItem: object }>}
 */
async function renderCollectionItemPage(
  deps,
  {
    schema,
    item,
    template,
    rawThemeSettings,
    renderMode,
    sharedGlobals,
    headerData,
    footerData,
    projectData,
    siteUrl,
    prepareItem,
    buildItemPageData,
  },
) {
  // Resolve `menu`-type item settings the same way widgets do, when the maps are
  // present. Menu maps are engine-internal (fs-based) — load them lazily if the
  // caller didn't supply them, so prep below sees the same maps the layout will.
  if (!sharedGlobals.menuMaps) sharedGlobals.menuMaps = await loadMenuMaps(deps);
  const menuDeps =
    sharedGlobals.menuMaps || sharedGlobals.collectionItemsByUuid
      ? { menuMaps: sharedGlobals.menuMaps, collectionItemsByUuid: sharedGlobals.collectionItemsByUuid }
      : null;

  // Base context first: its mode-aware media bases (imagePath/filePath) resolve
  // embedded media paths in the item's richtext fields during prep below.
  const baseContext = await createBaseRenderContext(deps, rawThemeSettings, renderMode, sharedGlobals);

  // Resolve item links at the layout's depth + sanitize + resolve richtext media.
  const resolvedItem = prepareItem(item, schema, sharedGlobals.pagesByUuid, sharedGlobals.outputPathPrefix, menuDeps, {
    imagePath: baseContext.imagePath,
    filePath: baseContext.filePath,
  });

  // Render header/footer with the item's globals so their enqueued assets are
  // captured before the layout emits them.
  let headerContent = "";
  let footerContent = "";
  if (headerData) {
    headerContent = await renderWidget(deps, "header", headerData, rawThemeSettings, renderMode, sharedGlobals, null);
  }
  if (footerData) {
    footerContent = await renderWidget(deps, "footer", footerData, rawThemeSettings, renderMode, sharedGlobals, null);
  }

  // Page-shaped object drives the layout title/SEO/body class. Built BEFORE the
  // template render so the item template receives the page/collection/project
  // context, not just item.
  const itemPageData = buildItemPageData(schema, resolvedItem, siteUrl);

  // Render the collection type's template.liquid against the item context.
  const themeSnippetsDir = path.join(deps.projectDir, "snippets");
  const engine = getOrCreateEngine(deps.projectDir, themeSnippetsDir, deps.coreSnippetsDir);
  const itemRenderContext = {
    ...baseContext,
    item: resolvedItem,
    collection: schema,
    page: itemPageData,
    project: projectData,
  };
  const mainContentHtml = await engine.parseAndRender(template, itemRenderContext, {
    globals: itemRenderContext.globals,
  });

  // Item-specific body class so a `.page-{slug}` index rule never leaks here.
  const html = await renderPageLayout(
    deps,
    {
      headerContent,
      mainContent: mainContentHtml,
      footerContent,
      extraBodyClasses: `collection-${schema.type} item-${resolvedItem.slug}`,
    },
    itemPageData,
    rawThemeSettings,
    renderMode,
    sharedGlobals,
  );

  return { html, mainContentHtml, itemPageData, resolvedItem };
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
  let output = "";

  function resolveUrl(filepath, opts) {
    if (renderMode === "publish") {
      const version = sharedGlobals.exportVersion;
      return version ? `assets/${filepath}?v=${version}` : `assets/${filepath}`;
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
 * @param {RenderDeps} deps
 * @param {string} widgetType
 */
async function widgetSupportsTransparentHeader(deps, widgetType) {
  try {
    const projectDir = deps.projectDir;
    const isCoreWidget = widgetType.startsWith("core-");

    let schemaPath;
    if (isCoreWidget) {
      schemaPath = path.join(deps.coreWidgetsDir, widgetType, "schema.json");
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
  renderCollectionItemPage,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader,
};
