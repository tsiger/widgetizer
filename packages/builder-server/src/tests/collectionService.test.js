/**
 * collectionService test suite (scope-first rewrite).
 *
 * Exercises the rewritten collectionService against a REAL LocalStorageAdapter
 * over an isolated tmp data root + scope — the same adapter + scope pattern the
 * controllers use in production (mirrors pages.test.js). This verifies the
 * fs→storage-adapter migration end to end: schema discovery, item CRUD, slug
 * rename/conflict, ordering, duplicate/bulk-delete, archived-field discard, the
 * pure normalize/build/SEO helpers, the render-time gate, AND tenant isolation
 * (SLUG_RE guards + adapter confinement reject traversal before any path use).
 *
 * Run with: node --test packages/builder-server/src/tests/collectionService.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collections-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const svc = await import("../services/collectionService.js");

const PROJECT_ID = "collections-test-project-uuid";
const PROJECT_FOLDER = "collections-test-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = {
  actor: { id: "default", kind: "local" },
  projectId: PROJECT_ID,
  folderName: PROJECT_FOLDER,
};
const projectBase = path.join(TEST_DATA_DIR, "projects", PROJECT_FOLDER);

// A realistic collection type: title (required), richtext body, a usedAsDate
// field, an image, and a link — covers required validation, date sorting, and
// the render-time link gate.
const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { id: "title", type: "text", usedAsTitle: true, required: true },
    { id: "body", type: "richtext" },
    { id: "published", type: "date", usedAsDate: true },
    { id: "hero", type: "image" },
    { id: "cta", type: "link" },
  ],
};

async function seedSchema(folder, schema) {
  await storage.write(scope, `collection-types/${folder}/schema.json`, JSON.stringify(schema, null, 2));
}

/** Wipe collection-types/ and collections/ between tests for isolation. */
async function resetCollections() {
  await fs.remove(path.join(projectBase, "collection-types"));
  await fs.remove(path.join(projectBase, "collections"));
}

before(async () => {
  await fs.ensureDir(projectBase);
});

after(async () => {
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await resetCollections();
  await seedSchema("news", NEWS_SCHEMA);
});

/** Build + write a news item, returning the persisted record. */
async function createItem(input) {
  const schema = await svc.getCollectionSchema(storage, scope, "news");
  const { item, previousSlug } = svc.buildCollectionItemData(schema, input, null);
  await svc.writeCollectionItem(storage, scope, "news", item, previousSlug);
  return item;
}

// ---------------------------------------------------------------------------
// Pure schema validation
// ---------------------------------------------------------------------------

describe("validateCollectionSchema (pure)", () => {
  it("accepts a well-formed schema and normalizes defaults", () => {
    const { valid, normalized } = svc.validateCollectionSchema(NEWS_SCHEMA, "news");
    assert.equal(valid, true);
    assert.equal(normalized.slugPrefix, "news");
    assert.equal(normalized.defaultSort, "manual");
  });

  it("rejects a type that does not match its folder name", () => {
    const { valid, errors } = svc.validateCollectionSchema(NEWS_SCHEMA, "events");
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes("must match its folder name")));
  });

  it("requires exactly one usedAsTitle on a text setting", () => {
    const bad = { ...NEWS_SCHEMA, settings: [{ id: "x", type: "richtext", usedAsTitle: true }] };
    const { valid, errors } = svc.validateCollectionSchema(bad, "news");
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes("usedAsTitle")));
  });

  it("rejects v1-disallowed setting keys (repeater/blocks/multiple)", () => {
    const bad = {
      ...NEWS_SCHEMA,
      settings: [{ id: "title", type: "text", usedAsTitle: true }, { id: "r", type: "text", repeater: true }],
    };
    const { valid, errors } = svc.validateCollectionSchema(bad, "news");
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes("repeater")));
  });

  it("rejects a reserved slugPrefix when hasItemPages", () => {
    const bad = { ...NEWS_SCHEMA, slugPrefix: "assets" };
    const { valid, errors } = svc.validateCollectionSchema(bad, "news");
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes("reserved")));
  });
});

// ---------------------------------------------------------------------------
// Schema discovery over storage
// ---------------------------------------------------------------------------

describe("listCollectionSchemas / getCollectionSchema", () => {
  it("discovers a seeded collection type via the storage adapter", async () => {
    const schemas = await svc.listCollectionSchemas(storage, scope);
    assert.equal(schemas.length, 1);
    assert.equal(schemas[0].type, "news");
  });

  it("skips an invalid schema instead of throwing", async () => {
    await seedSchema("broken", { type: "broken", settings: "not-an-array" });
    const schemas = await svc.listCollectionSchemas(storage, scope);
    assert.deepEqual(
      schemas.map((s) => s.type),
      ["news"],
    );
  });

  it("skips collections sharing a slugPrefix (no deterministic winner)", async () => {
    await seedSchema("press", { ...NEWS_SCHEMA, type: "press", slugPrefix: "news" });
    const schemas = await svc.listCollectionSchemas(storage, scope);
    assert.equal(schemas.length, 0);
  });

  it("returns null for an unknown collection type", async () => {
    assert.equal(await svc.getCollectionSchema(storage, scope, "nope"), null);
  });
});

