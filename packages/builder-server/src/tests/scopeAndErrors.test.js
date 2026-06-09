/**
 * Scope + error-mapping test suite.
 *
 * Covers errorHandler mapping WidgetizerError -> HTTP status/code, and
 * resolveActiveProject exposing req.scope alongside req.activeProject.
 *
 * Run with: node --test packages/builder-server/src/tests/scopeAndErrors.test.js
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ConflictError } from "@widgetizer/core/errors";
import errorHandler from "../middleware/errorHandler.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { initDb, closeDb } from "../db/index.js";
import { runMigrations } from "../db/migrations.js";
import * as projectRepo from "../db/repositories/projectRepository.js";

function fakeRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    body: undefined,
    json(payload) {
      this.body = payload;
    },
  };
}

describe("errorHandler maps WidgetizerError", () => {
  it("uses the error's statusCode and code", () => {
    const res = fakeRes();
    errorHandler(new ConflictError("nope", { code: "PROJECT_MISMATCH" }), {}, res, () => {});
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "PROJECT_MISMATCH");
    assert.equal(res.body.message, "nope");
  });

  it("falls back to 500 for a plain error with no statusCode", () => {
    const res = fakeRes();
    errorHandler(new Error("boom"), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, undefined);
  });
});

describe("resolveActiveProject attaches req.scope", () => {
  afterEach(() => closeDb());

  it("sets actor/projectId/folderName from the active project", async () => {
    const db = new Database(":memory:");
    runMigrations(db);
    initDb({ getConnection: () => db });
    db.prepare(
      "INSERT INTO projects (id, folder_name, name, created, updated) VALUES ('p1','my-folder','P1','t','t')",
    ).run();
    projectRepo.setActiveProjectId("p1");

    const req = { method: "GET", headers: {}, params: {} };
    let nexted = false;
    await resolveActiveProject(req, fakeRes(), () => {
      nexted = true;
    });

    assert.equal(nexted, true);
    assert.deepEqual(req.scope, {
      actor: { id: "default", kind: "local" },
      projectId: "p1",
      folderName: "my-folder",
    });
  });
});
