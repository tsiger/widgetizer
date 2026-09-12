/**
 * Breadcrumbs end-to-end export test suite.
 *
 * Drives the real `exportProject` controller over a fixture with a parent chain
 * and a collection, and asserts what the core `breadcrumbs` snippet emits into
 * the exported HTML: trail shape, depth-correct hrefs at both Clean URLs values,
 * and the item trail found through the widget schema's `collection` declaration.
 *
 * The unit-level rules live in packages/core/src/utils/__tests__/breadcrumbs.test.js;
 * this pins that the engine stamps the trail where the layout and the header can
 * both see it, which no unit test can prove.
 *
 * Run with: node --test packages/builder-server/src/tests/breadcrumbsExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "breadcrumbs-export-uuid";
const PROJECT_FOLDER = "breadcrumbs-export-project";

const {
  storage,
  scope,
  projectRepo,
  getProjectDir,
  getProjectPagesDir,
  runExport,
  latestExportDir,
  resetExports,
  seedProjectScaffold,
  cleanup,
} = await createExportHarness({
  rootPrefix: "widgetizer-breadcrumbs-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: "https://breadcrumbs.example.com",
  projectName: "Breadcrumbs Export Project",
  siteTitle: "Breadcrumbs Site",
  theme: "__breadcrumbs_export_theme__",
});

// Imported after the harness has pointed DATA_ROOT at its temp dir: a static
// import would bind config.js to the real data directory.
const { renderWidget } = await import("../services/renderingService.js");

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  icon: "Newspaper",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

// The listing widget declares what it lists — the whole point of the schema
// `collection` block, and the only way core can find an item's parent page.
const NEWS_GRID_SCHEMA = { type: "news-grid", collection: { type: "news" }, settings: [] };
const NEWS_GRID_TEMPLATE = `{% assign items = 'news' | collection %}<div class="grid">{{ items.size }}</div>`;

const page = (slug, name, extra = {}) => ({
  name,
  slug,
  id: slug,
  uuid: `p-${slug}`,
  seo: { title: name },
  widgets: {},
  widgetsOrder: [],
  ...extra,
});

async function seedFixture() {
  const projectDir = getProjectDir(PROJECT_FOLDER);
  const pagesDir = getProjectPagesDir(PROJECT_FOLDER);

  // The layout draws the trail through the core snippet, as a theme would.
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><title>{{ page.seo.title }}</title></head><body>` +
      `{% render 'breadcrumbs', class_nav: 'bc', class_link: 'crumb' %}` +
      `<main>{{ main_content | raw }}</main></body></html>`,
  );

  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "schema.json"), JSON.stringify(NEWS_GRID_SCHEMA));
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "widget.liquid"), NEWS_GRID_TEMPLATE);

  // about → team → alice, plus a blog page carrying the listing widget.
  await fs.writeFile(path.join(pagesDir, "about.json"), JSON.stringify(page("about", "About Us")));
  await fs.writeFile(
    path.join(pagesDir, "team.json"),
    JSON.stringify(page("team", "Our Team", { parentPageUuid: "p-about" })),
  );
  await fs.writeFile(
    path.join(pagesDir, "alice.json"),
    JSON.stringify(page("alice", "Alice", { parentPageUuid: "p-team" })),
  );
  await fs.writeFile(
    path.join(pagesDir, "blog.json"),
    JSON.stringify(
      page("blog", "Blog", { widgets: { w1: { type: "news-grid", settings: {} } }, widgetsOrder: ["w1"] }),
    ),
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(
    scope,
    "collection-types/news/template.liquid",
    `<article><h1>{{ item.settings.title }}</h1></article>`,
  );
  await storage.write(
    scope,
    "collections/news/alpha.json",
    JSON.stringify({
      id: "alpha",
      uuid: "u-alpha",
      slug: "alpha",
      schemaVersion: 1,
      created: "2026-01-02T00:00:00.000Z",
      updated: "2026-01-02T00:00:00.000Z",
      settings: { title: "Alpha Post" },
    }),
  );
}

const compact = (html) => html.replace(/\s+/g, " ").replace(/\s+>/g, ">").replace(/<\s+/g, "<");

async function read(...segments) {
  return compact(await fs.readFile(path.join(...segments), "utf8"));
}

/** Labels in order, from the rendered <nav class="bc">. */
function trailOf(html) {
  const nav = html.match(/<nav class="bc".*?<\/nav>/);
  if (!nav) return null;
  return [...nav[0].matchAll(/>([^<>]+)<\/(?:a|span)>/g)].map((m) => m[1].trim());
}

