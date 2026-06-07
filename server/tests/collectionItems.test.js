/**
 * Collections — read/write item storage service (spec Sections 2, 4, 15).
 *
 * Phase 3 (read): normalizeCollectionItem, listCollectionItems, readCollectionItem,
 *   loadCollectionTemplate.
 * Phase 4 (write): buildCollectionItemData, writeCollectionItem, deleteCollectionItem,
 *   bulkDeleteCollectionItems, duplicateCollectionItem.
 *
 * Run with: node --test server/tests/collectionItems.test.js
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collitems-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const {
  normalizeCollectionItem,
  listCollectionItems,
  readCollectionItem,
  loadCollectionTemplate,
  buildCollectionItemData,
  writeCollectionItem,
  deleteCollectionItem,
  bulkDeleteCollectionItems,
  duplicateCollectionItem,
  discardArchivedCollectionItem,
  reorderCollectionItems,
  readRawCollectionItem,
  resolveCollectionItemLinks,
  prepareCollectionItemForRender,
} = await import("../services/collectionService.js");
const {
  getProjectCollectionSchemaPath,
  getProjectCollectionItemPath,
  getProjectCollectionOrderPath,
  getProjectCollectionTemplatePath,
  getProjectCollectionDir,
} = await import("../config.js");

after(async () => {
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
});

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

function portfolioSchema(over = {}) {
  return {
    type: "portfolio",
    schemaVersion: 2,
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
      { type: "checkbox", id: "seo_noindex", label: "Noindex", default: false },
    ],
    ...over,
  };
}

function itemFile(slug, over = {}) {
  return {
    id: slug,
    uuid: `uuid-${slug}`,
    slug,
    schemaVersion: 2,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    settings: { title: slug, description: "", seo_noindex: false },
    ...over,
  };
}

/** Set up a collection on disk: schema + items + optional _order.json. */
async function setupCollection(folder, type, schema, items = [], order = null) {
  await fs.outputJSON(getProjectCollectionSchemaPath(folder, type), schema);
  for (const item of items) {
    await fs.outputJSON(getProjectCollectionItemPath(folder, type, item.slug), item);
  }
  if (order) {
    await fs.outputJSON(getProjectCollectionOrderPath(folder, type), { order });
  }
}

// ============================================================================
// normalizeCollectionItem (pure)
// ============================================================================

describe("normalizeCollectionItem", () => {
  it("fills missing optional fields with schema/empty defaults and computes title", () => {
    const schema = portfolioSchema();
    const raw = itemFile("alpha", { settings: { title: "Alpha Project" } });
    const n = normalizeCollectionItem(raw, schema);
    assert.equal(n.title, "Alpha Project");
    assert.equal(n.settings.description, ""); // filled
    assert.equal(n.settings.seo_noindex, false); // schema default
    assert.equal(n.invalid, false);
    assert.deepEqual(n.validationErrors, []);
  });

  it("flags invalid when a required field is empty", () => {
    const schema = portfolioSchema();
    const raw = itemFile("beta", { settings: { title: "" } });
    const n = normalizeCollectionItem(raw, schema);
    assert.equal(n.invalid, true);
    assert.ok(n.validationErrors.some((e) => e.fieldId === "title"));
  });

  it("moves fields no longer in the schema into _archived without erasing the input", () => {
    const schema = portfolioSchema();
    const raw = itemFile("gamma", {
      settings: { title: "Gamma", subtitle: "kept-around", description: "d" },
    });
    const n = normalizeCollectionItem(raw, schema);
    assert.equal(n.settings.subtitle, undefined); // not in current-schema settings
    assert.equal(n._archived.subtitle, "kept-around"); // preserved in-memory
    // input object must not be mutated (on-disk data untouched)
    assert.equal(raw.settings.subtitle, "kept-around");
  });

  it("bumps schemaVersion in-memory to the schema's version", () => {
    const schema = portfolioSchema({ schemaVersion: 5 });
    const raw = itemFile("delta", { schemaVersion: 2 });
    const n = normalizeCollectionItem(raw, schema);
    assert.equal(n.schemaVersion, 5);
  });
});

// ============================================================================
// listCollectionItems
// ============================================================================

