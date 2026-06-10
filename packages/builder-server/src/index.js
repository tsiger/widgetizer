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
