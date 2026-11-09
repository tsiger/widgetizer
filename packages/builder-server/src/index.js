// @widgetizer/builder-server — library entry (barrel).
//
// This package is consumed by the OSS shells (web/electron) and by hosted. It
// exposes the Express app factory, the db layer, and the migration runner.
// Importing it MUST NOT start a server — the listen()/IPC startup lives in each
// shell (e.g. the repo-root server.js for web mode, electron/server-bootstrap.js
// for electron).
export { createEditorApp } from "./createApp.js";
export { setupBuilderServer } from "./setupBuilderServer.js";
export { getDb, initDb, closeDb } from "./db/index.js";
export { runMigrations, DEFAULT_TRACKING_TABLE } from "./db/migrations.js";
export { DATA_DIR } from "./config.js";
// An embedding app mounts the routers it needs (setupBuilderServer returns four;
// one that serves media file URLs itself leaves out mediaFileRouter) into its own
// Express app, and needs the app-level
// error mapper (the routers carry their own JSON parsers + scope middleware, but
// the WidgetizerError -> HTTP mapping is applied app-wide).
export { default as errorHandler } from "./middleware/errorHandler.js";

// Pure render/export helpers consumed by hosted's cloud publish pipeline. Hosted
// builds its own render loop + per-project deps bag (it cannot reuse the OSS
// export orchestration, which resolves every path through the global DATA_DIR);
// these are the shared, side-effect-free pieces it invokes directly.
export { buildFormsManifest } from "./services/formsManifestService.js";
export { generateSite } from "./services/generateSite.js";
export { buildSitemap, buildRobotsTxt } from "./services/seoArtifacts.js";
export { sanitizeWidgetData, sanitizeThemeSettings, stripHtmlToText } from "./services/sanitizationService.js";
// The business details a request sends, read the way the project routes read them.
export { readSiteIdentity } from "./services/siteIdentityInput.js";
// Change-only theme-settings saves: an embedding route that saves theme settings
// reads theme.json, merges with this inside its own write section, and writes.
export { mergeThemeSettingChanges, readThemeSettingChanges } from "./services/themeSettingChanges.js";
// Media-usage tracking for theme settings — hosted's theme-save route calls this
// after writing theme.json so favicon/themed-image assets are recorded as used.
// DB-only via the shared getDb() singleton, no scope/adapter needed.
export { updateThemeSettingsMediaUsage } from "./services/mediaUsageService.js";
// The media paths theme settings and site identity reference, and the site
// identity's usage update: an embedding route that saves either compares the
// paths before and after inside the content-write section, then records usage.
export {
  extractMediaPathsFromThemeSettings,
  extractMediaPathsFromSiteIdentity,
  updateSiteIdentityMediaUsage,
} from "./services/mediaUsageService.js";
// The per-project content-write section. An embedding route that writes project
// content takes it so its writes are ordered with the mounted routes' writes and
// with media deletion: the same section object, so it must come from here, never
// a second serializer. It is innermost (no other per-project lock is taken
// inside it), not reentrant, and in-process only. assertIntroducedMediaExists,
// called inside it, refuses a write that newly references a media file this
// process deleted and that is still missing (a file uploaded again under the same
// name is accepted).
export { withContentWriteLock, assertIntroducedMediaExists } from "./services/contentCoordination.js";
// The site settings each widget reads, embedded in a preview document for the
// editor's live updates.
export { injectThemeReads } from "./utils/themeReads.js";
export { preprocessThemeSettings } from "./utils/themeHelpers.js";
// Per-key async serialization (in-process). The OSS export operations use it to
// serialize per project; embedding hosts can wrap their own long-running
// per-site operations (their export/publish orchestration) with the same primitive.
export { createKeyedSerializer } from "./utils/serializeByKey.js";
export { buildRuntimeSiteIcons, generateExportSiteIcons } from "./utils/siteIconHelpers.js";
export { CORE_WIDGETS_DIR, CORE_SNIPPETS_DIR, getThemesDir } from "./config.js";
// A project's { defaultLanguage, languages } from its record, with the defaults
// OSS applies (languages holds the additional ones, not the default): for an
// embedding app that reads its own project rows.
export { projectLanguages } from "./utils/contentLanguage.js";
// The theme's and core's visitor-facing words for a render, read through the
// reader the caller passes (relative path → contents).
export { loadSiteStrings } from "./services/siteStringsService.js";

