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
  cleanupDeletedPageReferencesFromDir,
  cleanupDeletedCollectionItemReferencesFromDir,
} = await import("../utils/linkEnrichment.js");

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

describe("cleanupDeletedPageReferencesFromDir", () => {
  it("unwraps a richtext anchor pointing at a deleted page, from the supplied projectDir", async () => {
    await writePage("home", "page-home", {
      w1: {
        type: "text",
        settings: { body: '<p>see <a href="x.html" data-page-uuid="DELETED">our page</a> now</p>' },
      },
    });

    await cleanupDeletedPageReferencesFromDir({ projectDir: PROJECT_DIR, deletedPageUuid: "DELETED" });

    assert.equal((await readPage("home")).widgets.w1.settings.body, "<p>see our page now</p>");
  });
});

describe("cleanupDeletedCollectionItemReferencesFromDir", () => {
  it("unwraps a richtext anchor pointing at a deleted item, from the supplied projectDir", async () => {
    await writePage("home", "page-home", {
      w1: {
        type: "text",
        settings: { body: '<a href="news/x.html" data-collection-item-uuid="item-gone">x</a>' },
      },
    });

    await cleanupDeletedCollectionItemReferencesFromDir({
      projectDir: PROJECT_DIR,
      deletedItemUuids: "item-gone",
    });

    assert.equal((await readPage("home")).widgets.w1.settings.body, "x");
  });
});
