/**
 * Collections HTTP API test suite (Phase 5).
 *
 * Exercises collectionController handlers directly with mock req/res (matching
 * the repo convention in menus.test.js), against an isolated DATA_DIR and a
 * bootstrapped active project with a collection schema on disk.
 *
 * Run with: node --test server/tests/collectionApi.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collapi-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const collectionController = await import("../controllers/collectionController.js");
const { getProjectCollectionSchemaPath, getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { readMediaFile } = await import("../services/mediaService.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "collapi-project-uuid";
const PROJECT_FOLDER = "collapi-project";

let activeProject;

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
    headersSent: false,
    status(code) {
      res._status = code;
      return res;
    },
    set(key, value) {
      res._headers[key] = value;
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

async function call(handler, { params = {}, body = {}, query = {} } = {}) {
  const req = { params, body, query, activeProject, headers: { "x-project-id": PROJECT_ID } };
  const res = mockRes();
  await handler(req, res);
  return res;
}

function schema() {
  return {
    type: "portfolio",
    schemaVersion: 1,
    displayName: "Portfolio",
    displayNamePlural: "Portfolio",
    icon: "Briefcase",
    hasItemPages: true,
    slugPrefix: "portfolio",
    defaultSort: "manual",
    settings: [
      { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
      { type: "textarea", id: "description", label: "Description" },
      { type: "image", id: "featured_image", label: "Image" },
    ],
  };
}

before(async () => {
  activeProject = {
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Collection API Test",
    theme: "__collapi_theme__",
    created: new Date().toISOString(),
  };
  await projectRepo.writeProjectsData({ projects: [activeProject], activeProjectId: PROJECT_ID });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
  console.error = _origError;
});

beforeEach(async () => {
  // Reset collections + collection-types between tests, reinstall the schema.
  await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
  await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  await fs.outputJSON(getProjectCollectionSchemaPath(PROJECT_FOLDER, "portfolio"), schema());
});

// ============================================================================
// Schemas
// ============================================================================

describe("GET /schemas + /schema/:type", () => {
  it("lists schemas with itemCount and invalidCount", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { settings: { title: "Alpha" } },
    });
    const res = await call(collectionController.getCollectionSchemas);
    assert.equal(res._status, 200);
    const portfolio = res._json.find((s) => s.type === "portfolio");
    assert.equal(portfolio.itemCount, 1);
    assert.equal(portfolio.invalidCount, 0);
  });

  it("returns a single schema, 404 for unknown", async () => {
    const ok = await call(collectionController.getCollectionSchema, {
      params: { collectionType: "portfolio" },
    });
    assert.equal(ok._status, 200);
    assert.equal(ok._json.type, "portfolio");

    const missing = await call(collectionController.getCollectionSchema, {
      params: { collectionType: "ghost" },
    });
    assert.equal(missing._status, 404);
  });
});

// ============================================================================
// Item CRUD
// ============================================================================

describe("item create / read", () => {
  it("creates an item (201, no-store) and reads it back", async () => {
    const created = await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { settings: { title: "Hello World" } },
    });
    assert.equal(created._status, 201);
    assert.equal(created._headers["Cache-Control"], "no-store");
    assert.equal(created._json.slug, "hello-world");

    const got = await call(collectionController.getItem, {
      params: { collectionType: "portfolio", itemSlug: "hello-world" },
    });
    assert.equal(got._status, 200);
    assert.equal(got._json.title, "Hello World");
  });

  it("returns 400 when a required field is missing", async () => {
    const res = await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { settings: { title: "" } },
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.validationErrors.some((e) => e.fieldId === "title"));
  });

  it("returns 409 when the slug already exists", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "alpha", settings: { title: "Alpha" } },
    });
    const dup = await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "alpha", settings: { title: "Another" } },
    });
    assert.equal(dup._status, 409);
    assert.equal(dup._json.conflictingSlug, "alpha");
  });

  it("returns 404 reading a missing item", async () => {
    const res = await call(collectionController.getItem, {
      params: { collectionType: "portfolio", itemSlug: "nope" },
    });
    assert.equal(res._status, 404);
  });
});

describe("getAllItems", () => {
  it("returns items and supports the invalid filter", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "good", settings: { title: "Good" } },
    });
    const all = await call(collectionController.getAllItems, {
      params: { collectionType: "portfolio" },
    });
    assert.equal(all._status, 200);
    assert.equal(all._json.length, 1);

    const invalidOnly = await call(collectionController.getAllItems, {
      params: { collectionType: "portfolio" },
      query: { invalid: "true" },
    });
    assert.equal(invalidOnly._json.length, 0);
  });

  it("returns 404 for an unknown collection type", async () => {
    const res = await call(collectionController.getAllItems, {
      params: { collectionType: "ghost" },
    });
    assert.equal(res._status, 404);
  });
});

describe("update / delete / duplicate / reorder", () => {
  beforeEach(async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "alpha", settings: { title: "Alpha", description: "d" } },
    });
  });

  it("updates an item (200)", async () => {
    const res = await call(collectionController.updateItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
      body: { slug: "alpha", settings: { title: "Alpha Edited" } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.title, "Alpha Edited");
  });

  it("preserves orphaned data through an API update (BLOCKER-2)", async () => {
    // inject an out-of-schema field directly on disk
    const itemPath = path.join(
      getProjectDir(PROJECT_FOLDER),
      "collections",
      "portfolio",
      "alpha.json",
    );
    const raw = await fs.readJSON(itemPath);
    raw.settings.legacy_field = "keep-me";
    await fs.writeJSON(itemPath, raw);

    await call(collectionController.updateItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
      body: { slug: "alpha", settings: { title: "Alpha" } },
    });
    const after = await fs.readJSON(itemPath);
    assert.equal(after.settings.legacy_field, "keep-me");
  });

  it("discards archived data (200): strips orphaned keys, _archived empty", async () => {
    const itemPath = path.join(getProjectDir(PROJECT_FOLDER), "collections", "portfolio", "alpha.json");
    const raw = await fs.readJSON(itemPath);
    raw.settings.legacy_field = "drop-me";
    await fs.writeJSON(itemPath, raw);

    const res = await call(collectionController.discardArchivedItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
    });
    assert.equal(res._status, 200);
    assert.deepEqual(res._json._archived, {});

    const after = await fs.readJSON(itemPath);
    assert.equal(after.settings.legacy_field, undefined);
    assert.equal(after.settings.title, "Alpha");
  });

  it("returns 404 discarding archived on a missing item", async () => {
    const res = await call(collectionController.discardArchivedItem, {
      params: { collectionType: "portfolio", itemSlug: "ghost" },
    });
    assert.equal(res._status, 404);
  });

  it("returns 404 updating a missing item", async () => {
    const res = await call(collectionController.updateItem, {
      params: { collectionType: "portfolio", itemSlug: "ghost" },
      body: { slug: "ghost", settings: { title: "x" } },
    });
    assert.equal(res._status, 404);
  });

  it("deletes an item (200) and 404 on missing", async () => {
    const ok = await call(collectionController.deleteItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
    });
    assert.equal(ok._status, 200);
    const missing = await call(collectionController.deleteItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
    });
    assert.equal(missing._status, 404);
  });

  it("bulk-deletes: 200 full success, 207 partial", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "beta", settings: { title: "Beta" } },
    });
    const full = await call(collectionController.bulkDeleteItems, {
      params: { collectionType: "portfolio" },
      body: { itemSlugs: ["alpha", "beta"] },
    });
    assert.equal(full._status, 200);
    assert.deepEqual(full._json.deleted.sort(), ["alpha", "beta"]);

    const partial = await call(collectionController.bulkDeleteItems, {
      params: { collectionType: "portfolio" },
      body: { itemSlugs: ["ghost"] },
    });
    assert.equal(partial._status, 207);
    assert.deepEqual(partial._json.notFound, ["ghost"]);
  });

  it("bulk-delete cannot escape the collection dir via a traversal slug", async () => {
    // A file outside collections/portfolio that a crafted slug would resolve to:
    // getProjectCollectionItemPath(folder, "portfolio", "../../pages/victim")
    //   -> <projectDir>/pages/victim.json
    const victimPath = path.join(getProjectDir(PROJECT_FOLDER), "pages", "victim.json");
    await fs.outputJSON(victimPath, { keep: "me" });

    const res = await call(collectionController.bulkDeleteItems, {
      params: { collectionType: "portfolio" },
      body: { itemSlugs: ["../../pages/victim"] },
    });

    // The traversal slug is reported as an error, never deleted.
    assert.equal(res._status, 207);
    assert.deepEqual(res._json.deleted, []);
    assert.equal(res._json.errors.length, 1);
    assert.equal(res._json.errors[0].slug, "../../pages/victim");
    // The out-of-collection file survives untouched.
    assert.equal(await fs.pathExists(victimPath), true);
  });

  it("duplicates an item (201) and 404 on missing source", async () => {
    const dup = await call(collectionController.duplicateItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
    });
    assert.equal(dup._status, 201);
    assert.match(dup._json.slug, /^alpha-copy/);

    const missing = await call(collectionController.duplicateItem, {
      params: { collectionType: "portfolio", itemSlug: "ghost" },
    });
    assert.equal(missing._status, 404);
  });

  it("reorders items (200)", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "beta", settings: { title: "Beta" } },
    });
    const res = await call(collectionController.reorderItems, {
      params: { collectionType: "portfolio" },
      body: { order: ["beta", "alpha"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Cache-Control"], "no-store");

    const list = await call(collectionController.getAllItems, {
      params: { collectionType: "portfolio" },
    });
    assert.deepEqual(list._json.map((i) => i.slug), ["beta", "alpha"]);
  });
});

describe("controller wires media usage (Phase 6)", () => {
  const IMG = "api-img";
  const usedIn = (m) => m.files.find((f) => f.id === IMG).usedIn;

  beforeEach(async () => {
    await writeMediaFile(PROJECT_ID, {
      files: [
        { id: IMG, filename: "hero.jpg", path: "/uploads/images/hero.jpg", type: "image/jpeg", usedIn: [] },
      ],
    });
  });

  it("records usage on create and clears it on delete", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "alpha", settings: { title: "Alpha", featured_image: "/uploads/images/hero.jpg" } },
    });
    assert.deepEqual(usedIn(await readMediaFile(PROJECT_ID)), ["collection:portfolio/alpha"]);

    await call(collectionController.deleteItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
    });
    assert.deepEqual(usedIn(await readMediaFile(PROJECT_ID)), []);
  });

  it("moves the usage source when an item is renamed", async () => {
    await call(collectionController.createItem, {
      params: { collectionType: "portfolio" },
      body: { slug: "alpha", settings: { title: "Alpha", featured_image: "/uploads/images/hero.jpg" } },
    });
    await call(collectionController.updateItem, {
      params: { collectionType: "portfolio", itemSlug: "alpha" },
      body: { slug: "renamed", settings: { title: "Alpha", featured_image: "/uploads/images/hero.jpg" } },
    });
    assert.deepEqual(usedIn(await readMediaFile(PROJECT_ID)), ["collection:portfolio/renamed"]);
  });
});