// ---------------------------------------------------------------------------
// Item create / read / list
// ---------------------------------------------------------------------------

describe("create + read items", () => {
  it("creates an item, derives the slug from the title, and reads it back", async () => {
    const item = await createItem({ settings: { title: "Hello World", body: "<p>hi</p>" } });
    assert.equal(item.slug, "hello-world");
    assert.ok(item.uuid);

    const read = await svc.readCollectionItem(storage, scope, "news", "hello-world");
    assert.equal(read.title, "Hello World");
    assert.equal(read.invalid, false);
    // hasItemPages → page-shaped seo present
    assert.equal(read.seo.og_type, "article");
  });

  it("rejects an item missing a required field", async () => {
    const schema = await svc.getCollectionSchema(storage, scope, "news");
    assert.throws(
      () => svc.buildCollectionItemData(schema, { settings: { body: "<p>no title</p>" } }, null),
      (e) => e.code === "VALIDATION",
    );
  });

  it("409s (SlugConflict) creating onto an existing slug", async () => {
    await createItem({ settings: { title: "Dup" } });
    const schema = await svc.getCollectionSchema(storage, scope, "news");
    const { item } = svc.buildCollectionItemData(schema, { slug: "dup", settings: { title: "Dup" } }, null);
    await assert.rejects(
      () => svc.writeCollectionItem(storage, scope, "news", item, null),
      (e) => e.code === "SLUG_CONFLICT",
    );
  });

  it("returns null reading a missing item", async () => {
    assert.equal(await svc.readCollectionItem(storage, scope, "news", "ghost"), null);
  });
});

// ---------------------------------------------------------------------------
// Ordering, rename, duplicate, delete
// ---------------------------------------------------------------------------

describe("ordering + mutations", () => {
  it("applies manual _order.json then created-desc for the remainder", async () => {
    await createItem({ settings: { title: "First" } });
    await createItem({ settings: { title: "Second" } });
    await createItem({ settings: { title: "Third" } });
    await svc.reorderCollectionItems(storage, scope, "news", ["third", "first"]);

    const items = await svc.listCollectionItems(storage, scope, "news", { sort: "manual" });
    assert.deepEqual(items.slice(0, 2).map((i) => i.slug), ["third", "first"]);
    // "second" (unlisted) trails the manual entries
    assert.ok(items.map((i) => i.slug).includes("second"));
  });

  it("sorts by usedAsDate descending, undated last", async () => {
    await createItem({ settings: { title: "Old", published: "2020-01-01" } });
    await createItem({ settings: { title: "New", published: "2026-01-01" } });
    await createItem({ settings: { title: "Undated" } });
    const items = await svc.listCollectionItems(storage, scope, "news", { sort: "date_desc" });
    assert.deepEqual(items.map((i) => i.slug), ["new", "old", "undated"]);
  });

  it("renames an item (same uuid), removing the old file and remapping order", async () => {
    const created = await createItem({ settings: { title: "Rename Me" } });
    await svc.reorderCollectionItems(storage, scope, "news", ["rename-me"]);

    const schema = await svc.getCollectionSchema(storage, scope, "news");
    const existing = await svc.readRawCollectionItem(storage, scope, "news", "rename-me");
    const { item, previousSlug } = svc.buildCollectionItemData(
      schema,
      { slug: "renamed", settings: { title: "Rename Me" } },
      existing,
    );
    assert.equal(previousSlug, "rename-me");
    await svc.writeCollectionItem(storage, scope, "news", item, previousSlug);

    assert.equal(item.uuid, created.uuid); // uuid preserved across rename
    assert.equal(await svc.readCollectionItem(storage, scope, "news", "rename-me"), null);
    assert.ok(await svc.readCollectionItem(storage, scope, "news", "renamed"));

    const items = await svc.listCollectionItems(storage, scope, "news", { sort: "manual" });
    assert.equal(items[0].slug, "renamed"); // order entry remapped
  });

  it("duplicates an item with a fresh uuid, copy-suffixed slug, inserted after source", async () => {
    await createItem({ settings: { title: "Source" } });
    const dupe = await svc.duplicateCollectionItem(storage, scope, "news", "source");
    assert.equal(dupe.slug, "source-copy");
    assert.notEqual(dupe.uuid, (await svc.readCollectionItem(storage, scope, "news", "source")).uuid);
  });

  it("deletes an item and prunes it from order", async () => {
    await createItem({ settings: { title: "Doomed" } });
    await svc.reorderCollectionItems(storage, scope, "news", ["doomed"]);
    const res = await svc.deleteCollectionItem(storage, scope, "news", "doomed");
    assert.equal(res.deleted, true);
    assert.equal(await svc.readCollectionItem(storage, scope, "news", "doomed"), null);
    // order pruned (stale slug whose file is gone)
    const orderBuf = await storage.read(scope, "collections/news/_order.json");
    assert.deepEqual(JSON.parse(orderBuf.toString()).order, []);
  });

  it("bulk-deletes with partial reporting (deleted / notFound / invalid slug)", async () => {
    await createItem({ settings: { title: "A" } });
    await createItem({ settings: { title: "B" } });
    const res = await svc.bulkDeleteCollectionItems(storage, scope, "news", ["a", "missing", "../evil"]);
    assert.deepEqual(res.deleted, ["a"]);
    assert.deepEqual(res.notFound, ["missing"]);
    assert.equal(res.errors.length, 1);
    assert.equal(res.errors[0].slug, "../evil");
  });

  it("discards archived (out-of-schema) settings while preserving uuid/created", async () => {
    const created = await createItem({ settings: { title: "Keep" } });
    // Inject an orphan field directly on disk, then discard it.
    const raw = await svc.readRawCollectionItem(storage, scope, "news", "keep");
    raw.settings.legacyField = "orphan";
    await storage.write(scope, "collections/news/keep.json", JSON.stringify(raw, null, 2));

    const result = await svc.discardArchivedCollectionItem(storage, scope, "news", "keep");
    assert.equal(Object.keys(result._archived).length, 0);
    assert.equal(result.uuid, created.uuid);
    const after = await svc.readRawCollectionItem(storage, scope, "news", "keep");
    assert.equal("legacyField" in after.settings, false);
  });
});

