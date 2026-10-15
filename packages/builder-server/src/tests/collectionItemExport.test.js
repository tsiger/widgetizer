/**
 * Collection item-page export test suite (docs-llms/core-collections.md §6).
 *
 * Drives `exportProject` (the req/res controller) with a real LocalStorageAdapter
 * on `req.adapters.storage` + `req.scope` — exactly what the project-scoped route
 * supplies — so it exercises the full collection export path through
 * `exportProjectToDir` → `renderCollectionItemPage`: the two-pass fail-fast
 * validation (invalid items / missing template, BEFORE any disk write), the
 * item-page render loop ({slugPrefix}/{slug}.html at outputPathPrefix "../"),
 * the "../assets/" depth rewrite, sitemap/robots item URLs, and manifest.collections.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionItemExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "coll-export-uuid";
const PROJECT_FOLDER = "coll-export-project";
const SITE_URL = "https://collections.example.com";

const {
  storage,
  scope,
  getProjectDir,
  PUBLISH_DIR,
  runExport,
  latestExportDir,
  resetExports,
  seedProjectScaffold,
  cleanup,
} = await createExportHarness({
  rootPrefix: "widgetizer-coll-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE_URL,
  projectName: "Collection Export Project",
  siteTitle: "Coll Export Site",
  theme: "__coll_export_theme__",
});

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  icon: "Newspaper",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "richtext", id: "body", label: "Body" },
  ],
};

// Item template: references item fields + a raw /uploads/ path to exercise the
// "../" depth rewrite at the item's one-level-deep output location.
const NEWS_TEMPLATE = `<article class="news-item">
  <h1>{{ item.settings.title }}</h1>
  <div class="body">{{ item.settings.body | raw }}</div>
  <img src="/uploads/images/banner.jpg" alt="">
</article>`;

const newsItem = (slug, title, created) => ({
  id: slug,
  uuid: `u-${slug}`,
  slug,
  schemaVersion: 1,
  created,
  updated: created,
  settings: { title, body: `<p>Body of ${title}</p>` },
});

before(async () => {
  await seedProjectScaffold();
});

after(async () => {
  await cleanup();
});

describe("collection item-page export — happy path", () => {
  before(async () => {
    await resetExports();
    // Fresh news collection: schema + template + two valid items.
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
    await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
    await storage.write(scope, "collections/news/alpha.json", JSON.stringify(newsItem("alpha", "Alpha", "2026-01-02T00:00:00.000Z")));
    await storage.write(scope, "collections/news/bravo.json", JSON.stringify(newsItem("bravo", "Bravo", "2026-01-03T00:00:00.000Z")));
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  });

  it("writes each item to {slugPrefix}/{slug}.html", async () => {
    const dir = latestExportDir();
    assert.ok(await fs.pathExists(path.join(dir, "news", "alpha.html")), "news/alpha.html should exist");
    assert.ok(await fs.pathExists(path.join(dir, "news", "bravo.html")), "news/bravo.html should exist");
  });

  it("renders the item template against item data", async () => {
    const dir = latestExportDir();
    const html = await fs.readFile(path.join(dir, "news", "alpha.html"), "utf8");
    assert.ok(html.includes("<h1>Alpha</h1>"), html);
    assert.ok(html.includes("Body of Alpha"), html);
  });

  it("rewrites /uploads/ paths to ../assets/ at the item's depth", async () => {
    const dir = latestExportDir();
    const html = await fs.readFile(path.join(dir, "news", "alpha.html"), "utf8");
    assert.ok(html.includes('src="../assets/images/banner.jpg"'), html);
    assert.ok(!html.includes("/uploads/images/"), "raw storage path must not survive");
  });

  it("applies the collection/item body class exactly, with no leaked page-{slug}", async () => {
    const dir = latestExportDir();
    const html = await fs.readFile(path.join(dir, "news", "alpha.html"), "utf8");
    // Exact match: the item page must carry ONLY its collection/item hooks. The
    // page-{slug} default (here "page-news/alpha") must be overridden, not appended.
    const bodyClass = html.match(/<body class="([^"]*)"/)?.[1];
    assert.equal(bodyClass, "collection-news item-alpha", html);
    assert.ok(!html.includes("page-news"), "the page-{slug} index class must not leak onto item pages");
  });

  it("includes the item easter egg + page title", async () => {
    const dir = latestExportDir();
    const html = await fs.readFile(path.join(dir, "news", "alpha.html"), "utf8");
    assert.ok(html.includes("Made with Widgetizer"), "item HTML should carry the easter egg");
    // {% seo %} emits the item's title (itemPageData.name) with the site title appended.
    assert.ok(html.includes("<title>Alpha - Coll Export Site</title>"), html);
  });

  it("adds collection item URLs to sitemap.xml (grouped after pages)", async () => {
    const dir = latestExportDir();
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`${SITE_URL}/news/alpha.html`), sitemap);
    assert.ok(sitemap.includes(`${SITE_URL}/news/bravo.html`), sitemap);
  });

  it("records collections in manifest.json", async () => {
    const dir = latestExportDir();
    const manifest = await fs.readJson(path.join(dir, "manifest.json"));
    assert.ok(Array.isArray(manifest.collections), "manifest.collections should be an array");
    const news = manifest.collections.find((c) => c.type === "news");
    assert.ok(news, "news collection should be in manifest");
    assert.equal(news.itemPages, true);
    assert.equal(news.itemCount, 2);
  });

  it("generates item .md files when exportMarkdown is true", async () => {
    await resetExports();
    const res = await runExport({ exportMarkdown: true });
    assert.equal(res._status, 200, JSON.stringify(res._json));
    const dir = latestExportDir();
    assert.ok(await fs.pathExists(path.join(dir, "news", "alpha.md")), "news/alpha.md should exist");
    const md = await fs.readFile(path.join(dir, "news", "alpha.md"), "utf8");
    assert.ok(md.includes("collection: news"), md);
    assert.ok(md.includes("title: Alpha"), md);
  });
});

describe("collection item-page export — fail-fast validation", () => {
  it("blocks the export with 400 when an item is invalid (and writes nothing)", async () => {
    await resetExports();
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
    await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
    await storage.write(scope, "collections/news/ok.json", JSON.stringify(newsItem("ok", "OK", "2026-01-02T00:00:00.000Z")));
    // Invalid: required `title` empty.
    await storage.write(scope, "collections/news/broken.json", JSON.stringify(newsItem("broken", "", "2026-01-03T00:00:00.000Z")));

    const res = await runExport();
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.ok(/collection item/i.test(res._json.error), res._json.error);
    // No output directory should have been created (validation precedes disk writes).
    assert.ok(!(await fs.pathExists(path.join(PUBLISH_DIR, `${PROJECT_FOLDER}-v1`))), "no partial export dir on a blocked export");
  });

  it("blocks the export with 400 when a hasItemPages collection has valid items but no template", async () => {
    await resetExports();
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
    // No template.liquid written.
    await storage.write(scope, "collections/news/alpha.json", JSON.stringify(newsItem("alpha", "Alpha", "2026-01-02T00:00:00.000Z")));

    const res = await runExport();
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.ok(/template/i.test(res._json.error), res._json.error);
  });
});
