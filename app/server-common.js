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
  saveSettings,
  onSettingsChanged,
  setSettingsUpdatePolicy,
  setChangeObserver,
  setWriteGate,
  runAsWriter,
  withContentWriteLock,
  getProjectById,
  setActiveProjectId,
  editSiteDocument,
  setRequestWriterResolver,
} from "@widgetizer/builder-server";
import { AuthorizationError, SiteLockedError } from "@widgetizer/core/errors";
import {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} from "@widgetizer/adapters-local";
import { setupAssistantServer, BRIDGE_BASE, EDITOR_CREDENTIAL_HEADER } from "@widgetizer/assistant";
import { createConnectionFile } from "@widgetizer/assistant/local";
import { createRequestGuard } from "./server/requestGuard.js";
import { createAssistantOwnerStore } from "./server/assistantOwner.js";
import { createAssistantSite } from "./server/assistantSite.js";
import { migrateAssistantTables } from "./server/assistantDb.js";
import { createSiteGenerations, holdAssetWrites } from "./server/siteGenerations.js";
import { acquireOwnerFence } from "./server/ownerFence.js";
import { createJobStore } from "./server/jobStore.js";
import { createOssSnapshots, createOssAssetLedger, rebuildUsageWithoutWrites } from "./server/snapshots.js";
import { normalizeLegacyIds } from "./server/normalizeLegacy.js";
import { canonicalJson } from "@widgetizer/assistant/snapshots";

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

const assistantEnabled = (settings) => settings.assistant?.enabled === true;

const withoutAccess = (settings) => canonicalJson({ ...settings, assistant: { ...settings.assistant, enabled: null } });

/**
 * Code in a page (a preview, an embed) can reach the editor's routes, so on the desktop only the
 * app's own prompt may turn access on. While a job runs, turning access off is the only change.
 */
function setAssistantSettingsPolicy({ editorProtected, isBusy }) {
  setSettingsUpdatePolicy((previous, next) => {
    if (editorProtected && !assistantEnabled(previous) && assistantEnabled(next)) {
      throw new AuthorizationError("Turn on assistant access from Widgetizer's own prompt.", { code: "DECISION_REQUIRED" });
    }
    if (!isBusy() || canonicalJson(previous) === canonicalJson(next)) return;
    if (assistantEnabled(previous) && !assistantEnabled(next) && withoutAccess(previous) === withoutAccess(next)) return;
    throw new SiteLockedError("Settings can't change while the assistant is working. You can turn assistant access off.");
  });
}

function enableAssistantAccess() {
  const current = getSettings();
  if (!assistantEnabled(current)) saveSettings({ ...current, assistant: { ...current.assistant, enabled: true } });
}

function createJobDeps(adapters, { db, generations, ledger, editorSecret }) {
  const siteScope = (projectId) => {
    const project = getProjectById(projectId);
    return project ? { actor: null, projectId: project.id, folderName: project.folderName } : null;
  };
  const rebuildUsage = rebuildUsageWithoutWrites(adapters.storage);
  return {
    store: createJobStore(db),
    snapshots: createOssSnapshots({ adapters, db, generations, ledger }),
    sections: { run: (projectId, writer, fn) => runAsWriter(writer, () => withContentWriteLock(projectId, fn)) },
    siteScope,
    siteExists: (projectId) => Boolean(getProjectById(projectId)),
    normalize: (scope) => normalizeLegacyIds({ storage: adapters.storage, scope, rebuildUsage }),
    internalHeaders: () => (editorSecret ? { [EDITOR_CREDENTIAL_HEADER]: editorSecret } : {}),
    saves: {
      editDocument: (writer, args) =>
        runAsWriter(writer, () =>
          editSiteDocument({ storage: adapters.storage, assetStorage: adapters.assetStorage, limits: adapters.limits, ...args }),
        ),
    },
    async switchSite(projectId) {
      if (!getProjectById(projectId)) throw new Error(`No site ${projectId}.`);
      setActiveProjectId(projectId);
      global.iconsCache?.delete(projectId);
    },
  };
}

