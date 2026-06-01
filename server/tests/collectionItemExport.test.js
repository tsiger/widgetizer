/**
 * Phase 19 — collection item-page export.
 *
 * Drives exportProjectToDir against isolated fixtures with a hasItemPages
 * collection and asserts: subdir creation, per-item globals isolation, body
 * class, page-shaped title/seo, depth-aware asset + /uploads + link prefixing,
 * easter egg, two-pass validation failure, and the missing-template error.
 *
 * Run with: node --test server/tests/collectionItemExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-citem-export-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const {
  getProjectDir,
  getProjectPagesDir,
  getProjectThemeJsonPath,
  getProjectCollectionSchemaPath,
  getProjectCollectionTemplatePath,
  getProjectCollectionItemPath,
  CORE_WIDGETS_DIR,
} = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { exportProjectToDir } = await import("../controllers/exportController.js");
const { closeDb } = await import("../db/index.js");

const SITE_URL = "https://items.example.com";

const LAYOUT = `<!DOCTYPE html>
<html>
<head>
{% header_assets %}
{% seo %}
</head>
<body class="{{ body_class }}">
{{ header | raw }}
<main>{{ main_content | raw }}</main>
{{ footer | raw }}
</body>
</html>`;

const PORTFOLIO_SCHEMA = {
  type: "portfolio",
  schemaVersion: 1,
  displayName: "Portfolio Item",
  displayNamePlural: "Portfolio",
  icon: "Briefcase",
  slugPrefix: "portfolio",
  hasItemPages: true,
  defaultSort: "manual",
  settings: [
    { type: "header", id: "content_header", label: "Content" },
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "image", id: "featured_image", label: "Image", usedAsOgImage: true },
    { type: "link", id: "external_url", label: "Link" },
    { type: "link", id: "dead_link", label: "Dead link" },
    { type: "text", id: "seo_title", label: "SEO title" },
  ],
};

// The item template enqueues a per-item stylesheet (to prove globals isolation),
// pulls a theme asset, prints the raw featured-image storage path, and renders
// two link fields.
const TEMPLATE = `<article>
  <h1>{{ item.settings.title }}</h1>
  {% if item.slug == "project-alpha" %}{% enqueue_style src: "alpha.css" %}{% else %}{% enqueue_style src: "beta.css" %}{% endif %}
  {% asset src: "item.css" %}
  <img class="feat" src="{{ item.settings.featured_image }}">
  <a class="ext" href="{{ item.settings.external_url.href }}">ext</a>
  <a class="dead" href="{{ item.settings.dead_link.href }}">dead</a>
</article>`;

async function seedProject(id, folder, { withTemplate = true, items } = {}) {
  const existing = (await projectRepo.readProjectsData()) || { projects: [] };
  const projects = (existing.projects || []).filter((p) => p.id !== id);
  projects.push({
    id,
    folderName: folder,
    name: `Item Export ${folder}`,
    siteTitle: "Items",
    theme: "__citem_theme__",
    themeVersion: "1.0.0",
    siteUrl: SITE_URL,
    created: new Date().toISOString(),
  });
  await projectRepo.writeProjectsData({ projects, activeProjectId: id });

  const projectDir = getProjectDir(folder);
  const pagesDir = getProjectPagesDir(folder);
  await fs.ensureDir(path.join(pagesDir, "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "assets"));
  await fs.outputFile(getProjectThemeJsonPath(folder), JSON.stringify({ settings: { global: {} } }, null, 2));
  await fs.writeFile(path.join(projectDir, "layout.liquid"), LAYOUT);

  // index homepage + an "about" page (link target for resolution).
  await fs.writeFile(
    path.join(pagesDir, "index.json"),
    JSON.stringify({ name: "Home", slug: "index", uuid: "uuid-index", widgets: {}, widgetsOrder: [] }),
  );
  await fs.writeFile(
    path.join(pagesDir, "about.json"),
    JSON.stringify({ name: "About", slug: "about", uuid: "uuid-about", widgets: {}, widgetsOrder: [] }),
  );

  await fs.outputFile(getProjectCollectionSchemaPath(folder, "portfolio"), JSON.stringify(PORTFOLIO_SCHEMA, null, 2));
  if (withTemplate) {
    await fs.writeFile(getProjectCollectionTemplatePath(folder, "portfolio"), TEMPLATE);
  }

  for (const item of items) {
    await fs.outputJson(getProjectCollectionItemPath(folder, "portfolio", item.slug), item);
  }

  await writeMediaFile(id, {
    files: [
      { id: `m1-${folder}`, filename: "featured.jpg", path: "/uploads/images/featured.jpg", type: "image/jpeg", usedIn: [] },
    ],
  });
}

const ALPHA = {
  id: "project-alpha",
  slug: "project-alpha",
  uuid: "uuid-alpha",
  created: "2025-01-01T00:00:00.000Z",
  updated: "2025-02-02T00:00:00.000Z",
  settings: {
    title: "Project Alpha",
    featured_image: "/uploads/images/featured.jpg",
    external_url: { pageUuid: "uuid-about", href: "", text: "", target: "_self" },
    dead_link: { pageUuid: "uuid-gone", href: "", text: "", target: "_self" },
    seo_title: "Alpha SEO",
  },
};
const BETA = {
  id: "project-beta",
  slug: "project-beta",
  uuid: "uuid-beta",
  created: "2025-01-03T00:00:00.000Z",
  updated: "2025-02-04T00:00:00.000Z",
  settings: { title: "Project Beta", featured_image: "", external_url: { href: "https://ext.com" }, dead_link: { href: "" } },
};

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  await fs.remove(path.join(CORE_WIDGETS_DIR, "__never__")); // no-op safety
});

// ---------------------------------------------------------------------------
describe("item-page export — happy path", () => {
  let outputDir;
  before(async () => {
    await seedProject("citem-uuid", "citem", { items: [ALPHA, BETA] });
    const result = await exportProjectToDir("citem-uuid");
    outputDir = result.outputDir;
  });

  it("creates the slugPrefix subdirectory and one HTML file per valid item", async () => {
    assert.ok(await fs.pathExists(path.join(outputDir, "portfolio", "project-alpha.html")));
    assert.ok(await fs.pathExists(path.join(outputDir, "portfolio", "project-beta.html")));
  });

  it("sets the collection/item body class (not page-...)", async () => {
    const html = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    assert.match(html, /<body class="collection-portfolio item-project-alpha">/);
    assert.doesNotMatch(html, /page-project-alpha/);
  });

  it("renders the page-shaped SEO title and absolute canonical/og:image", async () => {
    const html = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    assert.match(html, /<title>Alpha SEO - Items<\/title>/);
    assert.match(html, /rel="canonical" href="https:\/\/items\.example\.com\/portfolio\/project-alpha\.html"/);
    assert.match(html, /og:image" content="https:\/\/items\.example\.com\/assets\/images\/featured\.jpg"/);
  });

  it("prefixes the theme asset and rewrites the /uploads image at depth", async () => {
    const html = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    assert.match(html, /href="\.\.\/assets\/item\.css\?v=\d+"/);
    assert.match(html, /class="feat" src="\.\.\/assets\/images\/featured\.jpg"/);
    assert.doesNotMatch(html, /\/uploads\//);
  });

  it("resolves a pageUuid link to the prefixed slug and clears a dead link", async () => {
    const html = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    assert.match(html, /class="ext" href="\.\.\/about\.html"/);
    assert.match(html, /class="dead" href=""/);
  });

  it("isolates per-item enqueued assets (no bleed between items)", async () => {
    const alpha = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    const beta = await fs.readFile(path.join(outputDir, "portfolio", "project-beta.html"), "utf8");
    assert.match(alpha, /href="\.\.\/assets\/alpha\.css\?v=\d+"/);
    assert.doesNotMatch(alpha, /beta\.css/);
    assert.match(beta, /href="\.\.\/assets\/beta\.css\?v=\d+"/);
    assert.doesNotMatch(beta, /alpha\.css/);
  });

  it("includes the easter egg and ran the HTML formatter", async () => {
    const html = await fs.readFile(path.join(outputDir, "portfolio", "project-alpha.html"), "utf8");
    assert.match(html, /Made with Widgetizer/);
    assert.match(html, /<!doctype html>/i); // prettier lowercases the doctype
  });
});

// ---------------------------------------------------------------------------
describe("item-page export — two-pass validation", () => {
  it("fails the whole export with 400 + per-item errors when an item is invalid", async () => {
    const invalid = { id: "bad", slug: "bad", uuid: "uuid-bad", settings: { title: "" } }; // required title empty
    await seedProject("citem-bad-uuid", "citem-bad", { items: [ALPHA, invalid] });

    let thrown = null;
    try {
      await exportProjectToDir("citem-bad-uuid");
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, "export should throw");
    assert.equal(thrown.statusCode, 400);
    assert.ok(Array.isArray(thrown.validationErrors));
    const badEntry = thrown.validationErrors.find((e) => e.slug === "bad");
    assert.ok(badEntry, "should list the invalid item");
    assert.equal(badEntry.collection, "portfolio");
    assert.ok(badEntry.errors.some((e) => e.fieldId === "title"));

    // No HTML written for the collection.
    const outputDir = path.join(TEST_ROOT, "data", "publish", "citem-bad-v1");
    assert.ok(!(await fs.pathExists(path.join(outputDir, "portfolio", "bad.html"))));
    assert.ok(!(await fs.pathExists(path.join(outputDir, "portfolio", "project-alpha.html"))));
  });
});

// ---------------------------------------------------------------------------
describe("item-page export — missing template", () => {
  it("fails with a clear 400 when a hasItemPages collection has no template.liquid", async () => {
    await seedProject("citem-notpl-uuid", "citem-notpl", { withTemplate: false, items: [ALPHA] });

    let thrown = null;
    try {
      await exportProjectToDir("citem-notpl-uuid");
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, "export should throw");
    assert.equal(thrown.statusCode, 400);
    assert.match(thrown.message, /template\.liquid/);
  });
});
