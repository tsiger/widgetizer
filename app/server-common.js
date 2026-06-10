// OSS shell — shared server assembly for both web mode (server.js) and electron
// (electron/server-bootstrap.js).
//
// This file lives OUTSIDE @widgetizer/builder-server precisely so it is allowed
// to import @widgetizer/adapters-local. builder-server must never depend on the
// local adapters — that structural separation protects the OSS/hosted boundary.

import { createEditorApp, getDb, DATA_DIR } from "@widgetizer/builder-server";
import {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} from "@widgetizer/adapters-local";

/**
 * Build the OSS editor Express app wired with the local (filesystem + SQLite)
 * adapters. Returns the app without listening — the caller binds the port.
 *
 * Configuration is env-first and takes no parameters by design. The filesystem
 * root and DB path both derive from DATA_ROOT (Electron's main process sets it;
 * web mode uses the default). A dataRoot/dbPath parameter would only half-apply
 * — it could move the adapters but NOT getDb()/the fs readers, which read the
 * env-derived DATA_DIR — so it is omitted rather than left as a trap. Tests
 * isolate by setting process.env.DATA_ROOT before importing.
 *
 * @returns {Promise<import('express').Express>}
 */
export async function buildOssApp() {
  // getDb() opens (and migrates) the default on-disk database and returns the
  // singleton the controllers already use. The db-backed adapters share it.
  const db = getDb();

  const adapters = {
    scopeResolver: new LocalScopeResolver(db),
    previewScopeResolver: new LocalPreviewScopeResolver(db),
    storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
    assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
    publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
    limits: new LocalLimitsAdapter(db),
  };

  return createEditorApp({ adapters });
}
