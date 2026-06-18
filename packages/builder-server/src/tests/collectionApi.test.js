/**
 * collectionController (API) test suite.
 *
 * Drives the collection REST handlers through mock req/res over a REAL
 * LocalStorageAdapter + bootstrapped SQLite project (mirrors pages.test.js), so
 * it verifies the controller→service→media-usage→link-cleanup wiring, the HTTP
 * status mapping (200/201/207/400/404/409/422), and the limits-adapter DoS cap.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionApi.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collection-api-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectPagesDir } = await import("../config.js");
const collectionController = await import("../controllers/collectionController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "collection-api-project-uuid";
const PROJECT_FOLDER = "collection-api-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const projectBase = path.join(TEST_DATA_DIR, "projects", PROJECT_FOLDER);

let activeProject;
// Mutable per-test item cap; default unbounded (OSS behaviour).
let itemLimit = Infinity;
const limits = { getLimit: async () => itemLimit };

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { id: "title", type: "text", usedAsTitle: true, required: true },
    { id: "body", type: "richtext" },
  ],
};

function mockReq({ params = {}, body = {}, query = {} } = {}) {
  return {
    params,
    body,
    query,
    activeProject,
    scope,
    adapters: { storage, limits },
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    headersSent: false,
    set() {
      return res;
    },
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
  };
  return res;
}

async function call(fn, opts) {
  const res = mockRes();
  await fn(mockReq(opts), res);
  return res;
}

before(async () => {
  activeProject = {
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Collection API Project",
    theme: "__test_theme__",
    themeVersion: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  await projectRepo.writeProjectsData({ projects: [activeProject], activeProjectId: activeProject.id });
  // Page dir + global so the fs-based cleanup walkers have a project to scan.
  const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(pagesDir, "global"));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  itemLimit = Infinity;
  await fs.remove(path.join(projectBase, "collections"));
  await fs.remove(path.join(projectBase, "collection-types"));
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
});

async function createNews(body) {
  return call(collectionController.createItem, { params: { collectionType: "news" }, body });
}

describe("schemas", () => {
  it("lists schemas and fetches one", async () => {
    const list = await call(collectionController.getCollectionSchemas);
    assert.equal(list._status, 200);
    assert.deepEqual(list._json.map((s) => s.type), ["news"]);

    const one = await call(collectionController.getCollectionSchema, { params: { collectionType: "news" } });
    assert.equal(one._status, 200);
    assert.equal(one._json.type, "news");
  });

  it("404s an unknown schema", async () => {
    const res = await call(collectionController.getCollectionSchema, { params: { collectionType: "ghost" } });
    assert.equal(res._status, 404);
  });
});

describe("item create/read", () => {
  it("creates an item (201) and reads it back (200)", async () => {
    const created = await createNews({ settings: { title: "Hello" } });
    assert.equal(created._status, 201);
    assert.equal(created._json.slug, "hello");

    const got = await call(collectionController.getItem, { params: { collectionType: "news", itemSlug: "hello" } });
    assert.equal(got._status, 200);
    assert.equal(got._json.title, "Hello");

    const all = await call(collectionController.getAllItems, { params: { collectionType: "news" } });
    assert.equal(all._status, 200);
    assert.equal(all._json.length, 1);
  });

  it("400s a required-field violation", async () => {
    const res = await createNews({ settings: { body: "<p>no title</p>" } });
    assert.equal(res._status, 400);
    assert.ok(res._json.validationErrors.length > 0);
  });

  it("409s a duplicate slug", async () => {
    await createNews({ settings: { title: "Dup" } });
    const res = await createNews({ slug: "dup", settings: { title: "Dup" } });
    assert.equal(res._status, 409);
    assert.equal(res._json.conflictingSlug, "dup");
  });

  it("422s when the limits-adapter item cap is reached", async () => {
    await createNews({ settings: { title: "One" } });
    itemLimit = 1; // hosted-style finite cap
    const res = await createNews({ settings: { title: "Two" } });
    assert.equal(res._status, 422);
  });

  it("404s a missing item", async () => {
    const res = await call(collectionController.getItem, { params: { collectionType: "news", itemSlug: "nope" } });
    assert.equal(res._status, 404);
  });
});

describe("item mutations", () => {
  it("updates an item (200)", async () => {
    await createNews({ settings: { title: "Edit Me" } });
    const res = await call(collectionController.updateItem, {
      params: { collectionType: "news", itemSlug: "edit-me" },
      body: { settings: { title: "Edited" } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.title, "Edited");
  });

  it("404s updating a missing item", async () => {
    const res = await call(collectionController.updateItem, {
      params: { collectionType: "news", itemSlug: "ghost" },
      body: { settings: { title: "x" } },
    });
    assert.equal(res._status, 404);
  });

  it("duplicates (201), reorders, deletes (200), then 404s re-delete", async () => {
    await createNews({ settings: { title: "Src" } });
    const dup = await call(collectionController.duplicateItem, {
      params: { collectionType: "news", itemSlug: "src" },
    });
    assert.equal(dup._status, 201);
    assert.equal(dup._json.slug, "src-copy");

    const reorder = await call(collectionController.reorderItems, {
      params: { collectionType: "news" },
      body: { order: ["src-copy", "src"] },
    });
    assert.equal(reorder._status, 200);

    const del = await call(collectionController.deleteItem, {
      params: { collectionType: "news", itemSlug: "src" },
    });
    assert.equal(del._status, 200);

    const reDel = await call(collectionController.deleteItem, {
      params: { collectionType: "news", itemSlug: "src" },
    });
    assert.equal(reDel._status, 404);
  });

  it("bulk-deletes with 207 partial (deleted + notFound)", async () => {
    await createNews({ settings: { title: "A" } });
    const res = await call(collectionController.bulkDeleteItems, {
      params: { collectionType: "news" },
      body: { itemSlugs: ["a", "missing"] },
    });
    assert.equal(res._status, 207);
    assert.deepEqual(res._json.deleted, ["a"]);
    assert.deepEqual(res._json.notFound, ["missing"]);
  });
});
