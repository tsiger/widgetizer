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
 * @param {{ dataRoot?: string }} [options]
 * @returns {Promise<import('express').Express>}
 */
export async function buildOssApp({ dataRoot = DATA_DIR } = {}) {
  // getDb() opens (and migrates) the default on-disk database and returns the
  // singleton the controllers already use. The db-backed adapters share it.
  const db = getDb();

  const adapters = {
    scopeResolver: new LocalScopeResolver(db),
    previewScopeResolver: new LocalPreviewScopeResolver(db),
    storage: new LocalStorageAdapter({ dataRoot }),
    assetStorage: new LocalAssetStorageAdapter({ dataRoot }),
    publish: new LocalPublishAdapter({ dataRoot, db }),
    limits: new LocalLimitsAdapter(db),
  };

  return createEditorApp({ adapters });
}