describe("listCollectionItems", () => {
  beforeEach(async () => {
    await fs.remove(path.join(TEST_ROOT, "data"));
  });

  it("returns [] when the collection has no items", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    assert.deepEqual(await listCollectionItems("p", "portfolio"), []);
  });

  it("excludes _order.json and *.tmp files", async () => {
    const schema = portfolioSchema({ defaultSort: "created_asc" });
    await setupCollection("p", "portfolio", schema, [itemFile("a"), itemFile("b")], ["a", "b"]);
    // a stray atomic tmp orphan must be ignored
    await fs.outputJSON(
      getProjectCollectionItemPath("p", "portfolio", "a.json.3f2504e0-4f89-41d3-9a0c-0305e82c3301") +
        ".tmp",
      { junk: true },
    );
    const items = await listCollectionItems("p", "portfolio");
    assert.deepEqual(
      items.map((i) => i.slug).sort(),
      ["a", "b"],
    );
  });

  it("sorts by created_desc and created_asc", async () => {
    const items = [
      itemFile("old", { created: "2026-01-01T00:00:00.000Z" }),
      itemFile("new", { created: "2026-03-01T00:00:00.000Z" }),
    ];
    await setupCollection("p", "portfolio", portfolioSchema({ defaultSort: "created_desc" }), items);
    let result = await listCollectionItems("p", "portfolio");
    assert.deepEqual(result.map((i) => i.slug), ["new", "old"]);

    result = await listCollectionItems("p", "portfolio", { sort: "created_asc" });
    assert.deepEqual(result.map((i) => i.slug), ["old", "new"]);
  });

  it("sorts by title_asc and title_desc", async () => {
    const items = [
      itemFile("z", { settings: { title: "Zebra" } }),
      itemFile("a", { settings: { title: "Apple" } }),
    ];
    await setupCollection("p", "portfolio", portfolioSchema({ defaultSort: "title_asc" }), items);
    let result = await listCollectionItems("p", "portfolio");
    assert.deepEqual(result.map((i) => i.title), ["Apple", "Zebra"]);

    result = await listCollectionItems("p", "portfolio", { sort: "title_desc" });
    assert.deepEqual(result.map((i) => i.title), ["Zebra", "Apple"]);
  });

  it("honors manual order: ordered first, then unordered by created_desc, stale ignored", async () => {
    const items = [
      itemFile("first", { created: "2026-01-01T00:00:00.000Z" }),
      itemFile("second", { created: "2026-01-02T00:00:00.000Z" }),
      itemFile("unordered-old", { created: "2026-01-03T00:00:00.000Z" }),
      itemFile("unordered-new", { created: "2026-01-04T00:00:00.000Z" }),
    ];
    // _order lists second, first, and a stale slug that no longer exists
    await setupCollection("p", "portfolio", portfolioSchema({ defaultSort: "manual" }), items, [
      "second",
      "first",
      "ghost",
    ]);
    const result = await listCollectionItems("p", "portfolio");
    assert.deepEqual(result.map((i) => i.slug), [
      "second",
      "first",
      "unordered-new",
      "unordered-old",
    ]);
  });

  it("applies limit and offset after sorting", async () => {
    const items = ["a", "b", "c", "d"].map((s, i) =>
      itemFile(s, { created: `2026-01-0${i + 1}T00:00:00.000Z` }),
    );
    await setupCollection("p", "portfolio", portfolioSchema({ defaultSort: "created_asc" }), items);
    const result = await listCollectionItems("p", "portfolio", { limit: 2, offset: 1 });
    assert.deepEqual(result.map((i) => i.slug), ["b", "c"]);
  });

  it("recovers from a duplicate-uuid rename crash: newer updated wins, loser excluded (not deleted)", async () => {
    const oldFile = itemFile("oldslug", {
      uuid: "shared-uuid",
      updated: "2026-01-01T00:00:00.000Z",
    });
    const newFile = itemFile("newslug", {
      uuid: "shared-uuid",
      updated: "2026-02-01T00:00:00.000Z",
    });
    await setupCollection("p", "portfolio", portfolioSchema({ defaultSort: "created_asc" }), [
      oldFile,
      newFile,
    ]);
    const result = await listCollectionItems("p", "portfolio");
    assert.deepEqual(result.map((i) => i.slug), ["newslug"]);
    // loser still on disk (read must not delete)
    assert.equal(
      await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "oldslug")),
      true,
    );
  });
});

// ============================================================================
// readCollectionItem + loadCollectionTemplate
// ============================================================================