function createAssistant(adapters, { db, generations, ledger, editorSecret }) {
  const editorProtected = Boolean(editorSecret);
  const access = {
    isEnabled: () => assistantEnabled(getSettings()),
    subscribe: (listener) =>
      onSettingsChanged((next, previous) => {
        if (next.assistant?.enabled !== previous.assistant?.enabled) listener();
      }),
  };
  return setupAssistantServer({
    access,
    site: createAssistantSite({ adapters }),
    resolveActor: (req) => adapters.scopeResolver.resolveActor(req),
    appInfo: { version: readAppVersion() },
    publisher: createConnectionFile({ dataRoot: DATA_DIR, ownerStore: createAssistantOwnerStore(db) }),
    editorProtected,
    jobs: createJobDeps(adapters, { db, generations, ledger, editorSecret }),
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
 * @returns {Promise<{ app: import('express').Express, assistant: ReturnType<typeof setupAssistantServer>, adapters: object,
 *   db: import('better-sqlite3').Database, generations: ReturnType<typeof createSiteGenerations> }>}
 */
export async function buildOssApp({ getPort = () => null, bindHost = "127.0.0.1" } = {}) {
  // getDb() opens (and migrates) the default on-disk database and returns the
  // singleton the controllers already use. The db-backed adapters share it.
  const db = getDb();
  migrateAssistantTables(db);
  const generations = createSiteGenerations(db);
  setChangeObserver((projectId, kind) => generations.bump(projectId, kind));

  const rawAssets = new LocalAssetStorageAdapter({ dataRoot: DATA_DIR });
  const ledger = createOssAssetLedger({ assetStorage: rawAssets });

  const adapters = {
    scopeResolver: new LocalScopeResolver(db),
    previewScopeResolver: new LocalPreviewScopeResolver(db),
    storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
    assetStorage: holdAssetWrites(rawAssets, ledger),
    publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
    limits: new LocalLimitsAdapter(db),
  };

  const editorSecret = process.env.WIDGETIZER_EDITOR_SECRET || null;
  const assistant = createAssistant(adapters, { db, generations, ledger, editorSecret });
  setRequestWriterResolver((req) => assistant.jobs.writerForRequest(req));
  setAssistantSettingsPolicy({ editorProtected: Boolean(editorSecret), isBusy: () => assistant.jobs.isBusy() });
  setWriteGate(assistant.writeGate);
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
      app.use(assistant.admission);
    },
  });

  return { app, assistant, adapters, db, generations };
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
 * `assistantAccess` and `enableAssistant` are for the desktop app's main process
 * only, over its private channel, never for routes.
 *
 * @returns {Promise<{
 *   server: import('http').Server,
 *   shutdown: () => Promise<void>,
 *   assistantAccess: () => { enabled: boolean },
 *   enableAssistant: () => Promise<{ enabled: boolean }>,
 *   releaseDataFolder: () => void,
 *   assistant: ReturnType<typeof setupAssistantServer>,
 * }>} `releaseDataFolder` is for tests that start a server in-process; it gives up
 * the data folder after `shutdown`, which otherwise holds it until the process exits.
 */
export async function startOssServer({ defaultPort, onReady } = {}) {
  // PORT=0 → OS assigns an ephemeral port at bind time. Otherwise use the
  // requested/default port.
  const requestedPort = parseInt(process.env.PORT || String(defaultPort), 10);

  // Bind host: default to loopback, the safe choice for desktop/Electron and
  // local dev. Set HOST=0.0.0.0 to listen on all interfaces, which is required
  // inside a container so the published port is reachable from the host.
  const requestedHost = process.env.HOST || "127.0.0.1";

  // Held until the process exits: a handler can outlive shutdown and its connection.
  const fence = await acquireOwnerFence(DATA_DIR);

  let boundPort = null;
  const { app, assistant } = await buildOssApp({ getPort: () => boundPort, bindHost: requestedHost });
  // Before any request: an interrupted job is restored or left closed for the user to decide.
  await assistant.recover().catch((error) => console.error("Recovering the assistant's last job failed:", error));

  const server = app.listen(requestedPort, requestedHost);
  await new Promise((resolve) => {
    server.once("listening", resolve);
    server.once("error", (err) => {
      console.error(`Server failed to start on port ${requestedPort}: ${err.message}`);
      fence.release();
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

  const assistantAccess = () => ({ enabled: assistantEnabled(getSettings()) });
  const enableAssistant = async () => {
    enableAssistantAccess();
    await assistant.settled();
    return assistantAccess();
  };

  return { server, shutdown, assistantAccess, enableAssistant, assistant, releaseDataFolder: () => fence.release() };
}