function hrefsOf(html) {
  const nav = html.match(/<nav class="bc".*?<\/nav>/);
  if (!nav) return null;
  return [...nav[0].matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
}

before(async () => {
  await seedProjectScaffold();
  await seedFixture();
});

after(async () => {
  await cleanup();
});

async function exportWith(cleanUrls) {
  await resetExports();
  projectRepo.updateProject(PROJECT_ID, { cleanUrls });
  const res = await runExport();
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  return latestExportDir();
}

describe("export — breadcrumbs, Clean URLs off", () => {
  let dir;
  before(async () => {
    dir = await exportWith(false);
  });

  it("renders nothing on the homepage", async () => {
    const html = await read(dir, "index.html");
    assert.equal(trailOf(html), null, html);
  });

  it("gives a page with no parent Home → page", async () => {
    const html = await read(dir, "about.html");
    assert.deepEqual(trailOf(html), ["Home", "About Us"]);
    assert.deepEqual(hrefsOf(html), ["index.html"]);
  });

  it("walks a parent chain and links every ancestor but the current page", async () => {
    const html = await read(dir, "alice.html");
    assert.deepEqual(trailOf(html), ["Home", "About Us", "Our Team", "Alice"]);
    assert.deepEqual(hrefsOf(html), ["index.html", "about.html", "team.html"]);
    assert.ok(html.includes('<span aria-current="page">Alice</span>'), html);
  });

  it("hangs a collection item under the page whose widget declares that collection", async () => {
    const html = await read(dir, "news", "alpha.html");
    assert.deepEqual(trailOf(html), ["Home", "Blog", "Alpha Post"]);
    // Depth: an item page sits one directory down, so ancestors need ../
    assert.deepEqual(hrefsOf(html), ["../index.html", "../blog.html"]);
  });
});

describe("export — breadcrumbs, Clean URLs on", () => {
  let dir;
  before(async () => {
    dir = await exportWith(true);
  });

  it("drops .html from every crumb href", async () => {
    const html = await read(dir, "alice.html");
    assert.deepEqual(trailOf(html), ["Home", "About Us", "Our Team", "Alice"]);
    assert.deepEqual(hrefsOf(html), ["./", "about", "team"]);
  });

  it("keeps the item trail correct at depth with the clean home link", async () => {
    const html = await read(dir, "news", "alpha.html");
    assert.deepEqual(trailOf(html), ["Home", "Blog", "Alpha Post"]);
    assert.deepEqual(hrefsOf(html), ["../", "../blog"]);
  });
});

// A project that sets no parents at all must still render a sane trail
// everywhere — that is the shape most sites will have on day one.
describe("export — breadcrumbs with no hierarchy set", () => {
  before(async () => {
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    await fs.writeFile(path.join(pagesDir, "team.json"), JSON.stringify(page("team", "Our Team")));
    await fs.writeFile(path.join(pagesDir, "alice.json"), JSON.stringify(page("alice", "Alice")));
  });

  it("falls back to Home → page once the parents are cleared", async () => {
    const dir = await exportWith(false);
    assert.deepEqual(trailOf(await read(dir, "alice.html")), ["Home", "Alice"]);
    assert.deepEqual(trailOf(await read(dir, "team.html")), ["Home", "Our Team"]);
    assert.equal(trailOf(await read(dir, "index.html")), null);
  });
});

// The preview morph re-renders one widget in isolation, knowing only the path of
// the page being previewed. A header drawing breadcrumbs must still get its
// trail — otherwise editing the header while previewing an item would blank it.
describe("preview morph — a widget rendered alone still gets the trail", () => {
  const HEADER = { type: "header", settings: {} };

  before(async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", "header", "schema.json"),
      JSON.stringify({ type: "header", settings: [] }),
    );
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", "header", "widget.liquid"),
      `<header>{% render 'breadcrumbs', class_nav: 'bc' %}</header>`,
    );
    // Restore the parent chain the "no hierarchy" suite above cleared.
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    await fs.writeFile(
      path.join(pagesDir, "team.json"),
      JSON.stringify(page("team", "Our Team", { parentPageUuid: "p-about" })),
    );
  });

  const morph = async (currentCanonicalPath) => {
    const sharedGlobals = { renderMode: "preview", currentCanonicalPath };
    const html = await renderWidget(PROJECT_ID, "header", HEADER, {}, "preview", sharedGlobals, null, {
      storage,
      scope,
    });
    return compact(html);
  };

  it("resolves a page path", async () => {
    assert.deepEqual(trailOf(await morph("team.html")), ["Home", "About Us", "Our Team"]);
  });

  it("resolves an item path, title included, from the path alone", async () => {
    assert.deepEqual(trailOf(await morph("news/alpha.html")), ["Home", "Blog", "Alpha Post"]);
  });

  it("renders nothing for the homepage or an unknown path", async () => {
    assert.equal(trailOf(await morph("index.html")), null);
    assert.equal(trailOf(await morph("does-not-exist.html")), null);
    assert.equal(trailOf(await morph("news/missing.html")), null);
  });
});

// Preview never pre-seeds Clean URLs the way export does — the engine stamps it
// from the project row on first use. The trail is cached on the first widget
// that asks for it, so building it before that stamp silently gave every
// preview crumb the .html shape regardless of the setting.
describe("preview — crumb hrefs follow the project's Clean URLs setting", () => {
  const HEADER = { type: "header", settings: {} };

  const morphHrefs = async (currentCanonicalPath) => {
    const sharedGlobals = { renderMode: "preview", currentCanonicalPath };
    const html = compact(
      await renderWidget(PROJECT_ID, "header", HEADER, {}, "preview", sharedGlobals, null, { storage, scope }),
    );
    return hrefsOf(html);
  };

  it("emits extensionless crumbs when Clean URLs is on", async () => {
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: true });
    assert.deepEqual(await morphHrefs("team.html"), ["./", "about"]);
    assert.deepEqual(await morphHrefs("news/alpha.html"), ["./", "blog"]);
  });

  it("emits .html crumbs when Clean URLs is off", async () => {
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });
    assert.deepEqual(await morphHrefs("team.html"), ["index.html", "about.html"]);
  });
});
