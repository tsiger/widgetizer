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
export { sanitizeWidgetData } from "./services/sanitizationService.js";
export { preprocessThemeSettings } from "./utils/themeHelpers.js";
export { buildRuntimeSiteIcons } from "./utils/siteIconHelpers.js";
export { CORE_WIDGETS_DIR, CORE_SNIPPETS_DIR } from "./config.js";