describe("readCollectionItem", () => {
  beforeEach(async () => {
    await fs.remove(path.join(TEST_ROOT, "data"));
  });

  it("reads and normalizes a single item", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("alpha", { settings: { title: "Alpha" } }),
    ]);
    const item = await readCollectionItem("p", "portfolio", "alpha");
    assert.equal(item.slug, "alpha");
    assert.equal(item.title, "Alpha");
    assert.equal(item.settings.description, "");
  });

  it("returns null for a missing item", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    assert.equal(await readCollectionItem("p", "portfolio", "nope"), null);
  });
});

describe("loadCollectionTemplate", () => {
  beforeEach(async () => {
    await fs.remove(path.join(TEST_ROOT, "data"));
  });

  it("returns the template string when present", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    await fs.outputFile(
      getProjectCollectionTemplatePath("p", "portfolio"),
      "<article>{{ item.settings.title }}</article>",
    );
    const tpl = await loadCollectionTemplate("p", "portfolio");
    assert.match(tpl, /article/);
  });

  it("returns null when the template file is missing", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    assert.equal(await loadCollectionTemplate("p", "portfolio"), null);
  });
});

async function readOrder(folder, type) {
  try {
    return (await fs.readJSON(getProjectCollectionOrderPath(folder, type))).order;
  } catch {
    return null;
  }
}

// ============================================================================
// buildCollectionItemData (Phase 4)
// ============================================================================

describe("buildCollectionItemData", () => {
  it("creates a new item: generates uuid, derives slug from title, sets timestamps", () => {
    const { item, previousSlug } = buildCollectionItemData(portfolioSchema(), {
      settings: { title: "Hello World" },
    });
    assert.equal(item.slug, "hello-world");
    assert.equal(item.id, "hello-world");
    assert.ok(item.uuid && item.uuid.length > 0);
    assert.ok(item.created && item.updated);
    assert.equal(previousSlug, null);
  });

  it("preserves uuid and created when updating an existing item", () => {
    const existing = itemFile("alpha", { uuid: "keep-uuid", created: "2020-01-01T00:00:00.000Z" });
    const { item, previousSlug } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "alpha", settings: { title: "Alpha" } },
      existing,
    );
    assert.equal(item.uuid, "keep-uuid");
    assert.equal(item.created, "2020-01-01T00:00:00.000Z");
    assert.equal(previousSlug, "alpha");
  });

  it("sets updated strictly greater than the previous value (monotonic, clock-skew safe)", () => {
    const existing = itemFile("a", { updated: "2099-01-01T00:00:00.000Z" });
    const { item } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "a", settings: { title: "A" } },
      existing,
    );
    assert.ok(Date.parse(item.updated) > Date.parse("2099-01-01T00:00:00.000Z"));
  });

  it("preserves orphaned (out-of-schema) settings on save (BLOCKER-2)", () => {
    const existing = itemFile("a", {
      settings: { title: "A", subtitle: "orphan-value" },
    });
    const { item } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "a", settings: { title: "A" } },
      existing,
    );
    assert.equal(item.settings.subtitle, "orphan-value");
  });

  it("throws a validation error when a required field is empty", () => {
    assert.throws(
      () => buildCollectionItemData(portfolioSchema(), { settings: { title: "" } }),
      (err) => Array.isArray(err.validationErrors) && err.validationErrors.some((e) => e.fieldId === "title"),
    );
  });
});

// ============================================================================
// collection item SEO — page-shaped seo object (Finding #12)
// ============================================================================

describe("collection item SEO", () => {
  const withSeo = (seo) => ({ slug: "alpha", settings: { title: "Alpha" }, seo });

  it("buildCollectionItemData persists a page-shaped seo object with item defaults", () => {
    const { item } = buildCollectionItemData(portfolioSchema(), withSeo({ description: "d", robots: "noindex,follow" }));
    assert.deepEqual(item.seo, {
      description: "d",
      og_title: "",
      og_image: "",
      og_type: "article", // collection items are content
      twitter_card: "summary",
      canonical_url: "",
      robots: "noindex,follow",
    });
  });

  it("buildCollectionItemData strips HTML from seo text fields (parity with page SEO)", () => {
    const { item } = buildCollectionItemData(
      portfolioSchema(),
      withSeo({ description: "<b>Bold</b> summary", og_title: "<i>Italic</i> Title", canonical_url: "<u>https://x.com/p</u>" }),
    );
    assert.equal(item.seo.description, "Bold summary");
    assert.equal(item.seo.og_title, "Italic Title");
    assert.equal(item.seo.canonical_url, "https://x.com/p");
  });

  it("buildCollectionItemData carries forward existing seo when an update omits it", () => {
    const existing = itemFile("alpha", { seo: { description: "kept", robots: "index,follow" } });
    const { item } = buildCollectionItemData(portfolioSchema(), { slug: "alpha", settings: { title: "Alpha" } }, existing);
    assert.equal(item.seo.description, "kept");
  });

  it("normalizeCollectionItem surfaces a default seo object for a legacy item with none", () => {
    const n = normalizeCollectionItem(itemFile("alpha"), portfolioSchema());
    assert.equal(n.seo.robots, "index,follow");
    assert.equal(n.seo.og_type, "article");
    assert.equal(n.seo.description, "");
  });

  it("list-only collections (no item pages) carry no seo object", () => {
    const listOnly = portfolioSchema({ hasItemPages: false });
    const { item } = buildCollectionItemData(listOnly, withSeo({ description: "ignored" }));
    assert.equal("seo" in item, false);
    assert.equal("seo" in normalizeCollectionItem(itemFile("alpha"), listOnly), false);
  });
});

