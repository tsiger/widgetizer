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

/**
 * Build the OSS app, bind it, publish the bound port to the environment (so
 * self-referencing preview/render URLs use the real port), and announce.
 *
 * Shared by both entry points; they differ only in the default port and what
 * happens on ready: web mode (server.js) uses 3001 and no callback; Electron
 * (electron/server-bootstrap.js) uses 0 (ephemeral, collision-free) and an
 * onReady that posts the port back to the parent process.
 *
 * @param {{ defaultPort: number|string, onReady?: (port: number) => void }} options
 * @returns {Promise<import('http').Server>}
 */
export async function startOssServer({ defaultPort, onReady } = {}) {
  const app = await buildOssApp();

  // PORT=0 → OS assigns an ephemeral port at bind time. Otherwise use the
  // requested/default port.
  const requestedPort = parseInt(process.env.PORT || String(defaultPort), 10);

  // Bind host: default to loopback, the safe choice for desktop/Electron and
  // local dev. Set HOST=0.0.0.0 to listen on all interfaces, which is required
  // inside a container so the published port is reachable from the host.
  const requestedHost = process.env.HOST || "127.0.0.1";

  const server = app.listen(requestedPort, requestedHost, () => {
    const { port } = server.address();

    process.env.PORT = String(port);
    if (!process.env.SERVER_URL) {
      process.env.SERVER_URL = `http://127.0.0.1:${port}`;
    }

    console.log(`Server is running on ${process.env.SERVER_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    onReady?.(port);
  });

  server.on("error", (err) => {
    console.error(`Server failed to start on port ${requestedPort}: ${err.message}`);
    process.exit(1);
  });

  return server;
}
