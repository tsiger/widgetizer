/**
 * Clean URLs end-to-end export test suite.
 *
 * Drives the real `exportProject` controller over one fixture project twice —
 * with the project's `cleanUrls` flag off and on — and asserts the emitted
 * link shapes across every uuid-resolved pipeline at once: the header menu
 * (`renderWidget` → `menuResolver`), a link setting and richtext body
 * (`resolveWidgetPageLinks` / `richtextLinks`), a collection listing
 * (`| collection` → `renderingService`), the item pages rendered at depth
 * "../" (`renderCollectionItemPage`), and sitemap/canonical agreement.
 *
 * Run with: node --test packages/builder-server/src/tests/cleanUrlsExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "node:url";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "clean-urls-export-uuid";
const PROJECT_FOLDER = "clean-urls-export-project";
const SITE_URL = "https://clean.example.com";

const {
  storage,
  scope,
  projectRepo,
  getProjectDir,
  getProjectPagesDir,
  getProjectMenusDir,
  runExport,
  latestExportDir,
  resetExports,
  seedProjectScaffold,
  cleanup,
} = await createExportHarness({
  rootPrefix: "widgetizer-clean-urls-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE_URL,
  projectName: "Clean URLs Export Project",
  siteTitle: "Clean URLs Site",
  theme: "__clean_urls_export_theme__",
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

const NEWS_TEMPLATE = `<article class="news-item">
  <h1>{{ item.settings.title }}</h1>
  <div class="body">{{ item.settings.body | raw }}</div>
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

// Fixture on top of seedProjectScaffold(): a menu, a header widget that renders
// it, an About page with a link + richtext + listing widget, and the news
// collection.
const MENU = {
  uuid: "m-main",
  name: "Main",
  items: [
    { id: "1", label: "Home", link: "index.html", pageUuid: "p-index" },
    { id: "2", label: "About", link: "about.html", pageUuid: "p-about" },
    { id: "3", label: "Alpha", link: "news/alpha.html", collectionItemUuid: "u-alpha", collectionType: "news" },
    { id: "4", label: "Typed", link: "contact.html" },
  ],
};
// The global header widget always renders from widgets/global/header (its type
// is forced to "header" when the global widget JSON is read), so the nav
// template lives there rather than under a named theme widget.
const NAV_WIDGET_SCHEMA = { type: "header", settings: [{ type: "menu", id: "nav" }] };
const NAV_TEMPLATE = `<nav>{% for i in widget.settings.nav.items %}<a href="{{ i.link }}">{{ i.label }}</a>{% endfor %}</nav>`;
const MIX_WIDGET_SCHEMA = { type: "mix", settings: [{ type: "link", id: "cta" }, { type: "richtext", id: "body" }] };
const MIX_TEMPLATE =
  `<a class="cta" href="{{ widget.settings.cta.href }}">cta</a>` +
  `<div class="body">{{ widget.settings.body | raw }}</div>` +
  `{% assign items = 'news' | collection %}{% for i in items %}<a class="list" href="{{ i.url }}">{{ i.slug }}</a>{% endfor %}`;

async function seedLinkFixture() {
  const projectDir = getProjectDir(PROJECT_FOLDER);
  const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(path.join(getProjectMenusDir(PROJECT_FOLDER), "main.json"), JSON.stringify(MENU));
  await fs.outputFile(path.join(projectDir, "widgets", "global", "header", "widget.liquid"), NAV_TEMPLATE);
  await fs.outputFile(path.join(projectDir, "widgets", "global", "header", "schema.json"), JSON.stringify(NAV_WIDGET_SCHEMA));
  await fs.outputFile(path.join(projectDir, "widgets", "mix", "widget.liquid"), MIX_TEMPLATE);
  await fs.outputFile(path.join(projectDir, "widgets", "mix", "schema.json"), JSON.stringify(MIX_WIDGET_SCHEMA));
  await fs.writeFile(path.join(pagesDir, "global", "header.json"), JSON.stringify({ type: "header", settings: { nav: "m-main" } }));
  await fs.writeFile(
    path.join(pagesDir, "about.json"),
    JSON.stringify({
      name: "About", slug: "about", uuid: "p-about", seo: { title: "About" },
      widgets: { w1: { type: "mix", settings: {
        cta: { pageUuid: "p-index", href: "index.html", text: "Home", target: "_self" },
        body: `<p><a href="stale.html" data-page-uuid="p-about">self</a> <a href="x.html" data-collection-item-uuid="u-alpha">alpha</a></p>`,
      } } },
      widgetsOrder: ["w1"],
    }),
  );
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
  await storage.write(scope, "collections/news/alpha.json", JSON.stringify(newsItem("alpha", "Alpha", "2026-01-02T00:00:00.000Z")));
}

// The export prettifies its HTML, so a long tag run can be wrapped across lines
// (`</a\n><a …`) and void elements come back XHTML-style (`<link … />`).
// Collapsing whitespace runs, the whitespace that hugs a tag's angle brackets,
// and the self-closing slash puts the markup back into the single-line HTML
// shape the link/canonical assertions below match as literal strings.
const compact = (html) =>
  html
    .replace(/\s+/g, " ")
    .replace(/\s+>/g, ">")
    .replace(/<\s+/g, "<")
    .replace(/\s*\/>/g, ">");

async function readCompact(...segments) {
  return compact(await fs.readFile(path.join(...segments), "utf8"));
}

before(async () => {
  await seedProjectScaffold();
  await seedLinkFixture();
});

after(async () => {
  await cleanup();
});

describe("export — Clean URLs ON", () => {
  let dir;
  before(async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: true });
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    dir = latestExportDir();
  });

  it("root page: menu, link setting, richtext and listing hrefs are extensionless; typed link untouched", async () => {
    const html = await readCompact(dir, "about.html");
    assert.ok(html.includes('<a href="./">Home</a>'), html);
    assert.ok(html.includes('<a href="about">About</a>'), html);
    assert.ok(html.includes('<a href="news/alpha">Alpha</a>'), html);
    assert.ok(html.includes('<a href="contact.html">Typed</a>'), html);
    assert.ok(html.includes('class="cta" href="./"'), html);
    assert.ok(html.includes('href="about" data-page-uuid="p-about"'), html);
    assert.ok(html.includes('href="news/alpha" data-collection-item-uuid="u-alpha"'), html);
    assert.ok(html.includes('class="list" href="news/alpha"'), html);
  });

  it("item page: the same header emits ../ shapes", async () => {
    const html = await readCompact(dir, "news", "alpha.html");
    assert.ok(html.includes('<a href="../">Home</a>'), html);
    assert.ok(html.includes('<a href="../about">About</a>'), html);
    assert.ok(html.includes('<a href="../news/alpha">Alpha</a>'), html);
    assert.ok(html.includes('<a href="../contact.html">Typed</a>'), html);
  });

  it("sitemap and canonicals agree with the links; file names keep .html", async () => {
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`${SITE_URL}/about`) && !sitemap.includes("about.html"), sitemap);
    assert.ok(sitemap.includes(`${SITE_URL}/news/alpha`) && !sitemap.includes("alpha.html"), sitemap);
    const about = await readCompact(dir, "about.html");
    assert.ok(about.includes(`<link rel="canonical" href="${SITE_URL}/about">`), about);
    assert.ok(await fs.pathExists(path.join(dir, "about.html")));
    assert.ok(await fs.pathExists(path.join(dir, "news", "alpha.html")));
  });
});

describe("export — Clean URLs OFF (unchanged)", () => {
  let dir;
  before(async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    dir = latestExportDir();
  });

  it("every href keeps .html", async () => {
    const html = await readCompact(dir, "about.html");
    assert.ok(html.includes('<a href="index.html">Home</a>'), html);
    assert.ok(html.includes('<a href="about">') === false, html);
    assert.ok(html.includes('<a href="about.html">About</a>'), html);
    assert.ok(html.includes('<a href="news/alpha.html">Alpha</a>'), html);
    assert.ok(html.includes('class="cta" href="index.html"'), html);
    assert.ok(html.includes('class="list" href="news/alpha.html"'), html);
    const item = await readCompact(dir, "news", "alpha.html");
    assert.ok(item.includes('<a href="../index.html">Home</a>'), item);
  });

  it("richtext page and item links keep .html, uuid attributes intact", async () => {
    const html = await readCompact(dir, "about.html");
    assert.ok(html.includes('href="about.html" data-page-uuid="p-about"'), html);
    assert.ok(html.includes('href="news/alpha.html" data-collection-item-uuid="u-alpha"'), html);
  });

  it("sitemap and canonicals carry the .html shapes", async () => {
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`<loc>${SITE_URL}/about.html</loc>`), sitemap);
    assert.ok(sitemap.includes(`<loc>${SITE_URL}/news/alpha.html</loc>`), sitemap);
    assert.ok(sitemap.includes(`<loc>${SITE_URL}/</loc>`), sitemap);
    assert.ok(!sitemap.includes(`<loc>${SITE_URL}/about</loc>`), sitemap);
    assert.ok(!sitemap.includes(`<loc>${SITE_URL}/news/alpha</loc>`), sitemap);
    const about = await readCompact(dir, "about.html");
    assert.ok(about.includes(`<link rel="canonical" href="${SITE_URL}/about.html">`), about);
    const item = await readCompact(dir, "news", "alpha.html");
    assert.ok(item.includes(`<link rel="canonical" href="${SITE_URL}/news/alpha.html">`), item);
  });
});

describe("export — a Clean URLs toggle mid-export does not split the bundle", () => {
  // The export snapshots the project row once, before any storage call, and
  // every later read of the flag must come from that snapshot. This wrapper
  // flips the row on the first storage call the controller makes (after the
  // snapshot, before the sitemap and before any page renders), so a bundle
  // that re-reads the row anywhere would come out mixed: sitemap ON, links OFF.
  let dir;
  before(async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: true });
    let flipped = false;
    const flippingStorage = new Proxy(storage, {
      get(target, prop) {
        const value = target[prop];
        if (typeof value !== "function") return value;
        return (...args) => {
          if (!flipped) {
            flipped = true;
            projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });
          }
          return value.apply(target, args);
        };
      },
    });
    const res = await runExport({}, { storage: flippingStorage });
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    assert.equal(flipped, true, "the wrapper must have flipped the row during the export");
    dir = latestExportDir();
  });

  after(() => {
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });
  });

  it("links, canonicals and sitemap all carry the flag the export started with", async () => {
    const about = await readCompact(dir, "about.html");
    assert.ok(about.includes('<a href="about">About</a>'), about);
    assert.ok(about.includes('class="cta" href="./"'), about);
    assert.ok(about.includes('class="list" href="news/alpha"'), about);
    assert.ok(about.includes(`<link rel="canonical" href="${SITE_URL}/about">`), about);
    const item = await readCompact(dir, "news", "alpha.html");
    assert.ok(item.includes('<a href="../about">About</a>'), item);
    assert.ok(item.includes(`<link rel="canonical" href="${SITE_URL}/news/alpha">`), item);
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`<loc>${SITE_URL}/about</loc>`), sitemap);
  });
});

// The arch theme's header logo is a hand-written Liquid href (no uuid to
// resolve), so it decides the home-link shape itself from `globals.cleanUrls`.
// Render the REAL theme template through the export to pin that decision at
// both depths under both flag values.
describe("export — arch header logo home link", () => {
  const ARCH_HEADER_DIR = fileURLToPath(new URL("../../../../themes/arch/widgets/global/header/", import.meta.url));
  const headerDir = () => path.join(getProjectDir(PROJECT_FOLDER), "widgets", "global", "header");

  before(async () => {
    await fs.copy(path.join(ARCH_HEADER_DIR, "widget.liquid"), path.join(headerDir(), "widget.liquid"));
    await fs.copy(path.join(ARCH_HEADER_DIR, "schema.json"), path.join(headerDir(), "schema.json"));
    await fs.writeFile(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "global", "header.json"),
      JSON.stringify({ type: "header", settings: { headerNavigation: "m-main", logoText: "Arch" } }),
    );
  });

  after(async () => {
    // Put the suite's own nav header back for anything that runs after this file.
    await fs.outputFile(path.join(headerDir(), "widget.liquid"), NAV_TEMPLATE);
    await fs.outputFile(path.join(headerDir(), "schema.json"), JSON.stringify(NAV_WIDGET_SCHEMA));
  });

  async function exportWith(cleanUrls) {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls });
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    return latestExportDir();
  }

  it("Clean URLs ON: ./ at the root, ../ from an item page", async () => {
    const dir = await exportWith(true);
    const about = await readCompact(dir, "about.html");
    assert.ok(about.includes('<a href="./" class="header-logo">'), about);
    const item = await readCompact(dir, "news", "alpha.html");
    assert.ok(item.includes('<a href="../" class="header-logo">'), item);
  });

  it("Clean URLs OFF: index.html at the root, ../index.html from an item page", async () => {
    const dir = await exportWith(false);
    const about = await readCompact(dir, "about.html");
    assert.ok(about.includes('<a href="index.html" class="header-logo">'), about);
    const item = await readCompact(dir, "news", "alpha.html");
    assert.ok(item.includes('<a href="../index.html" class="header-logo">'), item);
  });
});