// ============================================================================
// writeCollectionItem / delete / bulkDelete / duplicate (Phase 4)
// ============================================================================

describe("write-side storage", () => {
  beforeEach(async () => {
    await fs.remove(path.join(TEST_ROOT, "data"));
  });

  it("creates a new item file", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    const { item } = buildCollectionItemData(portfolioSchema(), { settings: { title: "Alpha" } });
    await writeCollectionItem("pid", "p", "portfolio", item, null);
    const read = await readCollectionItem("p", "portfolio", item.slug);
    assert.equal(read.title, "Alpha");
  });

  it("rejects creating an item whose slug already exists (409-able)", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [itemFile("alpha")]);
    const { item } = buildCollectionItemData(portfolioSchema(), {
      slug: "alpha",
      settings: { title: "Alpha" },
    });
    await assert.rejects(writeCollectionItem("pid", "p", "portfolio", item, null), (err) => {
      assert.equal(err.conflictingSlug, "alpha");
      return true;
    });
  });

  it("updates without rename by overwriting atomically", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("alpha", { settings: { title: "Old" } }),
    ]);
    const existing = await fs.readJSON(getProjectCollectionItemPath("p", "portfolio", "alpha"));
    const { item, previousSlug } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "alpha", settings: { title: "New" } },
      existing,
    );
    await writeCollectionItem("pid", "p", "portfolio", item, previousSlug);
    const read = await readCollectionItem("p", "portfolio", "alpha");
    assert.equal(read.title, "New");
  });

  it("renames: writes new slug, removes old file, updates _order.json", async () => {
    await setupCollection(
      "p",
      "portfolio",
      portfolioSchema(),
      [itemFile("alpha", { uuid: "uA", settings: { title: "Alpha" } })],
      ["alpha"],
    );
    const existing = await fs.readJSON(getProjectCollectionItemPath("p", "portfolio", "alpha"));
    const { item, previousSlug } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "renamed", settings: { title: "Alpha" } },
      existing,
    );
    await writeCollectionItem("pid", "p", "portfolio", item, previousSlug);

    assert.equal(item.uuid, "uA"); // uuid preserved across rename
    assert.equal(await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "renamed")), true);
    assert.equal(await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "alpha")), false);
    assert.deepEqual(await readOrder("p", "portfolio"), ["renamed"]);
  });

  it("rejects renaming onto an existing slug", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("alpha", { uuid: "uA" }),
      itemFile("beta", { uuid: "uB" }),
    ]);
    const existing = await fs.readJSON(getProjectCollectionItemPath("p", "portfolio", "alpha"));
    const { item, previousSlug } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "beta", settings: { title: "Alpha" } },
      existing,
    );
    await assert.rejects(writeCollectionItem("pid", "p", "portfolio", item, previousSlug), (err) => {
      assert.equal(err.conflictingSlug, "beta");
      return true;
    });
  });

  it("deletes the duplicate-uuid loser sibling on the next save", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("keep", { uuid: "shared", updated: "2026-02-01T00:00:00.000Z" }),
      itemFile("loser", { uuid: "shared", updated: "2026-01-01T00:00:00.000Z" }),
    ]);
    const existing = await fs.readJSON(getProjectCollectionItemPath("p", "portfolio", "keep"));
    const { item, previousSlug } = buildCollectionItemData(
      portfolioSchema(),
      { slug: "keep", settings: { title: "Keep" } },
      existing,
    );
    await writeCollectionItem("pid", "p", "portfolio", item, previousSlug);
    assert.equal(await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "keep")), true);
    assert.equal(await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "loser")), false);
  });

  it("deletes an item and prunes it (and stale slugs) from _order.json", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [itemFile("alpha")], [
      "alpha",
      "ghost",
    ]);
    await deleteCollectionItem("pid", "p", "portfolio", "alpha");
    assert.equal(await fs.pathExists(getProjectCollectionItemPath("p", "portfolio", "alpha")), false);
    assert.deepEqual(await readOrder("p", "portfolio"), []); // alpha removed, ghost pruned
  });

  it("bulk-deletes, reporting deleted/notFound and pruning order", async () => {
    await setupCollection(
      "p",
      "portfolio",
      portfolioSchema(),
      [itemFile("a"), itemFile("b"), itemFile("c")],
      ["a", "b", "c"],
    );
    const result = await bulkDeleteCollectionItems("pid", "p", "portfolio", ["a", "c", "ghost"]);
    assert.deepEqual(result.deleted.sort(), ["a", "c"]);
    assert.deepEqual(result.notFound, ["ghost"]);
    assert.deepEqual(await readOrder("p", "portfolio"), ["b"]);
  });

  it("duplicates an item: new uuid, copy-suffixed slug+title, inserted after source", async () => {
    await setupCollection(
      "p",
      "portfolio",
      portfolioSchema(),
      [itemFile("alpha", { uuid: "uA", settings: { title: "Alpha" } })],
      ["alpha"],
    );
    const dup = await duplicateCollectionItem("pid", "p", "portfolio", "alpha");
    assert.notEqual(dup.uuid, "uA");
    assert.match(dup.slug, /^alpha-copy/);
    assert.equal(dup.settings.title, "Alpha (copy)");
    const order = await readOrder("p", "portfolio");
    assert.equal(order[0], "alpha");
    assert.equal(order[1], dup.slug); // inserted immediately after source
  });

  it("copies the page-shaped seo object to the duplicate (Finding #12)", async () => {
    await setupCollection(
      "p",
      "portfolio",
      portfolioSchema(),
      [
        itemFile("alpha", {
          uuid: "uA",
          settings: { title: "Alpha" },
          seo: { description: "Meta", og_image: "/uploads/images/social.jpg", robots: "noindex,follow" },
        }),
      ],
      ["alpha"],
    );
    const dup = await duplicateCollectionItem("pid", "p", "portfolio", "alpha");
    assert.equal(dup.seo.description, "Meta");
    assert.equal(dup.seo.og_image, "/uploads/images/social.jpg");
    assert.equal(dup.seo.robots, "noindex,follow");
    assert.equal(dup.seo.og_type, "article"); // shaped default
  });

  it("reorders items, pruning stale slugs", async () => {
    await setupCollection(
      "p",
      "portfolio",
      portfolioSchema(),
      [itemFile("a"), itemFile("b"), itemFile("c")],
      ["a", "b", "c"],
    );
    await reorderCollectionItems("pid", "p", "portfolio", ["c", "a", "b", "ghost"]);
    assert.deepEqual(await readOrder("p", "portfolio"), ["c", "a", "b"]);
  });

  it("readRawCollectionItem returns the on-disk file (orphans intact) or null", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("alpha", { settings: { title: "Alpha", subtitle: "orphan" } }),
    ]);
    const raw = await readRawCollectionItem("p", "portfolio", "alpha");
    assert.equal(raw.settings.subtitle, "orphan"); // raw keeps out-of-schema keys
    assert.equal(await readRawCollectionItem("p", "portfolio", "missing"), null);
  });
});

