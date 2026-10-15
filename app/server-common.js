// OSS shell — shared server assembly for both web mode (server.js) and electron
// (electron/server-bootstrap.js).
//
// This file lives OUTSIDE @widgetizer/builder-server precisely so it is allowed
// to import @widgetizer/adapters-local. builder-server must never depend on the
// local adapters — that structural separation protects the OSS/hosted boundary.

import fs from "node:fs";
import {
  createEditorApp,
  getDb,
  DATA_DIR,
  getSettings,
  onSettingsChanged,
  getAllProjects,
  getProjectById,
  getActiveProjectId,
} from "@widgetizer/builder-server";
import {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} from "@widgetizer/adapters-local";
import { setupAssistantServer, BRIDGE_BASE } from "@widgetizer/assistant";
import { createConnectionFile } from "@widgetizer/assistant/local";
import { createRequestGuard } from "./server/requestGuard.js";
import { createAssistantOwnerStore } from "./server/assistantOwner.js";

const LOOPBACK_BIND_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function readAppVersion() {
  try {
    return JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const SHUTDOWN_DEADLINE_MS = 4000;

function envList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function allowedExtraOrigins() {
  const configured = envList("WIDGETIZER_ALLOWED_ORIGINS");
  return process.env.NODE_ENV === "production" ? configured : [...DEV_ORIGINS, ...configured];
}

function createAssistant(scopeResolver, { db, editorProtected }) {
  const access = {
    isEnabled: () => getSettings().assistant?.enabled === true,
    subscribe: (listener) =>
      onSettingsChanged((next, previous) => {
        if (next.assistant?.enabled !== previous.assistant?.enabled) listener();
      }),
  };
  const sites = {
    list: async () => getAllProjects(),
    get: async (_actor, id) => getProjectById(id),
    openSiteId: async () => {
      const id = getActiveProjectId();
      return id && getProjectById(id) ? id : null;
    },
  };
  return setupAssistantServer({
    access,
    sites,
    resolveActor: (req) => scopeResolver.resolveActor(req),
    appInfo: { version: readAppVersion() },
    publisher: createConnectionFile({ dataRoot: DATA_DIR, ownerStore: createAssistantOwnerStore(db) }),
    editorProtected,
  });
}

/**
 * Build the OSS editor Express app wired with the local (filesystem + SQLite)
 * adapters. Returns the app without listening — the caller binds the port.
 *
 * Configuration is env-first. The filesystem root and DB path both derive from
 * DATA_ROOT (Electron's main process sets it; web mode uses the default). A
 * dataRoot/dbPath parameter would only half-apply — it could move the adapters
 * but NOT getDb()/the fs readers, which read the env-derived DATA_DIR — so it is
 * omitted rather than left as a trap. Tests isolate by setting
 * process.env.DATA_ROOT before importing.
 *
 * @param {{ getPort?: () => number|null, bindHost?: string }} [options] - the bound
 *   port (known only after listen) and host, for the request guard.
 * @returns {Promise<{ app: import('express').Express, assistant: ReturnType<typeof setupAssistantServer> }>}
 */
export async function buildOssApp({ getPort = () => null, bindHost = "127.0.0.1" } = {}) {
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

  const editorSecret = process.env.WIDGETIZER_EDITOR_SECRET || null;
  const assistant = createAssistant(adapters.scopeResolver, { db, editorProtected: Boolean(editorSecret) });
  const guard = createRequestGuard({
    getPort,
    loopbackOnly: LOOPBACK_BIND_HOSTS.has(bindHost),
    allowedHosts: envList("WIDGETIZER_ALLOWED_HOSTS"),
    extraOrigins: allowedExtraOrigins(),
    editorSecret,
    controlPaths: ["/api/assistant"],
  });

  const app = await createEditorApp({
    adapters,
    mount: (app) => {
      app.use(guard);
      app.use(BRIDGE_BASE, assistant.bridgeRouter);
      app.use("/api/assistant", assistant.controlRouter);
    },
  });

  return { app, assistant };
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
 * Assistant access is published only once the real address is known, and
 * withdrawn by `shutdown`, which SIGINT/SIGTERM also run.
 *
 * @param {{ defaultPort: number|string, onReady?: (port: number) => void }} options
 * @returns {Promise<{ server: import('http').Server, shutdown: () => Promise<void> }>}
 */
export async function startOssServer({ defaultPort, onReady } = {}) {
  // PORT=0 → OS assigns an ephemeral port at bind time. Otherwise use the
  // requested/default port.
  const requestedPort = parseInt(process.env.PORT || String(defaultPort), 10);

  // Bind host: default to loopback, the safe choice for desktop/Electron and
  // local dev. Set HOST=0.0.0.0 to listen on all interfaces, which is required
  // inside a container so the published port is reachable from the host.
  const requestedHost = process.env.HOST || "127.0.0.1";

  let boundPort = null;
  const { app, assistant } = await buildOssApp({ getPort: () => boundPort, bindHost: requestedHost });

  const server = app.listen(requestedPort, requestedHost);
  await new Promise((resolve) => {
    server.once("listening", resolve);
    server.once("error", (err) => {
      console.error(`Server failed to start on port ${requestedPort}: ${err.message}`);
      process.exit(1);
    });
  });

  const { port, address } = server.address();
  boundPort = port;
  process.env.PORT = String(port);
  if (!process.env.SERVER_URL) {
    process.env.SERVER_URL = `http://127.0.0.1:${port}`;
  }

  const reachableHost = address === "0.0.0.0" || address === "::" ? "127.0.0.1" : address.includes(":") ? `[${address}]` : address;
  await assistant.start(`http://${reachableHost}:${port}`);

  console.log(`Server is running on ${process.env.SERVER_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Stop taking requests and withdraw assistant access first, then let requests
  // already running (a save, an export) finish; only a deadline cuts them off.
  let shuttingDown = null;
  const shutdown = () => {
    shuttingDown ??= (async () => {
      const closed = new Promise((resolve) => server.close(resolve));
      // A keep-alive connection whose request finishes after close() stays open
      // until it is idle-closed, so keep closing idle ones while waiting.
      const reaper = setInterval(() => server.closeIdleConnections(), 50);
      server.closeIdleConnections();
      await assistant.stop().catch((error) => console.error("Assistant shutdown failed:", error));
      let deadline;
      await Promise.race([
        closed,
        new Promise((resolve) => {
          deadline = setTimeout(resolve, SHUTDOWN_DEADLINE_MS);
        }),
      ]);
      clearTimeout(deadline);
      clearInterval(reaper);
      server.closeAllConnections();
    })();
    return shuttingDown;
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      shutdown().finally(() => process.exit(0));
    });
  }

  onReady?.(port);

  return { server, shutdown };
}