// ---------------------------------------------------------------------------
// Normalize / archived / render-time helpers (pure)
// ---------------------------------------------------------------------------

describe("normalize + render helpers (pure)", () => {
  it("normalizeCollectionItem separates unknown fields into _archived", () => {
    const normalized = svc.normalizeCollectionItem(
      { slug: "x", uuid: "u", settings: { title: "T", ghost: "boo" } },
      NEWS_SCHEMA,
    );
    assert.equal(normalized._archived.ghost, "boo");
    assert.equal("ghost" in normalized.settings, false);
    assert.equal(normalized.title, "T");
  });

  it("prepareCollectionItemForRender resolves a dead page link to empty", () => {
    const item = { slug: "p", settings: { title: "T", cta: { href: "old.html", pageUuid: "missing" } } };
    const out = svc.prepareCollectionItemForRender(item, NEWS_SCHEMA, new Map(), "");
    assert.equal(out.settings.cta.href, ""); // deleted page → cleared
  });

  it("prepareCollectionItemForRender depth-prefixes a resolved page link", () => {
    const pages = new Map([["pg", { slug: "about" }]]);
    const item = { slug: "p", settings: { title: "T", cta: { href: "", pageUuid: "pg" } } };
    const out = svc.prepareCollectionItemForRender(item, NEWS_SCHEMA, pages, "../");
    assert.equal(out.settings.cta.href, "../about.html");
  });

  it("buildCollectionItemPageData yields a page-shaped object with nested slug", () => {
    const page = svc.buildCollectionItemPageData(
      NEWS_SCHEMA,
      { slug: "hello", uuid: "u", settings: { title: "Hello" }, seo: {} },
      "https://example.com",
    );
    assert.equal(page.slug, "news/hello");
    assert.equal(page.name, "Hello");
    assert.equal(page.seo.canonical_url, "https://example.com/news/hello.html");
  });

  it("buildCollectionItemPageData drops the canonical .html extension with cleanUrls", () => {
    const page = svc.buildCollectionItemPageData(
      NEWS_SCHEMA,
      { slug: "hello", uuid: "u", settings: { title: "Hello" }, seo: {} },
      "https://example.com",
      true,
    );
    assert.equal(page.seo.canonical_url, "https://example.com/news/hello");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation / path traversal
// ---------------------------------------------------------------------------

describe("tenant isolation (SLUG_RE guards + adapter confinement)", () => {
  it("rejects a traversal collectionType on reads (returns empty, no escape)", async () => {
    assert.equal(await svc.getCollectionSchema(storage, scope, "../../etc"), null);
    assert.deepEqual(await svc.listCollectionItems(storage, scope, "../../etc", {}), []);
    assert.equal(await svc.readCollectionItem(storage, scope, "../../etc", "passwd"), null);
    assert.equal(await svc.loadCollectionTemplate(storage, scope, "..%2f.."), null);
  });

  it("rejects a traversal itemSlug on reads", async () => {
    assert.equal(await svc.readRawCollectionItem(storage, scope, "news", "../../../etc/passwd"), null);
    assert.equal(await svc.readCollectionItem(storage, scope, "news", "../../secret"), null);
  });

  it("throws on a write with a traversal slug, writing nothing outside the project", async () => {
    await assert.rejects(
      () => svc.writeCollectionItem(storage, scope, "news", { slug: "../../escape", uuid: "u", settings: {} }, null),
      (e) => e.code === "VALIDATION",
    );
    // Nothing leaked above the project base.
    assert.equal(await fs.pathExists(path.join(TEST_DATA_DIR, "projects", "escape.json")), false);
  });

  it("throws on a write with a traversal collectionType", async () => {
    await assert.rejects(
      () => svc.writeCollectionItem(storage, scope, "../../evil", { slug: "x", uuid: "u", settings: {} }, null),
      (e) => e.code === "VALIDATION",
    );
  });
});