// ============================================================================
// resolveCollectionItemLinks (Phase 7 — render-time link resolution)
// ============================================================================

describe("discardArchivedCollectionItem", () => {
  beforeEach(async () => {
    await fs.remove(path.join(TEST_ROOT, "data"));
  });

  it("strips orphaned keys, keeps schema fields, preserves timestamps", async () => {
    await setupCollection("p", "portfolio", portfolioSchema(), [
      itemFile("alpha", {
        created: "2020-01-01T00:00:00.000Z",
        updated: "2020-02-02T00:00:00.000Z",
        settings: { title: "Alpha", legacy_field: "orphan", another_orphan: "x" },
      }),
    ]);

    const out = await discardArchivedCollectionItem("pid", "p", "portfolio", "alpha");
    assert.ok(out);
    assert.deepEqual(out._archived, {});
    assert.equal(out.settings.title, "Alpha");
    // timestamps untouched — discard removes hidden data, not visible content
    assert.equal(out.created, "2020-01-01T00:00:00.000Z");
    assert.equal(out.updated, "2020-02-02T00:00:00.000Z");

    const raw = await fs.readJSON(getProjectCollectionItemPath("p", "portfolio", "alpha"));
    assert.equal(raw.settings.title, "Alpha");
    assert.equal(raw.settings.legacy_field, undefined);
    assert.equal(raw.settings.another_orphan, undefined);
  });

  it("returns null for a missing item", async () => {
    await setupCollection("p", "portfolio", portfolioSchema());
    assert.equal(await discardArchivedCollectionItem("pid", "p", "portfolio", "ghost"), null);
  });
});

