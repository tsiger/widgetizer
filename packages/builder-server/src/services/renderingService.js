// Thin OSS-shell adapter over the pure @widgetizer/render-engine.
//
// The engine takes a resolved per-project `deps` bag and never resolves
// projects, touches SQLite, or constructs absolute data paths itself. This
// wrapper preserves the historical `(projectId, ...)` call signatures used
// throughout the OSS controllers and tests: it resolves the project's folder
// (the project-resolution error boundary lives here, matching pre-carve-out
// behavior), builds the deps bag from config + repos + services, and delegates.
//
// Collections: the engine exposes the `| collection` filter but cannot read
// items itself (it imports no backend code and touches no storage). When the
// caller passes `collectionDeps` ({ storage, scope }) — the preview/export route
// handlers already have both — this wrapper adds a scope-aware
// `buildCollectionItemsLoader` factory + `getCollectionSchemas` to the deps bag.
// The factory closes over the storage adapter + scope, so collection reads go
// through the SAME adapter the API path uses (tenant-isolated), and hosted gets
// the symmetric wiring in `buildCloudRenderDeps`. Omitting `collectionDeps`
// leaves the filter returning [] — unchanged behaviour for callers that never
// deal with collections.
import {
  renderWidget as engineRenderWidget,
  renderPageLayout as engineRenderPageLayout,
  renderCollectionItemPage as engineRenderCollectionItemPage,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader as engineWidgetSupportsTransparentHeader,
  schemaHasMenuSetting,
} from "@widgetizer/render-engine";

import { getProjectDir, CORE_WIDGETS_DIR, CORE_SNIPPETS_DIR } from "../config.js";
import { readMediaFile } from "./mediaService.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { listProjectPagesData } from "../controllers/pageController.js";
import { preprocessThemeSettings } from "../utils/themeHelpers.js";
import { buildRuntimeSiteIcons } from "../utils/siteIconHelpers.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { sanitizeWidgetData } from "./sanitizationService.js";
import {
  listCollectionSchemas,
  listCollectionItems,
  getCollectionSchema,
  loadCollectionItemsByUuid,
  prepareCollectionItemForRender,
  buildCollectionItemPageData,
} from "./collectionService.js";

/** True when a schema declares at least one `link`-type setting. */
function schemaHasLinkSetting(schema) {
  return Array.isArray(schema?.settings) && schema.settings.some((s) => s.type === "link");
}

/**
 * Build the per-render `getCollectionItems` loader for the `| collection` filter.
 * Closes over the storage adapter + scope (so reads are tenant-isolated through
 * the same adapter as the API path) and over the live render `globals` +
 * mode-aware media base paths (passed in by the engine when it builds the render
 * context). Results are cached per (type, options) on `globals.collectionCache`.
 * @param {object} collectionDeps - { storage, scope }
 */
function makeCollectionItemsLoaderFactory({ storage, scope }) {
  return ({ globals, imageBasePath, fileBasePath }) =>
    async (collectionType, options = {}) => {
      const cacheKey = `${collectionType}:${JSON.stringify(options ?? {})}`;
      if (globals.collectionCache && globals.collectionCache.has(cacheKey)) {
        return globals.collectionCache.get(cacheKey);
      }

      // Sort in the service, but apply limit/offset HERE — after excluding
      // invalid items — so `limit` counts valid items (an invalid item must not
      // consume a slot in the returned window).
      const { limit, offset, ...sortOptions } = options ?? {};
      const [items, schema] = await Promise.all([
        listCollectionItems(storage, scope, collectionType, sortOptions),
        getCollectionSchema(storage, scope, collectionType),
      ]);

      const outputPathPrefix = globals.outputPathPrefix || "";
      const pagesByUuid = globals.pagesByUuid || new Map();

      // Resolve `menu`- and `link`-type settings on items the same way widgets do.
      // Load lazily (cached on globals): the collection-item map whenever the
      // schema uses a `menu` OR `link` setting (both can target items), and reuse
      // the menu maps the engine already populated on `globals` — so plain
      // collections pay no extra I/O.
      let menuDeps = null;
      if (schemaHasMenuSetting(schema) || schemaHasLinkSetting(schema)) {
        if (!globals.collectionItemsByUuid) {
          globals.collectionItemsByUuid = await loadCollectionItemsByUuid(storage, scope);
        }
        menuDeps = {
          menuMaps: globals.menuMaps || { byUuid: new Map(), bySlug: new Map() },
          collectionItemsByUuid: globals.collectionItemsByUuid,
        };
      }

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
        const resolved = prepareCollectionItemForRender(item, schema, pagesByUuid, outputPathPrefix, menuDeps, {
          imagePath: imageBasePath,
          filePath: fileBasePath,
        });
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

      if (globals.collectionCache) globals.collectionCache.set(cacheKey, result);
      return result;
    };
}

