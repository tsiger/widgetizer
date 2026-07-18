/**
 * Depth-prefix export smoke test.
 *
 * Drives the REAL `exportProject` controller (so the inlined /uploads/ rewrites
 * and markdown-alternate <link> injection in exportController.js are exercised)
 * and asserts the whole publish-mode path chain in BOTH directions:
 *
 *   Gap 1 — a depth-1 collection item page (news/alpha.html, outputPathPrefix "../")
 *           carries the `../` prefix on EVERY emitted path form: asset URL, image
 *           src, placeholder, preload href + imagesrcset, favicon/apple/manifest,
 *           the /uploads/ → ../assets/ rewrite, and the markdown-alternate href.
 *   Gap 2 — the same layout at depth-0 (index.html) contains NO `../` (the depth
 *           machinery must never leak into root pages) — the absence guard, with
 *           the canonical un-prefixed forms asserted present for non-vacuity.
 *
 * These assertions protect the full depth/prefix contract for root pages and
 * nested item pages.
 *
 * Run with: node --test packages/builder-server/src/tests/depthRenderSmoke.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import sharp from "sharp";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-depth-smoke-test-${Date.now()}`);
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

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath, getProjectImagesDir, getPublishDir } =
  await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { exportProject } = await import("../controllers/exportController.js");
const { closeDb, getDb } = await import("../db/index.js");
const exportRepo = await import("../db/repositories/exportRepository.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "depth-smoke-uuid";
const PROJECT_FOLDER = "depth-smoke-project";
// Empty siteUrl keeps the markdown-alternate href RELATIVE (index.md / alpha.md)
// and avoids absolute sitemap/canonical URLs in the asserted HTML.
const SITE_URL = "";
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

// Item template carries the raw /uploads/ path (form 6) plus the item-side
// enqueue_preload / image / placeholder tags.
const NEWS_TEMPLATE = `<article class="news-item">
  <h1>{{ item.settings.title }}</h1>
  <div class="body">{{ item.settings.body | raw }}</div>
  <img src="/uploads/images/banner.jpg" alt="">
  {% enqueue_preload src: "hero.jpg", as: "image", imagesrcset: "a.jpg 320w, b.jpg 640w" %}
  {% image src: "hero.jpg" %}
  {% placeholder_image %}
</article>`;

// Shared layout: every page (depth-0 index + depth-1 item) renders these head/body
// path forms, so both directions exercise the full chain. enqueue_preload must sit
// ABOVE header_assets so the preload is enqueued before it is emitted.
const LAYOUT =
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>\n` +
  `{% enqueue_preload src: "hero.jpg", as: "image", imagesrcset: "a.jpg 320w, b.jpg 640w" %}\n` +
  `{% asset src: "base.css" %}\n` +
  `{% if site_icons.primaryIconHref != blank %}<link rel="icon" href="{{ site_icons.primaryIconHref }}"` +
  `{% if site_icons.primaryIconType != blank %} type="{{ site_icons.primaryIconType }}"{% endif %}` +
  `{% if site_icons.primaryIconSizes != blank %} sizes="{{ site_icons.primaryIconSizes }}"{% endif %}>{% endif %}\n` +
  `{% if site_icons.legacyIconHref != blank and site_icons.legacyIconHref != site_icons.primaryIconHref %}` +
  `<link rel="icon" href="{{ site_icons.legacyIconHref }}" type="image/png" sizes="32x32">{% endif %}\n` +
  `{% if site_icons.serpIconHref != blank %}<link rel="icon" href="{{ site_icons.serpIconHref }}" type="image/png" sizes="192x192">{% endif %}\n` +
  `{% if site_icons.appleTouchIconHref != blank %}<link rel="apple-touch-icon" href="{{ site_icons.appleTouchIconHref }}" sizes="180x180">{% endif %}\n` +
  `{% if site_icons.manifestHref != blank %}<link rel="manifest" href="{{ site_icons.manifestHref }}">{% endif %}\n` +
  `{% header_assets %}\n` +
  `</head><body class="{{ body_class }}">{{ header | raw }}<main>\n` +
  `{{ main_content | raw }}\n` +
  `{% image src: "hero.jpg" %}\n` +
  `{% placeholder_image %}\n` +
  `</main>{{ footer | raw }}</body></html>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3498db"/></svg>`;

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

async function seedProjectScaffold() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Depth Smoke Project",
        siteTitle: "Depth Smoke Site",
        theme: "__depth_theme__",
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
  const imagesDir = getProjectImagesDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(pagesDir, "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "widgets"));
  await fs.ensureDir(imagesDir);

  // theme.json with a configured favicon → generateExportSiteIcons populates site_icons.
  await fs.outputFile(
    getProjectThemeJsonPath(PROJECT_FOLDER),
    JSON.stringify({ settings: { global: { general: [{ id: "favicon", value: "favicon.svg" }], colors: [] } } }, null, 2),
  );

  await fs.writeFile(path.join(projectDir, "layout.liquid"), LAYOUT);

  await fs.writeFile(
    path.join(pagesDir, "index.json"),
    JSON.stringify({ name: "Home", slug: "index", uuid: "p-index", seo: { title: "Home" }, widgets: {}, widgetsOrder: [] }),
  );

  // Favicon source (SVG) + a real hero image (Sharp) + a banner placeholder so the
  // asset copy + site-icon generation + image tag all resolve.
  await fs.writeFile(path.join(imagesDir, "favicon.svg"), FAVICON_SVG);
  await fs.writeFile(path.join(imagesDir, "hero.jpg"), await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 100, g: 150, b: 200 } },
  }).jpeg().toBuffer());
  await fs.writeFile(path.join(imagesDir, "banner.jpg"), await sharp({
    create: { width: 120, height: 90, channels: 3, background: { r: 200, g: 100, b: 50 } },
  }).jpeg().toBuffer());

  // Media metadata: hero (no `sizes` → image tag falls back to path basename) + favicon.
  await writeMediaFile(PROJECT_ID, {
    files: [
      { id: "hero", filename: "hero.jpg", type: "image/jpeg", path: "/uploads/images/hero.jpg", width: 200, height: 150, usedIn: ["news/alpha"] },
      { id: "fav", filename: "favicon.svg", type: "image/svg+xml", path: "/uploads/images/favicon.svg", usedIn: ["theme"] },
    ],
  });
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

// ============================================================================
// Gap 1 — depth-1 item page carries the ../ prefix on every path form
// ============================================================================

describe("depth-1 item render — full path chain is prefixed", () => {
  let html;

  before(async () => {
    await resetExports();
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
    await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
    await storage.write(scope, "collections/news/alpha.json", JSON.stringify(newsItem("alpha", "Alpha", "2026-01-02T00:00:00.000Z")));
    const res = await runExport({ exportMarkdown: true });
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    html = await fs.readFile(path.join(latestExportDir(), "news", "alpha.html"), "utf8");
  });

  it("writes the item page + its markdown sibling", async () => {
    const dir = latestExportDir();
    assert.ok(await fs.pathExists(path.join(dir, "news", "alpha.html")), "news/alpha.html should exist");
    assert.ok(await fs.pathExists(path.join(dir, "news", "alpha.md")), "news/alpha.md should exist");
  });

  it("asset-tag URL is prefixed", () => {
    assert.match(html, /href="\.\.\/assets\/base\.css(\?v=\d+)?"/);
  });

  it("image src is prefixed (and lazy)", () => {
    assert.match(html, /<img[^>]+src="\.\.\/assets\/images\/hero\.jpg"/);
    assert.match(html, /loading="lazy"/);
  });

  it("placeholder image is prefixed", () => {
    assert.match(html, /src="\.\.\/assets\/placeholder\.svg"/);
  });

  it("preload href + imagesrcset are prefixed", () => {
    // Bare relative src "hero.jpg" → prefixed to ../hero.jpg (NOT ../assets/...).
    assert.match(html, /<link rel="preload" href="\.\.\/hero\.jpg"/);
    assert.match(html, /imagesrcset="\.\.\/a\.jpg 320w, \.\.\/b\.jpg 640w"/);
  });

  it("favicon / apple-touch / manifest refs are prefixed", () => {
    assert.match(html, /<link rel="icon" href="\.\.\/favicon\.svg"/);
    assert.match(html, /href="\.\.\/favicon-32\.png"/);
    assert.match(html, /href="\.\.\/icon-192\.png" type="image\/png" sizes="192x192"/);
    assert.match(html, /<link rel="apple-touch-icon" href="\.\.\/apple-touch-icon\.png"/);
    assert.match(html, /<link rel="manifest" href="\.\.\/site\.webmanifest"/);
  });

  it("/uploads storage path is rewritten with the depth prefix", () => {
    assert.ok(html.includes('src="../assets/images/banner.jpg"'), html);
    assert.doesNotMatch(html, /\/uploads\//);
  });

  it("markdown-alternate href is the relative same-dir form", () => {
    assert.match(html, /<link rel="alternate" type="text\/markdown" href="alpha\.md">/);
  });
});

// ============================================================================
// Gap 2 — depth-0 root page never leaks ../ (no-leak guard + non-vacuity)
// ============================================================================

describe("depth-0 root render — no ../ leakage", () => {
  let html;

  before(async () => {
    await resetExports();
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
    const res = await runExport({ exportMarkdown: true });
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    html = await fs.readFile(path.join(latestExportDir(), "index.html"), "utf8");
  });

  it("contains no ../ depth prefix anywhere (the no-leak guard)", () => {
    assert.doesNotMatch(html, /\.\.\//, "the depth machinery must not leak ../ into root pages");
  });

  it("emits the canonical un-prefixed asset / image / placeholder forms (non-vacuity)", () => {
    assert.match(html, /href="assets\/base\.css(\?v=\d+)?"/);
    assert.match(html, /<img[^>]+src="assets\/images\/hero\.jpg"/);
    assert.match(html, /src="assets\/placeholder\.svg"/);
  });

  it("emits the un-prefixed preload + icon forms (non-vacuity)", () => {
    assert.match(html, /<link rel="preload" href="hero\.jpg"/);
    assert.match(html, /imagesrcset="a\.jpg 320w, b\.jpg 640w"/);
    assert.match(html, /<link rel="icon" href="favicon\.svg"/);
    assert.match(html, /href="favicon-32\.png"/);
    assert.match(html, /href="icon-192\.png" type="image\/png" sizes="192x192"/);
    assert.match(html, /<link rel="apple-touch-icon" href="apple-touch-icon\.png"/);
    assert.match(html, /<link rel="manifest" href="site\.webmanifest"/);
  });

  it("emits the relative markdown-alternate href and leaks no raw /uploads/", () => {
    assert.match(html, /<link rel="alternate" type="text\/markdown" href="index\.md">/);
    assert.doesNotMatch(html, /\/uploads\//);
  });
});
