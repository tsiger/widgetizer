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
// Hosted mounts the three routers into its own Express app and needs the app-level
// error mapper (the routers carry their own JSON parsers + scope middleware, but
// the WidgetizerError -> HTTP mapping is applied app-wide).
export { default as errorHandler } from "./middleware/errorHandler.js";

// Pure render/export helpers consumed by hosted's cloud publish pipeline. Hosted
// builds its own render loop + per-project deps bag (it cannot reuse the OSS
// export orchestration, which resolves every path through the global DATA_DIR);
// these are the shared, side-effect-free pieces it invokes directly. See the
// stage-2 plan §7.
export { buildFormsManifest } from "./services/formsManifestService.js";
export { buildSitemap, buildRobotsTxt } from "./services/seoArtifacts.js";
export { sanitizeWidgetData, sanitizeThemeSettings } from "./services/sanitizationService.js";
// Media-usage tracking for theme settings — hosted's theme-save route calls this
// after writing theme.json so favicon/themed-image assets are recorded as used.
// DB-only via the shared getDb() singleton, no scope/adapter needed.
export { updateThemeSettingsMediaUsage } from "./services/mediaUsageService.js";
export { preprocessThemeSettings } from "./utils/themeHelpers.js";
export { buildRuntimeSiteIcons } from "./utils/siteIconHelpers.js";
export { CORE_WIDGETS_DIR, CORE_SNIPPETS_DIR, getThemesDir } from "./config.js";

// Collection enumeration + item-page render for hosted's cloud render/export
// loop. The render-deps fragment (buildCollectionRenderDeps) and the deps-driven
// item-page render (renderCollectionItemPageWithDeps) are shell-agnostic and
// scope-first, so hosted reuses the SAME tenant-isolated collectionService as the
// OSS path (no parallel fs reader); the readers below back hosted's export
// item-page loop + SEO/itemPages enumeration. See the stage-2 plan §7 + Phase 7.
export {
  buildCollectionRenderDeps,
  renderCollectionItemPageWithDeps,
} from "./services/renderingService.js";
export {
  listCollectionSchemas,
  listCollectionItems,
  getCollectionSchema,
  loadCollectionTemplate,
  loadCollectionItemsByUuid,
} from "./services/collectionService.js";

// Project-creation building blocks for hosted's "create site with editor" flow.
// scaffoldProjectContent is the dir-explicit core of createProject (theme copy +
// templates → pages + link enrichment) so hosted can scaffold into a per-user
// dir; listThemes/listThemePresets back the theme/preset picker (the actor-scoped
// /themes router is not mounted in hosted). See the stage-2 plan §"create flow".
export { scaffoldProjectContent } from "./utils/projectScaffold.js";
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
export { listThemes, listThemePresets, resolvePresetPaths } from "./controllers/themeController.js";
// Global app settings (image sizes, dev mode, export limits) — the editor's
// client reads these via GET /api/settings; hosted exposes a read-only route.
export { readAppSettingsFile } from "./controllers/appSettingsController.js";
