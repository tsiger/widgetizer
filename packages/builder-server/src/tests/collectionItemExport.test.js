/**
 * Collection item-page export test suite (spec Section 13).
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
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-coll-export-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

// Silence production console noise; failures still surface via assertions.
const _log = console.log;
const _warn = console.warn;
const _error = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath, getPublishDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { exportProject } = await import("../controllers/exportController.js");
const { closeDb, getDb } = await import("../db/index.js");
const exportRepo = await import("../db/repositories/exportRepository.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "coll-export-uuid";
const PROJECT_FOLDER = "coll-export-project";
const SITE_URL = "https://collections.example.com";
const PUBLISH_DIR = getPublishDir();

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

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

function mockReq({ params = {}, body = {} } = {}) {
  return {
    params,
    body,
    scope: { projectId: params.projectId, folderName: PROJECT_FOLDER, actor: scope.actor },
    adapters: { storage },
    app: { locals: {} },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    headersSent: false,
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; res.headersSent = true; return res; },
    setHeader() { return res; },
  };
  return res;
}

async function runExport(body = {}) {
  const res = mockRes();
  await exportProject(mockReq({ params: { projectId: PROJECT_ID }, body }), res);
  return res;
}

function latestExportDir() {
  const exports = exportRepo.getExports(PROJECT_ID);
  if (!exports.length) return null;
  const dir = exports[0].outputDir;
  return path.isAbsolute(dir) ? dir : path.join(PUBLISH_DIR, dir);
}

async function resetExports() {
  getDb().prepare("DELETE FROM exports").run();
  const entries = await fs.readdir(PUBLISH_DIR).catch(() => []);
  for (const e of entries) {
    if (e.startsWith(PROJECT_FOLDER)) await fs.remove(path.join(PUBLISH_DIR, e));
  }
}

// Write the project's renderable scaffold (DB row, layout, theme, index page).
async function seedProjectScaffold() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Collection Export Project",
        siteTitle: "Coll Export Site",
        theme: "__coll_export_theme__",
        themeVersion: "1.0.0",
        siteUrl: SITE_URL,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(pagesDir, "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "widgets"));

  await fs.outputFile(
    getProjectThemeJsonPath(PROJECT_FOLDER),
    JSON.stringify({ settings: { global: { general: [], colors: [] } } }, null, 2),
  );

  // Layout renders the page SEO title + main content; body class lets us assert
  // the collection/item body class flows through for item pages.
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>{% seo %}</head>` +
      `<body class="{{ body_class }}">{{ header | raw }}<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>`,
  );

  await fs.writeFile(
    path.join(pagesDir, "index.json"),
    JSON.stringify({ name: "Home", slug: "index", uuid: "p-index", seo: { title: "Home" }, widgets: {}, widgetsOrder: [] }),
  );
}

before(async () => {
  await seedProjectScaffold();
});

after(async () => {
  console.log = _log;
  console.warn = _warn;
  console.error = _error;
  closeDb();
  await fs.remove(TEST_ROOT);
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

  it("applies the collection/item body class — exactly, no leaked page-{slug} (TODO §15)", async () => {
    const dir = latestExportDir();
    const html = await fs.readFile(path.join(dir, "news", "alpha.html"), "utf8");
    // Exact match: the item page must carry ONLY its collection/item hooks. The
    // page-{slug} default (here "page-news/alpha") must be overridden, not appended
    // — a substring check (the pre-§15 assertion) passed even with the stray class.
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