// Collection enumeration + item-page render for hosted's cloud render/export
// loop. The render-deps fragment (buildCollectionRenderDeps) and the deps-driven
// item-page render (renderCollectionItemPageWithDeps) are shell-agnostic and
// scope-first, so hosted reuses the SAME tenant-isolated collectionService as the
// OSS path (no parallel fs reader); the readers below back hosted's export
// item-page loop + SEO/itemPages enumeration.
export {
  buildCollectionRenderDeps,
  renderCollectionItemPageWithDeps,
} from "./services/renderingService.js";
// Shared areas, read per language through the storage adapter, for an embedding
// app's own render loop (the engine's renderSharedAreas renders them).
export { listAreas, readArea } from "./services/sharedAreaService.js";
export {
  listCollectionSchemas,
  listCollectionItems,
  getCollectionSchema,
  loadCollectionTemplate,
  loadCollectionItemsByUuid,
  readCollectionItem,
} from "./services/collectionService.js";

// Project-creation building blocks for hosted's "create site with editor" flow.
// scaffoldProjectContent is the dir-explicit core of createProject (theme copy +
// templates → pages + link enrichment) so hosted can scaffold into a per-user
// dir; listThemes/listThemePresets back the theme/preset picker (the actor-scoped
// /themes router is not mounted in hosted).
export { scaffoldProjectContent } from "./utils/projectScaffold.js";
// A preset's starter images, registered in a new project's media library from
// its media manifest once the caller has put the binaries in place.
export { registerPresetMedia } from "./services/presetMedia.js";
// Dir-explicit project-content readers. Pure FS transforms over a
// caller-supplied project working directory — the shared, scope-free counterparts
// of the request-boundary StorageAdapter reads. Hosted's cloud render loop reads
// content through these against its per-tenant working dir, so the OSS and hosted
// render paths read pages/globals/theme the same way (no parallel fs reader).
export { listPagesFromDir, readGlobalWidgetFromDir, readThemeDataFromDir } from "./utils/projectContentFs.js";
// Dir-explicit media-usage rescan: rebuilds media_usage by scanning a caller-supplied
// project working directory. Hosted's create route + the Refresh-Usage handler call
// it with the per-tenant dir; OSS wraps it as refreshAllMediaUsage(projectId).
export { refreshAllMediaUsageFromDir } from "./services/mediaUsageService.js";
// Dir-explicit richtext stable-link seed enrichment: stamps data-*-uuid onto
// preset-seeded richtext item-links, post-seed, against a caller-supplied project
// dir. Hosted's create route calls it with the per-tenant dir; OSS wraps it as
// enrichSeededRichtextLinks(folderName) inside seedPresetCollections.
export { enrichSeededRichtextLinksFromDir } from "./utils/linkEnrichment.js";
export {
  listThemes,
  listThemePresets,
  resolvePresetPaths,
  ensureThemesDirectory,
  buildLatestSnapshot,
  getThemeSourceDir,
} from "./controllers/themeController.js";
// Theme-update pipeline (check/toggle/apply) for hosted's own theme-update UI —
// dir-explicit and scope-free like the readers above, so hosted drives the same
// update logic against its per-tenant working dir instead of forking it.
export {
  checkForUpdates,
  toggleThemeUpdates,
  applyThemeUpdateToDir,
  hasInterruptedThemeUpdate,
} from "./services/themeUpdateService.js";
// Where installed themes are seeded from: every seed theme id across the seed
// roots, and the folder a given theme seeds from, in OSS's precedence order.
export { listSeedThemeIds, resolveSeedThemeDir } from "./utils/themeSeedRoots.js";
// Global app settings (image sizes, dev mode, export limits) — the editor's
// client reads these via GET /api/settings; hosted exposes a read-only route.
export { readAppSettingsFile } from "./controllers/appSettingsController.js";
