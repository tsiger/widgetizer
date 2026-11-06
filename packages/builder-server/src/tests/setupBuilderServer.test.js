/**
 * setupBuilderServer DI-seam test suite.
 *
 * Pins the server assembly behavior:
 *  - the adapter set is validated up front (fail loud, not per-request 500s);
 *  - req.scope is sourced from the INJECTED scopeResolver (F3) — proven with a
 *    sentinel cloud-actor resolver that no OSS code would ever hand-build;
 *  - plugin-contributed project routes get the same pipeline as built-ins
 *    (JSON parser + scope resolution), so a plugin handler sees a parsed
 *    req.body and a resolved req.scope.
 *
 * Run with: node --test packages/builder-server/src/tests/setupBuilderServer.test.js
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";
import express from "express";
import Database from "better-sqlite3";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-setup-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { setupBuilderServer } = await import("../setupBuilderServer.js");
const errorHandler = (await import("../middleware/errorHandler.js")).default;
const { initDb, closeDb, getDb } = await import("../db/index.js");
const { runMigrations } = await import("../db/migrations.js");

const REQUIRED_KEYS = ["scopeResolver", "previewScopeResolver", "storage", "assetStorage", "publish", "limits"];

/** A complete adapter set; the non-resolver adapters are inert stubs here. */
function makeAdapters(scopeResolver) {
  return {
    scopeResolver,
    previewScopeResolver: scopeResolver,
    storage: {},
    assetStorage: {},
    publish: {},
    limits: {},
  };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

after(() => closeDb());

describe("setupBuilderServer — adapter validation", () => {
  it("throws when no adapters object is provided", () => {
    assert.throws(() => setupBuilderServer(), /requires an adapters object/);
    assert.throws(() => setupBuilderServer({}), /requires an adapters object/);
  });

  for (const key of REQUIRED_KEYS) {
    it(`throws when '${key}' is missing`, () => {
      const adapters = makeAdapters({ resolveScope: async () => ({}) });
      delete adapters[key];
      assert.throws(() => setupBuilderServer({ adapters }), new RegExp(key));
    });
  }
});

describe("setupBuilderServer — scope comes from the injected resolver (F3)", () => {
  it("a plugin route sees the resolver's exact scope and a parsed body", async () => {
    // Isolated in-memory DB with one project row matching the sentinel scope so
    // resolveActiveProject can load req.activeProject.
    const db = new Database(":memory:");
    runMigrations(db);
    initDb({ getConnection: () => db });
    db.prepare(
      "INSERT INTO projects (id, folder_name, name, created, updated) VALUES ('sentinel-proj','sentinel-folder','Sentinel','t','t')",
    ).run();

    // A CLOUD actor — nothing in OSS would ever hand-build this. If the request
    // sees it, the scope provably flowed from the injected resolver.
    const sentinelScope = {
      actor: { id: "cloud-user-1", kind: "cloud" },
      projectId: "sentinel-proj",
      folderName: "sentinel-folder",
    };
    const scopeResolver = { resolveScope: async () => sentinelScope };

    const plugin = {
      projectScopedRoutes: [
        {
          method: "POST",
          path: "/echo",
          handler: (req, res) => res.json({ scope: req.scope, body: req.body, activeProjectId: req.activeProject?.id }),
        },
      ],
    };

    const { projectScopedRouter } = setupBuilderServer({ adapters: makeAdapters(scopeResolver), plugins: [plugin] });
    const app = express();
    app.use("/api", projectScopedRouter);
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    try {
      const response = await fetch(`${baseUrl}/api/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
      });
      const json = await response.json();

      assert.equal(response.status, 200);
      // F3: the scope is the resolver's, verbatim — cloud actor and all.
      assert.deepEqual(json.scope, sentinelScope);
      // Plugin pipeline: JSON body was parsed.
      assert.deepEqual(json.body, { hello: "world" });
      // Plugin pipeline: the full project row was loaded for req.activeProject.
      assert.equal(json.activeProjectId, "sentinel-proj");
    } finally {
      await stopServer(server);
    }
  });
});

describe("setupBuilderServer — editor JSON replies are not stored by the browser", () => {
  const plugin = {
    projectScopedRoutes: [
      { method: "GET", path: "/cache-json", handler: (_req, res) => res.json({ ok: true }) },
      {
        method: "GET",
        path: "/cache-own",
        handler: (_req, res) => res.set("Cache-Control", "private, max-age=60").json({ ok: true }),
      },
      { method: "GET", path: "/cache-text", handler: (_req, res) => res.type("text/plain").send("file body") },
    ],
  };

  async function withApp(run) {
    // initDb runs once per process; the scope test above opened the connection.
    getDb()
      .prepare("INSERT OR IGNORE INTO projects (id, folder_name, name, created, updated) VALUES ('p1','f1','P','t','t')")
      .run();
    const scopeResolver = { resolveScope: async () => ({ actor: { id: "a" }, projectId: "p1", folderName: "f1" }) };
    const { actorScopedRouter, projectScopedRouter } = setupBuilderServer({
      adapters: makeAdapters(scopeResolver),
      plugins: [plugin],
    });
    const app = express();
    app.use("/api", actorScopedRouter);
    app.use("/api", projectScopedRouter);
    // The embedding app's own route under the same prefix, reached after the
    // builder's routers find no match.
    app.get("/api/host-json", (_req, res) => res.json({ host: true }));
    app.use(errorHandler);
    const { server, baseUrl } = await startServer(app);
    try {
      await run(baseUrl);
    } finally {
      await stopServer(server);
    }
  }

  it("marks a project-scoped JSON reply no-store", async () => {
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/cache-json`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
    });
  });

  it("marks an actor-scoped JSON reply no-store, error replies included", async () => {
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/themes/${encodeURIComponent("../bad")}`);
      assert.equal(response.status, 400);
      assert.equal(response.headers.get("cache-control"), "no-store");
    });
  });

  it("keeps a handler's own Cache-Control", async () => {
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/cache-own`);
      assert.equal(response.headers.get("cache-control"), "private, max-age=60");
    });
  });

  it("leaves the embedding app's own JSON routes alone", async () => {
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/host-json`);
      assert.deepEqual(await response.json(), { host: true });
      assert.equal(response.headers.get("cache-control"), null);
    });
  });

  it("leaves a non-JSON reply to normal caching", async () => {
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/cache-text`);
      assert.equal(await response.text(), "file body");
      assert.equal(response.headers.get("cache-control"), null);
    });
  });
});