describe("resolveCollectionItemLinks", () => {
  const pagesByUuid = new Map([["page-uuid-1", { slug: "about" }]]);

  it("resolves a pageUuid link to the current slug, depth-prefixed", () => {
    const item = {
      settings: { cta: { pageUuid: "page-uuid-1", href: "", text: "About", target: "_self" } },
    };
    const out = resolveCollectionItemLinks(item, pagesByUuid, "../");
    assert.equal(out.settings.cta.href, "../about.html");
    assert.equal(out.settings.cta.text, "About"); // other fields preserved
  });

  it("clears a link whose page was deleted", () => {
    const item = {
      settings: { cta: { pageUuid: "gone", href: "", text: "X", target: "_blank" } },
    };
    const out = resolveCollectionItemLinks(item, pagesByUuid, "../");
    assert.deepEqual(out.settings.cta, { href: "", text: "", target: "_self" });
  });

  it("depth-prefixes a custom-URL link (no pageUuid)", () => {
    const item = { settings: { cta: { href: "contact.html", target: "_self" } } };
    const out = resolveCollectionItemLinks(item, pagesByUuid, "../");
    assert.equal(out.settings.cta.href, "../contact.html");
  });

  it("leaves non-link settings untouched and does not mutate the input", () => {
    const item = { settings: { title: "Hi", img: "/uploads/images/x.jpg" } };
    const out = resolveCollectionItemLinks(item, pagesByUuid, "../");
    assert.equal(out.settings.title, "Hi");
    assert.equal(out.settings.img, "/uploads/images/x.jpg");
    // input untouched
    const item2 = { settings: { cta: { href: "contact.html" } } };
    resolveCollectionItemLinks(item2, pagesByUuid, "../");
    assert.equal(item2.settings.cta.href, "contact.html");
  });
});

// ============================================================================
// prepareCollectionItemForRender — the render gate (resolve links + sanitize)
// ============================================================================

describe("prepareCollectionItemForRender", () => {
  const pagesByUuid = new Map([["page-uuid-1", { slug: "about" }]]);
  const schema = {
    settings: [
      { id: "description", type: "richtext" },
      { id: "cta", type: "link" },
      { id: "title", type: "text" },
    ],
  };

  it("resolves links AND sanitizes in one pass", () => {
    const item = {
      settings: {
        description: '<p>Welcome</p><script>steal()</script>',
        cta: { pageUuid: "page-uuid-1", href: "", text: "About", target: "_self" },
      },
    };
    const out = prepareCollectionItemForRender(item, schema, pagesByUuid, "../");
    // link resolution still happens (pageUuid -> depth-prefixed slug)
    assert.equal(out.settings.cta.href, "../about.html");
    // sanitization happens too (script stripped, safe markup kept)
    assert.doesNotMatch(out.settings.description, /<script/i);
    assert.match(out.settings.description, /<p>Welcome<\/p>/);
  });

  it("blocks a javascript: href that survives link resolution", () => {
    const item = { settings: { cta: { href: "javascript:alert(1)", text: "Go" } } };
    const out = prepareCollectionItemForRender(item, schema, pagesByUuid, "../");
    assert.equal(out.settings.cta.href, "");
  });

  it("does not mutate the on-disk item (operates on a clone)", () => {
    const item = { settings: { description: '<p>Hi</p><script>x()</script>' } };
    prepareCollectionItemForRender(item, schema, pagesByUuid, "");
    // original still carries the raw payload — only the returned clone is cleaned
    assert.match(item.settings.description, /<script>x\(\)<\/script>/);
  });
});

// keep getProjectCollectionDir referenced (used indirectly via service)
void getProjectCollectionDir;
