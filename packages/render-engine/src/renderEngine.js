import { Liquid } from "liquidjs";
import fs from "fs/promises";
import path from "path";
import { resolveInside } from "./safePath.js";
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
  registerPageUrlFilters,
  registerSiteStringFilter,
  resolveSiteString,
} from "@widgetizer/core";
import { escapeHtml } from "@widgetizer/core/escapeHtml";
import { resolveRichtextMediaInWidgetData } from "@widgetizer/core/richtextMedia";
import { resolveRichtextLinksInWidgetData, schemaHasRichtextSetting } from "@widgetizer/core/richtextLinks";
import { prefixInternalHref, prefixSiteIcons } from "@widgetizer/core/linkPrefixer";
import { pageHref, itemHref } from "@widgetizer/core/internalHref";
import { buildBreadcrumbs, indexListingPages } from "@widgetizer/core/breadcrumbs";
import { pagedHref, pageOutputPath, resolveLanguage } from "@widgetizer/core/contentAddress";
import { LANGUAGE_CODE_RE, languageDir } from "@widgetizer/core/languages";
import { buildAssetUrl } from "@widgetizer/core/assetUrl";
import { identityForTheme } from "@widgetizer/core/siteIdentity";
import { resolveMenuSettings, schemaHasMenuSetting } from "./menuResolver.js";
import { buildTranslations } from "@widgetizer/core/translations";

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
  registerPageUrlFilters(engine);
  registerSiteStringFilter(engine);
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

function paginationContextFor(sharedGlobals) {
  return sharedGlobals?.paginationPlan
    ? buildPaginationContext(sharedGlobals.paginationPlan, {
        cleanUrls: sharedGlobals.cleanUrls === true,
        outputPathPrefix: sharedGlobals.outputPathPrefix || "",
      })
    : null;
}

function pageContextFor(pageData, breadcrumbs, pagination, translations = []) {
  if (!pageData) return pageData;
  return {
    ...pageData,
    breadcrumbs,
    // The switcher contract (§7c). `dir` is here from day one so adding an RTL
    // language never changes a shipped theme.
    translations,
    dir: languageDir(pageData.language),
    ...(pagination ? { pagination } : {}),
  };
}

/**
 * The languages this page or item can be switched to, computed once per render
 * and cached beside the breadcrumbs — header, footer, the layout and every
 * widget must see the same array.
 *
 * @param {RenderDeps} deps
 * @param {object|null} sharedGlobals
 * @param {{current: object, kind?: string, slugPrefix?: string}} what
 */
async function ensureTranslations(deps, sharedGlobals, what) {
  if (!sharedGlobals) return [];
  if (sharedGlobals.translations) return sharedGlobals.translations;

  const { defaultLanguage, languages } = await languageSettings(deps, sharedGlobals);
  if (!languages.length || !what?.current) {
    sharedGlobals.translations = [];
    return sharedGlobals.translations;
  }

  if (!sharedGlobals.pagesByUuid) sharedGlobals.pagesByUuid = await loadPagesByUuid(deps);
  const projectData = await getProjectData(deps);

  sharedGlobals.translations = buildTranslations({
    current: what.current,
    kind: what.kind || "page",
    slugPrefix: what.slugPrefix || "",
    pages: [...sharedGlobals.pagesByUuid.values()],
    items: sharedGlobals.collectionItemsByUuid ? [...sharedGlobals.collectionItemsByUuid.values()] : [],
    languages: [defaultLanguage, ...languages],
    defaultLanguage,
    cleanUrls: sharedGlobals.cleanUrls === true,
    outputPathPrefix: sharedGlobals.outputPathPrefix || "",
    siteUrl: projectData?.siteUrl || "",
  });
  return sharedGlobals.translations;
}

// `{% seo %}` reads the canonical's shape from `project.cleanUrls`, so it must
// carry the flag this render's links were emitted with (a caller-seeded or
// first-use stamp on sharedGlobals), not the row just loaded: a toggle landing
// between the two reads must not split a page's canonical from its links.
function projectContextFor(projectData, sharedGlobals) {
  if (!projectData) return projectData;
  return {
    ...projectData,
    ...(sharedGlobals && sharedGlobals.cleanUrls !== undefined ? { cleanUrls: sharedGlobals.cleanUrls === true } : {}),
    identity: identityForTheme(projectData.siteIdentity, projectData),
  };
}

