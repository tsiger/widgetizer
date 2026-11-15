/**
 * Export of the not-found page: a page at address `404`, written as `404.html`
 * (`el/404.html`) and shown by static hosts at whatever address was missing.
 *
 * Its links are root-relative under the Site URL's path, so they work at any
 * depth; it is always noindex, names no canonical, and gets no paginated copies,
 * no pager and no Markdown twin.
 *
 * Run with: node --test packages/builder-server/src/tests/notFoundExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "not-found-export-uuid";
const PROJECT_FOLDER = "not-found-export-project";
const SITE = "https://user.github.io/repo/";

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
  rootPrefix: "widgetizer-not-found-export",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE,
  projectName: "Not Found Export",
  siteTitle: "Site",
  theme: "__not_found_export_theme__",
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
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

const GRID_SCHEMA = {
  type: "news-grid",
  collection: { type: "news", perPageSetting: "limit" },
  settings: [{ type: "number", id: "limit", default: 5 }],
};

const GRID_TEMPLATE =
  `{% assign items = 'news' | collection: limit: widget.settings.limit %}` +
  `<ul class="items">{% for item in items %}<li>{{ item.settings.title }}</li>{% endfor %}</ul>` +
  `{% if pagination %}<nav class="pager"></nav>{% endif %}`;

const LAYOUT =
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>` +
  `{% asset src: "style.css" %}{% seo %}</head><body>` +
  `<a class="skip" href="#main-content">Skip</a>` +
  `<a class="home" href="{{ 'index' | page_url }}">Home</a>` +
  `<a class="about" href="{{ 'about' | page_url }}">About</a>` +
  `<main id="main-content">{{ main_content | raw }}</main></body></html>`;

const page = (slug, name, extra = {}) => ({
  id: slug,
  uuid: `p-${extra.language || "en"}-${slug}`,
  slug,
  name,
  seo: { title: name },
  widgets: {},
  widgetsOrder: [],
  ...extra,
});

const writePage = async (language, slug, name, extra = {}) => {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(path.join(dir, `${slug}.json`), JSON.stringify(page(slug, name, { ...extra, language })));
};

const grid = { widgets: { w1: { type: "news-grid", settings: { limit: 5, paginate: true } } }, widgetsOrder: ["w1"] };

async function seedFixture() {
  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.writeFile(path.join(projectDir, "layout.liquid"), LAYOUT);
  await fs.outputFile(path.join(projectDir, "assets", "style.css"), "body{}");
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "schema.json"), JSON.stringify(GRID_SCHEMA));
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "widget.liquid"), GRID_TEMPLATE);

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", `<article>{{ item.settings.title }}</article>`);
  for (let index = 0; index < 23; index += 1) {
    const slug = `story-${String(index + 1).padStart(2, "0")}`;
    const created = new Date(Date.UTC(2026, 0, 1) - index * 86400000).toISOString();
    await storage.write(
      scope,
      `collections/news/${slug}.json`,
      JSON.stringify({ id: slug, uuid: `u-${slug}`, slug, schemaVersion: 1, created, updated: created, settings: { title: slug } }),
    );
  }

  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
  await writePage("", "index", "Home");
  await writePage("", "about", "About");
  await writePage("", "404", "Page not found", { ...grid, seo: { title: "Page not found", robots: "index,nofollow" } });
  await writePage("el", "index", "Arxiki");
  await writePage("el", "about", "Sxetika", { uuid: "p-el-about", translationGroupId: "p-en-about" });
  await writePage("el", "404", "Den vrethike", { uuid: "p-el-404", translationGroupId: "p-en-404" });
}

const hrefs = (html) => [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
const linkOf = (html, className) => html.match(new RegExp(`class="${className}" href="([^"]*)"`))?.[1];
const read = (dir, file) => fs.readFile(path.join(dir, ...file.split("/")), "utf8");

async function exportWith({ cleanUrls = false, siteUrl = SITE, body = {} } = {}) {
  await resetExports();
  projectRepo.updateProject(PROJECT_ID, { cleanUrls, siteUrl });
  const res = await runExport(body);
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  return latestExportDir();
}

before(async () => {
  await seedProjectScaffold();
  await seedFixture();
});

after(async () => {
  await cleanup();
});

describe("export — the not-found page, Site URL in a subfolder", () => {
  let dir;
  before(async () => {
    dir = await exportWith();
  });

  it("404.html links root-relative under the Site URL path", async () => {
    const html = await read(dir, "404.html");
    assert.ok(hrefs(html).some((href) => href.startsWith("/repo/assets/style.css")), hrefs(html).join(", "));
    assert.equal(linkOf(html, "about"), "/repo/about.html");
    assert.equal(linkOf(html, "home"), "/repo/index.html");
    assert.equal(linkOf(html, "skip"), "#main-content");
    assert.ok(!hrefs(html).some((href) => /^(?:assets|about|index)/.test(href)), hrefs(html).join(", "));
  });

  it("el/404.html links carry the language folder", async () => {
    const html = await read(dir, "el/404.html");
    assert.ok(hrefs(html).some((href) => href.startsWith("/repo/assets/style.css")), hrefs(html).join(", "));
    assert.equal(linkOf(html, "about"), "/repo/el/about.html");
    assert.ok(!hrefs(html).some((href) => href.includes("/el/el/") || href.includes("/el/assets/")), hrefs(html).join(", "));
  });

  it("the 404 page is noindex whatever its setting, and left out of the sitemap", async () => {
    const html = await read(dir, "404.html");
    assert.match(html, /<meta name="robots" content="noindex,nofollow"\s*\/?>/);
    assert.match(await read(dir, "el/404.html"), /<meta name="robots" content="noindex,follow"\s*\/?>/);
    const sitemap = await read(dir, "sitemap.xml");
    assert.ok(!sitemap.includes("404"), sitemap);
    const robots = await read(dir, "robots.txt");
    assert.ok(robots.includes("Disallow: /repo/404.html"), robots);
  });

  it("no canonical on 404.html", async () => {
    assert.ok(!(await read(dir, "404.html")).includes('rel="canonical"'));
  });

  it("a news widget on the 404 page shows 5 items and no pager", async () => {
    const html = await read(dir, "404.html");
    assert.equal([...html.matchAll(/<li>/g)].length, 5);
    assert.ok(!html.includes('class="pager"'), "no pager");
    assert.ok(!html.includes('rel="next"'), "no rel=next");
    assert.ok(!(await fs.pathExists(path.join(dir, "404", "page", "2.html"))), "no paginated copy");
  });

  it("other pages are unchanged", async () => {
    const html = await read(dir, "about.html");
    assert.ok(hrefs(html).some((href) => href.startsWith("assets/style.css")), hrefs(html).join(", "));
    assert.match(html, /rel="canonical"/);
  });
});

describe("export — the not-found page, other settings", () => {
  it("with no Site URL the prefix is /", async () => {
    const dir = await exportWith({ siteUrl: "" });
    const html = await read(dir, "404.html");
    assert.equal(linkOf(html, "about"), "/about.html");
    assert.ok(hrefs(html).some((href) => href.startsWith("/assets/style.css")), hrefs(html).join(", "));
  });

  it("with Clean URLs on, the home link is the Site URL path", async () => {
    const dir = await exportWith({ cleanUrls: true });
    assert.equal(linkOf(await read(dir, "404.html"), "home"), "/repo/");
    assert.equal(linkOf(await read(dir, "404.html"), "about"), "/repo/about");
  });

  it("no Markdown twin", async () => {
    const dir = await exportWith({ body: { exportMarkdown: true } });
    assert.ok(await fs.pathExists(path.join(dir, "about.md")), "about.md is written");
    assert.ok(!(await fs.pathExists(path.join(dir, "404.md"))), "404.md is not");
    assert.ok(!(await read(dir, "404.html")).includes("text/markdown"));
  });
});