/**
 * The scope-aware collection capability fragment of the render deps bag: the
 * `| collection` filter's loader factory, schema enumeration, and the
 * item-uuid→url map. Shared by the OSS `buildRenderDeps` below AND hosted's
 * `buildCloudRenderDeps` (which builds its own per-tenant deps bag and cannot use
 * the projectId-based wrapper), so the wiring can't drift between the two render
 * loops. Pure scope-first — no DATA_DIR, no shell assumptions; reads go through
 * the supplied storage adapter + scope, exactly as the collection API path does.
 * @param {{ storage: object, scope: object }} collectionDeps
 * @returns {{ buildCollectionItemsLoader: Function, getCollectionSchemas: Function, loadCollectionItemsByUuid: Function }}
 */
function buildCollectionRenderDeps({ storage, scope }) {
  return {
    buildCollectionItemsLoader: makeCollectionItemsLoaderFactory({ storage, scope }),
    // Schema enumeration for the export item-page pass (and any caller that needs
    // to know which collections declare item pages). Scope-aware, adapter-backed.
    getCollectionSchemas: () => listCollectionSchemas(storage, scope),
    // The item uuid -> { slugPrefix, slug } map, so widget `link` settings that
    // target a collection item (collectionItemUuid) resolve to its current page
    // URL at render time (#11 parity with pageUuid). The engine calls this lazily
    // and caches the result per render; non-collection callers leave it unset.
    loadCollectionItemsByUuid: () => loadCollectionItemsByUuid(storage, scope),
  };
}

/**
 * Resolve a projectId into the engine's per-project deps bag.
 * Throws project-resolution errors (via getProjectFolderName) before the engine
 * runs — preserving the boundary callers rely on to map to 404s.
 * @param {string} projectId
 * @param {{ storage: object, scope: object }|null} collectionDeps - When present,
 *   adds the scope-aware collection capability to the deps bag.
 * @returns {Promise<import("@widgetizer/render-engine").RenderDeps>}
 */
async function buildRenderDeps(projectId, collectionDeps = null) {
  const folderName = await getProjectFolderName(projectId);
  const deps = {
    projectId,
    projectDir: getProjectDir(folderName),
    coreWidgetsDir: CORE_WIDGETS_DIR,
    coreSnippetsDir: CORE_SNIPPETS_DIR,
    getProjectData: () => projectRepo.getProjectById(projectId) || null,
    getMediaFiles: () => readMediaFile(projectId),
    listPages: () => listProjectPagesData(folderName),
    sanitizeWidgetData,
    preprocessThemeSettings,
    buildRuntimeSiteIcons,
  };

  if (collectionDeps && collectionDeps.storage && collectionDeps.scope) {
    Object.assign(deps, buildCollectionRenderDeps(collectionDeps));
  }

  return deps;
}

async function renderWidget(
  projectId,
  widgetId,
  widgetData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
  index = null,
  collectionDeps = null,
) {
  const deps = await buildRenderDeps(projectId, collectionDeps);
  return engineRenderWidget(deps, widgetId, widgetData, rawThemeSettings, renderMode, sharedGlobals, index);
}

async function renderPageLayout(
  projectId,
  contentSections,
  pageData,
  rawThemeSettings,
  renderMode = "preview",
  sharedGlobals = null,
  collectionDeps = null,
) {
  const deps = await buildRenderDeps(projectId, collectionDeps);
  return engineRenderPageLayout(deps, contentSections, pageData, rawThemeSettings, renderMode, sharedGlobals);
}

async function widgetSupportsTransparentHeader(projectId, widgetType) {
  try {
    const deps = await buildRenderDeps(projectId);
    return engineWidgetSupportsTransparentHeader(deps, widgetType);
  } catch {
    // Unknown/unresolvable project — preserve the original swallow-and-false.
    return false;
  }
}

/**
 * Render one collection item's full page (used by export + item preview). Builds
 * the deps bag (with the scope-aware collection capability when `collectionDeps`
 * is supplied) and delegates to the engine, injecting the collection-service
 * resolution/page-shaping helpers so the engine stays free of backend imports.
 * @param {string} projectId
 * @param {object} args - schema/item/template/rawThemeSettings/renderMode/
 *   sharedGlobals/headerData/footerData/projectData/siteUrl
 * @param {{ storage: object, scope: object }|null} collectionDeps
 */
async function renderCollectionItemPage(projectId, args, collectionDeps = null) {
  const deps = await buildRenderDeps(projectId, collectionDeps);
  return renderCollectionItemPageWithDeps(deps, args);
}

/**
 * Deps-driven collection item-page render: delegates to the engine with the
 * collection-service resolution/page-shaping helpers injected (so the engine
 * stays free of backend imports). Shared by the OSS wrapper above and hosted's
 * cloud render loop, which builds its own deps bag (via buildCloudRenderDeps) and
 * so cannot use the projectId-based wrapper.
 * @param {import("@widgetizer/render-engine").RenderDeps} deps
 * @param {object} args - schema/item/template/rawThemeSettings/renderMode/
 *   sharedGlobals/headerData/footerData/projectData/siteUrl
 */
function renderCollectionItemPageWithDeps(deps, args) {
  return engineRenderCollectionItemPage(deps, {
    ...args,
    prepareItem: prepareCollectionItemForRender,
    buildItemPageData: buildCollectionItemPageData,
  });
}

export {
  renderWidget,
  renderPageLayout,
  renderCollectionItemPage,
  renderCollectionItemPageWithDeps,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader,
  buildRenderDeps,
  buildCollectionRenderDeps,
};