function buildPageTitle(pageData, projectData, pageNumber = 1) {
  const baseTitle =
    pageData?.seo?.title && typeof pageData.seo.title === "string" && pageData.seo.title.trim()
      ? pageData.seo.title.trim()
      : pageData?.name || "";
  const pageTitle = pageNumber > 1 ? `${baseTitle} - ${pageNumber}` : baseTitle;
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
 * @param {boolean} [cleanUrls] - The project's Clean URLs setting; picks the href shape
 * @param {string} [defaultLanguage] - the project's default; the target's own language decides its folder
 * @returns {object} Resolved link object
 */
function resolveLinkValue(
  linkValue,
  pagesByUuid,
  outputPathPrefix = "",
  collectionItemsByUuid = null,
  cleanUrls = false,
  defaultLanguage = "",
) {
  if (!linkValue || typeof linkValue !== "object") {
    return linkValue;
  }

  const { pageUuid, collectionItemUuid } = linkValue;

  // Stable reference to a collection item page (#11 parity): resolve its current
  // slug so renames follow and deletes clear the link, mirroring pageUuid/menus.
  if (collectionItemUuid) {
    const entry = collectionItemsByUuid && collectionItemsByUuid.get(collectionItemUuid);
    if (entry) {
      const opts = { cleanUrls, outputPathPrefix, language: entry.language, defaultLanguage };
      return { ...linkValue, href: itemHref(entry.slugPrefix, entry.slug, opts) };
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
    const opts = { cleanUrls, outputPathPrefix, language: page.language, defaultLanguage };
    return { ...linkValue, href: pageHref(page.slug, opts) };
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
function resolveWidgetPageLinks(
  widgetData,
  pagesByUuid,
  outputPathPrefix = "",
  collectionItemsByUuid = null,
  cleanUrls = false,
  defaultLanguage = "",
) {
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
        resolved.settings[key] = resolveLinkValue(
          value,
          pagesByUuid,
          outputPathPrefix,
          collectionItemsByUuid,
          cleanUrls,
          defaultLanguage,
        );
      }
    }
  }

  // Resolve links in blocks
  if (resolved.blocks && typeof resolved.blocks === "object") {
    for (const [blockId, block] of Object.entries(resolved.blocks)) {
      if (block && block.settings && typeof block.settings === "object") {
        for (const [key, value] of Object.entries(block.settings)) {
          if (isLinkObject(value)) {
            resolved.blocks[blockId].settings[key] = resolveLinkValue(
              value,
              pagesByUuid,
              outputPathPrefix,
              collectionItemsByUuid,
              cleanUrls,
              defaultLanguage,
            );
          }
        }
      }
    }
  }

  return resolved;
}

// Widget `menu`-type setting resolution is delegated to the shared ./menuResolver
// (resolveMenuSettings) — the single source of truth shared with collection-item
// rendering. This keeps page UUID, collection-item target, and depth-prefix
// behavior in one place.

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
 * The project's language settings, cached per render beside the Clean URLs flag.
 * @param {RenderDeps} deps
 * @param {object|null} sharedGlobals
 */
/**
 * The words the theme puts on the page, every language at once — the same shape
 * `mediaFiles` uses, and for the same reason: whoever loads them does not know
 * which page is coming, while the `t` filter reading them does. Cached on the
 * render's globals beside the menu maps and the breadcrumbs.
 */
async function ensureSiteStrings(deps, globals) {
  if (!globals) return null;
  if (globals.siteStrings === undefined) {
    globals.siteStrings = typeof deps.loadSiteStrings === "function" ? await deps.loadSiteStrings() : null;
  }
  if (globals.defaultLanguage === undefined) {
    globals.defaultLanguage = (await languageSettings(deps, globals)).defaultLanguage;
  }
  return globals.siteStrings;
}

/**
 * A setting's starting value. `defaultKey` names a site string, so the default
 * arrives in the language of the page rather than in the theme author's — which
 * is what lets a site in one language read correctly with nothing filled in,
 * while a value the owner types still wins over it.
 */
function settingDefault(setting, strings, language, defaultLanguage) {
  if (typeof setting?.defaultKey === "string" && setting.defaultKey) {
    const found = resolveSiteString(strings, setting.defaultKey, language, defaultLanguage);
    if (found !== undefined) return found;
  }
  return setting?.default;
}

async function languageSettings(deps, sharedGlobals) {
  if (sharedGlobals?.languageSettings) return sharedGlobals.languageSettings;
  const projectData = await getProjectData(deps);
  const settings = {
    defaultLanguage: resolveLanguage("", projectData?.defaultLanguage),
    languages: Array.isArray(projectData?.languages) ? projectData.languages : [],
  };
  if (sharedGlobals) sharedGlobals.languageSettings = settings;
  return settings;
}

/**
 * Index which pages list each collection, for collection-item breadcrumbs. Only
 * the widget types actually placed on a page are read, so a project pays for its
 * own widgets rather than the theme's whole catalogue. Cached per render.
 * @param {RenderDeps} deps
 * @param {Map} pagesByUuid
 */
async function loadListingIndex(deps, pagesByUuid) {
  const types = new Set();
  for (const page of pagesByUuid.values()) {
    for (const widget of Object.values(page?.widgets || {})) {
      if (widget?.type) types.add(widget.type);
    }
  }

  const schemas = {};
  await Promise.all(
    [...types].map(async (type) => {
      const schemaPath = await resolveInside(deps.projectDir, "widgets", type, "schema.json");
      if (!schemaPath) return;
      try {
        schemas[type] = JSON.parse(await fs.readFile(schemaPath, "utf-8"));
      } catch {
        // A widget without a readable schema simply declares no collection.
      }
    }),
  );

  return indexListingPages(pagesByUuid.values(), schemas);
}

/**
 * The breadcrumb trail for whatever is being rendered, computed once and cached
 * on `sharedGlobals` so header, footer, every widget and the layout all read the
 * same array.
 *
 * Pages resolve lazily from `currentCanonicalPath` — the caller renders the
 * header before the engine ever sees the page. Collection items cannot: the
 * trail needs the item's title, which the path does not carry, so
 * `renderCollectionItemPage` seeds the trail itself before rendering the header.
 *
 * @param {RenderDeps} deps
 * @param {object|null} sharedGlobals
 * @returns {Promise<Array>}
 */
async function ensureBreadcrumbs(deps, sharedGlobals) {
  if (!sharedGlobals) return [];
  if (sharedGlobals.breadcrumbs) return sharedGlobals.breadcrumbs;

  const canonicalPath = sharedGlobals.currentCanonicalPath || "";
  if (!canonicalPath) {
    sharedGlobals.breadcrumbs = [];
    return sharedGlobals.breadcrumbs;
  }

  if (!sharedGlobals.pagesByUuid) sharedGlobals.pagesByUuid = await loadPagesByUuid(deps);
  const pagesByUuid = sharedGlobals.pagesByUuid;
  const { defaultLanguage, languages } = await languageSettings(deps, sharedGlobals);

  // The canonical path is the file path, so it names the language folder too; a
  // page is found by rebuilding that path rather than by matching a slug, which
  // is no longer unique across languages.
  const page =
    [...pagesByUuid.values()].find(
      (candidate) =>
        candidate?.slug &&
        pageOutputPath(candidate.slug, 1, { language: candidate.language, defaultLanguage }) === canonicalPath,
    ) || null;

  const shape = {
    pagesByUuid,
    cleanUrls: sharedGlobals.cleanUrls === true,
    outputPathPrefix: sharedGlobals.outputPathPrefix || "",
    defaultLanguage,
  };

  if (page) {
    sharedGlobals.breadcrumbs = buildBreadcrumbs({
      ...shape,
      page,
      language: page.language,
      pageNumber: sharedGlobals.paginationPlan?.current || 1,
    });
    return sharedGlobals.breadcrumbs;
  }

  // Not a page: a collection item, whose path carries its language folder ahead
  // of the collection prefix. Item pages normally seed the trail themselves in
  // renderCollectionItemPage; this resolves the preview's single-widget morph,
  // which re-renders a header in isolation and knows only the path.
  const withoutExt = canonicalPath.endsWith(".html") ? canonicalPath.slice(0, -5) : canonicalPath;
  const [maybeLanguage, ...rest] = withoutExt.split("/");
  const itemLanguage = languages.includes(maybeLanguage) ? maybeLanguage : "";
  const target = itemLanguage ? rest.join("/") : withoutExt;
  if (!target.includes("/")) {
    sharedGlobals.breadcrumbs = [];
    return sharedGlobals.breadcrumbs;
  }

  const resolved = await resolveItemFromPath(deps, target);
  if (!sharedGlobals.listingPages) {
    sharedGlobals.listingPages = await loadListingIndex(deps, pagesByUuid);
  }
  sharedGlobals.breadcrumbs = resolved
    ? buildBreadcrumbs({
        ...shape,
        item: { ...resolved.item, language: resolveLanguage(itemLanguage, defaultLanguage) },
        collectionType: resolved.collectionType,
        language: resolveLanguage(itemLanguage, defaultLanguage),
        listingPages: sharedGlobals.listingPages,
      })
    : [];
  return sharedGlobals.breadcrumbs;
}

/**
 * Resolve `newsPrefix/story` to the collection type and the item's display
 * title, by matching the path's first segment against each collection schema's
 * `slugPrefix`.
 *
 * The path reaches here from a preview morph request body, so both segments go
 * through `resolveInside` before touching the filesystem.
 *
 * @param {RenderDeps} deps
 * @param {string} target - extension-stripped item path
 * @returns {Promise<{collectionType: string, item: {slug: string, name: string, slugPrefix: string}}|null>}
 */
async function resolveItemFromPath(deps, target) {
  const separator = target.indexOf("/");
  const slugPrefix = target.slice(0, separator);
  const slug = target.slice(separator + 1);
  if (!slugPrefix || !slug || slug.includes("/")) return null;

  let types;
  try {
    types = await fs.readdir(path.join(deps.projectDir, "collection-types"));
  } catch {
    return null;
  }

  for (const type of types) {
    try {
      const schemaPath = await resolveInside(deps.projectDir, "collection-types", type, "schema.json");
      if (!schemaPath) continue;
      const schema = JSON.parse(await fs.readFile(schemaPath, "utf-8"));
      if (schema?.slugPrefix !== slugPrefix) continue;

      const itemPath = await resolveInside(deps.projectDir, "collections", type, `${slug}.json`);
      if (!itemPath) return null;
      const item = JSON.parse(await fs.readFile(itemPath, "utf-8"));
      const titleField = (schema.settings || []).find((setting) => setting.usedAsTitle);
      return {
        collectionType: schema.type || type,
        item: {
          slug,
          name: (titleField && item?.settings?.[titleField.id]) || slug,
          slugPrefix,
        },
      };
    } catch {
      // Unreadable schema or item: keep looking, then give up quietly.
    }
  }
  return null;
}

async function planPagination(deps, widgets, widgetsOrder, { pageSlug, currentPage = 1, language = "" } = {}) {
  if (typeof deps.countCollectionItems !== "function") return null;
  // The plan carries the language because it outlives this call: every pager URL
  // is built from it later, and a copy of a Greek page lives beside the Greek one.
  const { defaultLanguage } = await languageSettings(deps, null);
  const order = Array.isArray(widgetsOrder) && widgetsOrder.length > 0 ? widgetsOrder : Object.keys(widgets || {});

  for (const widgetId of order) {
    if (typeof widgetId !== "string") continue;
    const widget = widgets?.[widgetId];
    if (widget?.settings?.paginate !== true || typeof widget.type !== "string") continue;

    const schemaPath = await resolveInside(deps.projectDir, "widgets", widget.type, "schema.json");
    if (!schemaPath) continue;
    let schema;
    try {
      schema = JSON.parse(await fs.readFile(schemaPath, "utf-8"));
    } catch {
      continue;
    }

    const collectionType = schema?.collection?.type;
    const perPageSetting = schema?.collection?.perPageSetting;
    if (!collectionType || typeof perPageSetting !== "string" || !Array.isArray(schema.settings)) continue;

    const declared = schema.settings.find((setting) => setting?.id === perPageSetting);
    const perPage = Number(widget.settings[perPageSetting] ?? declared?.default);
    if (!Number.isInteger(perPage) || perPage < 1) continue;

    const totalItems = await deps.countCollectionItems(collectionType, language);
    const total = Math.ceil(totalItems / perPage);
    if (total < 2) return null;

    const current = Math.min(Math.max(Math.floor(Number(currentPage)) || 1, 1), total);
    return { widgetId, collectionType, perPage, totalItems, total, current, pageSlug, language, defaultLanguage };
  }
  return null;
}

function buildPaginationContext(plan, { cleanUrls = false, outputPathPrefix = "" } = {}) {
  const href = (pageNumber) =>
    pagedHref(plan.pageSlug, pageNumber, {
      cleanUrls,
      outputPathPrefix,
      language: plan.language || "",
      defaultLanguage: plan.defaultLanguage,
    });
  const pages = [];
  for (let number = 1; number <= plan.total; number += 1) {
    pages.push({ number, href: href(number), current: number === plan.current });
  }
  return {
    current: plan.current,
    total: plan.total,
    perPage: plan.perPage,
    totalItems: plan.totalItems,
    prevHref: plan.current > 1 ? href(plan.current - 1) : null,
    nextHref: plan.current < plan.total ? href(plan.current + 1) : null,
    pages,
  };
}

/**
 * Load all menus for a project and return maps for UUID and slug-based lookup.
 *
 * A uuid is globally unique, so `byUuid` spans every language. A bare SLUG is
 * not: it means "this language's menu of that name", so the slug lookup is kept
 * per language and the caller says which one it is rendering.
 *
 * @param {RenderDeps} deps
 * @returns {Promise<{byUuid: Map, bySlug: Map<string, Map>}>}
 */
async function loadMenuMaps(deps) {
  const byUuid = new Map();
  const bySlug = new Map();
  // "" is the default language, which owns the root folder.
  const slugsFor = (language) => {
    if (!bySlug.has(language)) bySlug.set(language, new Map());
    return bySlug.get(language);
  };
  slugsFor("");

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
        // `file` comes from readdir so it can't traverse, but it can be a
        // symlink out of the project — resolveInside catches that. Base is the
        // PROJECT dir, not menusDir: a symlinked menus/ would otherwise be
        // validated against itself and pass.
        const menuPath = await resolveInside(deps.projectDir, "menus", file);
        if (!menuPath) continue;
        const content = await fs.readFile(menuPath, "utf8");
        const menu = JSON.parse(content);
        if (menu.uuid) {
          byUuid.set(menu.uuid, menu);
        }
        const slugId = file.replace(".json", "");
        slugsFor("").set(slugId, menu);
      } catch {
        // Skip unreadable menu files
      }
    }

    // Another language's menus: by uuid globally, and by slug under their own
    // language, so a bare slug resolves to the menu of the language being
    // rendered rather than always to the root one.
    for (const entry of files) {
      if (!LANGUAGE_CODE_RE.test(entry)) continue;
      let languageFiles;
      try {
        languageFiles = await fs.readdir(path.join(menusDir, entry));
      } catch {
        continue;
      }
      for (const file of languageFiles) {
        if (!file.endsWith(".json")) continue;
        try {
          const menuPath = await resolveInside(deps.projectDir, "menus", entry, file);
          if (!menuPath) continue;
          const menu = JSON.parse(await fs.readFile(menuPath, "utf8"));
          if (menu.uuid) byUuid.set(menu.uuid, menu);
          slugsFor(entry).set(file.replace(".json", ""), menu);
        } catch {
          // Skip unreadable menu files
        }
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

  // Preview emits origin-relative URLs (the serving shell owns the origin: OSS uses
  // the render document's origin + <base href="/">; hosted its own <base href> →
  // APP_ORIGIN). Publish already used "".
  const apiUrl = "";

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

  // Fixed name; guarded so a symlinked icons.json can't pull JSON in from
  // outside the project. null → the reads below fail and icons stay empty.
  const iconsPath = await resolveInside(deps.projectDir, "assets", "icons.json");

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

  await ensureSiteStrings(deps, globals);

  // Expose depth-aware path globals (defaults keep pages at the export root).
  // `outputPathPrefix` prefixes relative asset/link URLs; `currentCanonicalPath`
  // is the un-prefixed path of the page being rendered, used for menu
  // active-state matching. `cleanUrls` — the project's Clean URLs setting;
  // stamped by `renderWidget` on first use when absent.
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

    // Determine the correct base + folder for this widget type. `type` comes
    // from page JSON and is NOT validated on save, so it is treated as hostile:
    // every path below is resolved through resolveInside, which contains it
    // within the base it belongs to. Without that, a type of "../../<other
    // project>/widgets/hero" reads another project's template and renders it
    // into this page — and "core-../.." satisfies the core-widget branch too.
    let baseDir;
    let widgetFolder;
    if (isCoreWidget) {
      // Core widget (folder structure)
      baseDir = deps.coreWidgetsDir;
      widgetFolder = [type];
    } else if (type === "header" || type === "footer") {
      // Global theme widget (folder structure)
      baseDir = projectDir;
      widgetFolder = ["widgets", "global", type];
    } else {
      // Regular theme widget (folder structure)
      baseDir = projectDir;
      widgetFolder = ["widgets", type];
    }

    const widgetPath = await resolveInside(baseDir, ...widgetFolder, "widget.liquid");
    const schemaPath = await resolveInside(baseDir, ...widgetFolder, "schema.json");
    if (!widgetPath) {
      console.warn(`Widget type escapes its allowed directory, refusing to render: ${type}`);
      return `<div class="widget-error">Widget template not found: ${escapeHtml(type)}.liquid</div>`;
    }

    // Read the widget template
    let template;
    try {
      template = await fs.readFile(widgetPath, "utf-8");
    } catch (error) {
      // If template not found, return an informative error message instead of crashing
      console.warn(`Widget template not found at ${widgetPath}. Error: ${error.message}`);
      return `<div class="widget-error">Widget template not found: ${escapeHtml(type)}.liquid</div>`;
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
    const namesSiteString = (list) => Array.isArray(list) && list.some((setting) => setting?.defaultKey);
    const wantsSiteStrings =
      namesSiteString(schema.settings) || (Array.isArray(schema.blocks) && schema.blocks.some((b) => namesSiteString(b?.settings)));
    // Only loaded when a schema actually asks, so a theme using none pays nothing.
    const siteStrings = wantsSiteStrings ? await ensureSiteStrings(deps, sharedGlobals) : null;
    const settingLanguage = sharedGlobals?.currentPageData?.language;
    const settingDefaultLanguage = sharedGlobals?.defaultLanguage;

    const enhancedSettings = {};
    if (Array.isArray(schema.settings)) {
      schema.settings.forEach((setting) => {
        enhancedSettings[setting.id] = settingDefault(setting, siteStrings, settingLanguage, settingDefaultLanguage);
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
            blockDefaults[setting.id] = settingDefault(setting, siteStrings, settingLanguage, settingDefaultLanguage);
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

    // The project's Clean URLs setting picks the shape of every uuid-resolved
    // internal link this widget emits. Ordinary pages render header/widgets
    // before the layout loads the project row, so the engine stamps the flag
    // itself on first use and caches it on sharedGlobals like pagesByUuid —
    // a caller may pre-set it; a render with no shared globals gets false.
    let cleanUrls = false;
    if (sharedGlobals) {
      if (sharedGlobals.cleanUrls === undefined) {
        const projectData = await getProjectData(deps);
        sharedGlobals.cleanUrls = !!projectData?.cleanUrls;
      }
      cleanUrls = sharedGlobals.cleanUrls === true;
    }
    const { defaultLanguage } = await languageSettings(deps, sharedGlobals);

    // Breadcrumbs reach header/footer through the globals bag, so a theme can
    // draw the trail inside the header widget as well as in the layout. Built
    // AFTER the Clean URLs stamp above: the trail is cached on the first widget
    // that asks for it, and every crumb href is shaped by that flag. Export
    // callers pre-seed it, so getting this order wrong only shows up in preview.
    const breadcrumbs = await ensureBreadcrumbs(deps, sharedGlobals);

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
    // Richtext can also carry a collection-item ref (data-collection-item-uuid), so a
    // richtext-only widget/block must trigger the item-map load too. Checks
    // top-level settings AND block schemas, mirroring the link/menu gate above.
    const hasRichtextSettings =
      schemaHasRichtextSetting(schema) ||
      Object.values(blockSchemas).some((bs) => Array.isArray(bs) && bs.some((s) => s.type === "richtext"));
    let collectionItemsByUuid = (sharedGlobals && sharedGlobals.collectionItemsByUuid) || null;
    if (
      (hasMenuSettings || hasLinkSettings || hasRichtextSettings) &&
      !collectionItemsByUuid &&
      typeof deps.loadCollectionItemsByUuid === "function"
    ) {
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
    const menuDeps = {
      menuMaps,
      pagesByUuid,
      collectionItemsByUuid: collectionItemsByUuid || new Map(),
      outputPathPrefix,
      cleanUrls,
      defaultLanguage,
      // A menu setting holding a bare slug means THIS language's menu.
      language: sharedGlobals?.currentPageData?.language || "",
    };
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
      cleanUrls,
      defaultLanguage,
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

    // Resolve stable internal-link refs embedded in richtext anchors (data-page-uuid /
    // data-collection-item-uuid) to current slugs, depth-aware — the richtext analogue of
    // resolveWidgetPageLinks above. Runs on the sanitized clone; data attrs survived sanitize.
    resolveRichtextLinksInWidgetData(resolvedWidgetData, schema, {
      pagesByUuid,
      collectionItemsByUuid,
      outputPathPrefix,
      cleanUrls,
      defaultLanguage,
    });

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
    const paginationPlan = sharedGlobals?.paginationPlan?.widgetId === widgetId ? sharedGlobals.paginationPlan : null;
    // `page` and `project` match what the layout sees, so a header or footer can
    // read them. The page comes from `sharedGlobals.currentPageData`, set once per
    // render by the caller (a morph without it gets no `page`).
    const currentPageData = sharedGlobals?.currentPageData;
    const renderContext = {
      ...baseContext,
      ...(sharedGlobals ? { project: projectContextFor(getProjectData(deps), sharedGlobals) } : {}),
      ...(currentPageData
        ? {
            page: pageContextFor(
              currentPageData,
              breadcrumbs,
              paginationContextFor(sharedGlobals),
              await ensureTranslations(deps, sharedGlobals, { current: currentPageData }),
            ),
          }
        : {}),
      widget: widgetContext,
      ...(paginationPlan ? { pagination: buildPaginationContext(paginationPlan, { cleanUrls, outputPathPrefix }) } : {}),
    };

    // Get theme snippets directory for this project
    const themeSnippetsDir = path.join(projectDir, "snippets");

    // Get or create cached engine
    const engine = getOrCreateEngine(projectDir, themeSnippetsDir, deps.coreSnippetsDir);

    if (paginationPlan) {
      sharedGlobals.collectionSlice = {
        collectionType: paginationPlan.collectionType,
        offset: (paginationPlan.current - 1) * paginationPlan.perPage,
        limit: paginationPlan.perPage,
      };
    }

    // Render the template
    try {
      return await engine.parseAndRender(templateForRender, renderContext, {
        globals: renderContext.globals,
      });
    } finally {
      if (paginationPlan) delete sharedGlobals.collectionSlice;
    }
  } catch (error) {
    console.error(`Error rendering widget ${widgetId} (Project: ${deps.projectId}):`, error);
    // Return a more informative error message in the HTML
    // Everything interpolated here comes from page JSON (widget id and type are
    // author-controlled keys/values) or from an error message that can quote it.
    // Unescaped, a type carrying a quote would break out of the data-* attribute.
    const safeType = escapeHtml(widgetData?.type) || "unknown";
    return `<div class="widget-error" data-widget-id="${escapeHtml(widgetId)}" data-widget-type="${safeType}">
      <p><strong>Error rendering widget!</strong></p>
      <p>Type: ${safeType}</p>
      <p>ID: ${escapeHtml(widgetId)}</p>
      <pre style="white-space: pre-wrap; word-wrap: break-word; background-color: #fdd; padding: 5px; border: 1px solid red;">${escapeHtml(
        error.message,
      )}\n${escapeHtml(error.stack)}</pre>
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
    // Fixed name, so no traversal here — but a symlinked layout.liquid would
    // still be read and rendered, so it goes through the same guard.
    const layoutPath = await resolveInside(projectDir, "layout.liquid");

    let layoutTemplate;
    try {
      if (!layoutPath) throw new Error("layout.liquid resolves outside the project directory");
      layoutTemplate = await fs.readFile(layoutPath, "utf-8");
    } catch (readErr) {
      console.error(`Layout template not readable under ${projectDir}`);
      return `<html><body><h1>Error: Layout template not found</h1><pre>${escapeHtml(readErr.message)}</pre></body></html>`;
    }

    // 2. Create context for layout render (use shared globals)
    const baseContext = await createBaseRenderContext(deps, rawThemeSettings, renderMode, sharedGlobals);

    // 3. Load project data
    const projectData = await getProjectData(deps);

    // Stamp Clean URLs here too: a layout whose own filters resolve internal
    // links (`| collection`) runs without any widget having stamped the flag.
    // A caller-set value still wins, as it does in renderWidget.
    if (sharedGlobals && sharedGlobals.cleanUrls === undefined) sharedGlobals.cleanUrls = !!projectData?.cleanUrls;

    // 4. Add page-specific context with separated content sections
    const pageSlugClass = pageData?.slug ? `page-${pageData.slug}` : "";
    // A caller may pass `bodyClass` to REPLACE the page-{slug} default (collection
    // item pages do this so a `.page-{slug}` index rule never leaks onto them);
    // `extraBodyClasses` always appends (e.g. the transparent-header channel).
    const baseBodyClass = contentSections.bodyClass !== undefined ? contentSections.bodyClass : pageSlugClass;
    const bodyClasses = [baseBodyClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
    const breadcrumbs = await ensureBreadcrumbs(deps, sharedGlobals);
    const pagination = paginationContextFor(sharedGlobals);

    const renderContext = {
      ...baseContext,
      header: contentSections.headerContent || "",
      main_content: contentSections.mainContent || "",
      footer: contentSections.footerContent || "",
      page: pageContextFor(
        pageData,
        breadcrumbs,
        pagination,
        await ensureTranslations(deps, sharedGlobals, { current: pageData }),
      ),
      project: projectContextFor(projectData, sharedGlobals),
      page_title: buildPageTitle(pageData, projectData, pagination?.current),
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
    return `<html><body><h1>Error rendering page</h1><pre>${escapeHtml(error.message)}</pre></body></html>`;
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
  // Item pages have the project row in hand, so the flag is stamped here rather
  // than lazily as renderWidget does; a caller-set value still wins.
  if (sharedGlobals.cleanUrls === undefined) sharedGlobals.cleanUrls = !!projectData?.cleanUrls;
  const { defaultLanguage: itemDefaultLanguage } = await languageSettings(deps, sharedGlobals);
  const menuDeps =
    sharedGlobals.menuMaps || sharedGlobals.collectionItemsByUuid
      ? {
          menuMaps: sharedGlobals.menuMaps,
          collectionItemsByUuid: sharedGlobals.collectionItemsByUuid,
          cleanUrls: sharedGlobals.cleanUrls === true,
          defaultLanguage: itemDefaultLanguage,
          language: item?.language || "",
        }
      : null;

  // Base context first: its mode-aware media bases (imagePath/filePath) resolve
  // embedded media paths in the item's richtext fields during prep below.
  const baseContext = await createBaseRenderContext(deps, rawThemeSettings, renderMode, sharedGlobals);

  // Resolve item links at the layout's depth + sanitize + resolve richtext media.
  const resolvedItem = prepareItem(item, schema, sharedGlobals.pagesByUuid, sharedGlobals.outputPathPrefix, menuDeps, {
    imagePath: baseContext.imagePath,
    filePath: baseContext.filePath,
  });

  // Seed the trail before the header renders: an item's label comes from the item,
  // which `ensureBreadcrumbs` cannot recover from the path alone.
  if (!sharedGlobals.breadcrumbs) {
    if (!sharedGlobals.pagesByUuid) sharedGlobals.pagesByUuid = await loadPagesByUuid(deps);
    if (!sharedGlobals.listingPages) {
      sharedGlobals.listingPages = await loadListingIndex(deps, sharedGlobals.pagesByUuid);
    }
    const titleField = (schema.settings || []).find((setting) => setting.usedAsTitle);
    const itemLanguage = resolveLanguage(resolvedItem.language, itemDefaultLanguage);
    sharedGlobals.breadcrumbs = buildBreadcrumbs({
      item: {
        slug: resolvedItem.slug,
        name: (titleField && resolvedItem.settings?.[titleField.id]) || resolvedItem.slug,
        slugPrefix: schema.slugPrefix,
        language: itemLanguage,
      },
      collectionType: schema.type,
      pagesByUuid: sharedGlobals.pagesByUuid,
      listingPages: sharedGlobals.listingPages,
      cleanUrls: sharedGlobals.cleanUrls === true,
      outputPathPrefix: sharedGlobals.outputPathPrefix || "",
      language: itemLanguage,
      defaultLanguage: itemDefaultLanguage,
    });
  }

  // Page-shaped object drives the layout title/SEO/body class, and is the `page`
  // the header, footer and item template all see.
  const itemPageData = buildItemPageData(
    schema,
    resolvedItem,
    siteUrl,
    sharedGlobals.cleanUrls === true,
    itemDefaultLanguage,
  );
  // An item page gets the same switcher contract a page does (§9a), keyed by the
  // item's own translation group rather than the page's.
  itemPageData.translations = await ensureTranslations(deps, sharedGlobals, {
    current: item,
    kind: "item",
    slugPrefix: schema.slugPrefix,
  });
  itemPageData.dir = languageDir(itemPageData.language);
  sharedGlobals.currentPageData = itemPageData;

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

  // Render the collection type's template.liquid against the item context.
  const themeSnippetsDir = path.join(deps.projectDir, "snippets");
  const engine = getOrCreateEngine(deps.projectDir, themeSnippetsDir, deps.coreSnippetsDir);
  const itemRenderContext = {
    ...baseContext,
    item: resolvedItem,
    collection: schema,
    page: itemPageData,
    project: projectContextFor(projectData, sharedGlobals),
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
      bodyClass: `collection-${schema.type} item-${resolvedItem.slug}`,
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
  let output = "";

  const resolveUrl = (filepath, opts) =>
    buildAssetUrl(filepath, {
      globals: sharedGlobals,
      source: opts.source,
      widgetType: opts.widgetType,
    });

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

    // Same untrusted `type` as renderWidget — contain it here too, or this
    // read becomes the traversal that one closes.
    const schemaPath = isCoreWidget
      ? await resolveInside(deps.coreWidgetsDir, widgetType, "schema.json")
      : await resolveInside(projectDir, "widgets", widgetType, "schema.json");
    if (!schemaPath) return false;

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
  planPagination,
};
