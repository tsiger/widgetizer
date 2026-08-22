/**
 * Dir-explicit link-enrichment cores (hosted per-tenant boundary).
 *
 * The folderName-based enrichment/cleanup helpers resolve DATA_DIR/projects/<folder>,
 * which is wrong for hosted (content lives under a per-actor dir). These tests drive
 * the `…FromDir({ projectDir })` cores against an **arbitrary scratch projectDir that
 * is NOT getProjectDir(folder)** — so a green assertion proves the core reads/writes
 * the supplied dir, not the global DATA_DIR (the §28/§35 boundary pattern).
 *
 * Run with: node --test packages/builder-server/src/tests/linkEnrichmentFromDir.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-fromdir-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const {
  enrichSeededRichtextLinksFromDir,
  cleanupDeletedPageReferences,
  cleanupDeletedCollectionItemReferences,
} = await import("../utils/linkEnrichment.js");

// Minimal in-memory StorageAdapter: proves the scrubbers perform ALL their IO
// through the adapter surface (getProjectBase throws — nothing may touch fs).
function makeMemoryStorage(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles)); // "pages/home.json" -> JSON string
  return {
    async read(scope, rel) {
      return files.has(rel) ? Buffer.from(files.get(rel)) : null;
    },
    async write(scope, rel, content) {
      files.set(rel, content.toString());
    },
    async list(scope, relDir) {
      const prefix = `${relDir}/`;
      const names = new Set();
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) names.add(key.slice(prefix.length).split("/")[0]);
      }
      return [...names];
    },
    async exists(scope, rel) {
      return files.has(rel);
    },
    getProjectBase() {
      throw new Error("scrubbers must not resolve filesystem paths");
    },
    _files: files,
  };
}
const SCOPE = { actor: { id: "tester", kind: "user" }, projectId: null, folderName: "scratch-project" };

// A scratch project working dir that is deliberately NOT under DATA_DIR/projects/…,
// so passing it proves the cores are dir-explicit (they never touch getProjectDir).
const PROJECT_DIR = path.join(TEST_ROOT, "scratch-project");

function pagePath(slug) {
  return path.join(PROJECT_DIR, "pages", `${slug}.json`);
}
function itemPath(type, slug) {
  return path.join(PROJECT_DIR, "collections", type, `${slug}.json`);
}
async function writePage(slug, uuid, widgets = {}) {
  await fs.outputJSON(pagePath(slug), { id: slug, slug, uuid, widgets });
}
async function readPage(slug) {
  return fs.readJSON(pagePath(slug));
}
async function writeItem(type, slug, uuid, settings) {
  await fs.outputJSON(itemPath(type, slug), { id: slug, uuid, slug, settings });
}
async function readItem(type, slug) {
  return fs.readJSON(itemPath(type, slug));
}
async function writeSchema(type, slugPrefix) {
  await fs.outputJSON(path.join(PROJECT_DIR, "collection-types", type, "schema.json"), {
    type,
    slugPrefix,
  });
}

after(async () => {
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await fs.remove(PROJECT_DIR);
});

// Sanity: the scratch dir must differ from what the folderName helpers would resolve,
// so these tests genuinely exercise the dir-explicit path.
before(() => {
  assert.notEqual(PROJECT_DIR, getProjectDir("scratch-project"));
});

describe("enrichSeededRichtextLinksFromDir", () => {
  it("stamps page- and item-uuid refs on richtext anchors read from the supplied projectDir", async () => {
    await writeSchema("news", "news");
    await writeItem("news", "hello", "item-hello", { title: "Hello" });
    await writePage("about", "page-about");
    await writePage("home", "page-home", {
      w1: {
        type: "text",
        settings: {
          body: '<p><a href="about.html">About</a> and <a href="news/hello.html">Hello</a></p>',
        },
      },
    });

    await enrichSeededRichtextLinksFromDir({ projectDir: PROJECT_DIR });

    const body = (await readPage("home")).widgets.w1.settings.body;
    assert.ok(body.includes('data-page-uuid="page-about"'), body);
    assert.ok(body.includes('data-collection-item-uuid="item-hello"'), body);
  });

  it("also enriches richtext inside collection items", async () => {
    await writeSchema("news", "news");
    await writePage("about", "page-about");
    await writeItem("news", "hello", "item-hello", {
      body: '<p>see <a href="about.html">about</a></p>',
    });

    await enrichSeededRichtextLinksFromDir({ projectDir: PROJECT_DIR });

    assert.ok((await readItem("news", "hello")).settings.body.includes('data-page-uuid="page-about"'));
  });
});

describe("cleanupDeletedPageReferences", () => {
  it("cleanupDeletedPageReferences blanks links via the storage adapter only", async () => {
    const storage = makeMemoryStorage({
      "pages/home.json": JSON.stringify({
        title: "Home",
        widgets: {
          w1: { settings: { link: { pageUuid: "dead-uuid", href: "/x", text: "X" } } },
          w2: {
            settings: {
              body: '<p>see <a href="x.html" data-page-uuid="dead-uuid">our page</a> now</p>',
            },
          },
        },
      }),
      "pages/about.json": JSON.stringify({ title: "About", widgets: {} }),
      "menus/main.json": JSON.stringify({ items: [{ label: "X", link: "/x", pageUuid: "dead-uuid" }] }),
    });

    await cleanupDeletedPageReferences(storage, SCOPE, { deletedPageUuid: "dead-uuid" });

    const home = JSON.parse(storage._files.get("pages/home.json"));
    assert.deepEqual(home.widgets.w1.settings.link, { href: "", text: "", target: "_self" });
    assert.equal(home.widgets.w2.settings.body, "<p>see our page now</p>");
    const menu = JSON.parse(storage._files.get("menus/main.json"));
    assert.equal(menu.items[0].link, "");
    assert.equal("pageUuid" in menu.items[0], false);
    // Untouched file's stored string is unchanged — no gratuitous rewrites.
    assert.equal(storage._files.get("pages/about.json"), JSON.stringify({ title: "About", widgets: {} }));
  });
});

describe("cleanupDeletedCollectionItemReferences", () => {
  it("cleanupDeletedCollectionItemReferences blanks links via the storage adapter only", async () => {
    const storage = makeMemoryStorage({
      "pages/home.json": JSON.stringify({
        title: "Home",
        widgets: {
          w1: {
            settings: {
              cta: { collectionType: "rooms", collectionItemUuid: "item-a", href: "/x", text: "X", target: "_self" },
            },
          },
          w2: {
            settings: { body: '<a href="news/x.html" data-collection-item-uuid="item-a">x</a>' },
          },
        },
      }),
      "pages/about.json": JSON.stringify({ title: "About", widgets: {} }),
      "collections/rooms/alpha.json": JSON.stringify({
        uuid: "item-a",
        settings: {
          related: { collectionType: "rooms", collectionItemUuid: "item-a", href: "/x", text: "X", target: "_self" },
        },
      }),
      "menus/main.json": JSON.stringify({
        items: [
          { label: "Suite", link: "/x", collectionType: "rooms", collectionItemUuid: "item-a" },
          { label: "Villa", link: "/y", collectionType: "rooms", collectionItemUuid: "item-b" },
        ],
      }),
    });

    // Array form (bulk-delete shape) — at least one array case per the brief.
    await cleanupDeletedCollectionItemReferences(storage, SCOPE, { deletedItemUuids: ["item-a"] });

    const home = JSON.parse(storage._files.get("pages/home.json"));
    assert.deepEqual(home.widgets.w1.settings.cta, { href: "", text: "", target: "_self" });
    assert.equal(home.widgets.w2.settings.body, "x");
    const item = JSON.parse(storage._files.get("collections/rooms/alpha.json"));
    assert.deepEqual(item.settings.related, { href: "", text: "", target: "_self" });
    const menu = JSON.parse(storage._files.get("menus/main.json"));
    assert.equal(menu.items[0].link, "");
    assert.equal("collectionItemUuid" in menu.items[0], false);
    assert.equal("collectionType" in menu.items[0], false);
    assert.equal(menu.items[1].collectionItemUuid, "item-b"); // untouched
    // Untouched file's stored string is unchanged — no gratuitous rewrites.
    assert.equal(storage._files.get("pages/about.json"), JSON.stringify({ title: "About", widgets: {} }));
  });
});
