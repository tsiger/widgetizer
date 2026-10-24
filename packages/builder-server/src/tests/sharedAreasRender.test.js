/**
 * Shared areas in rendered output: export (normal, numbered, item and translated
 * pages) and the editor's preview.
 *
 * Run with: node --test packages/builder-server/src/tests/sharedAreasRender.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "shared-areas-render-uuid";
const PROJECT_FOLDER = "shared-areas-render-project";

const { storage, scope, projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-shared-areas-render-test",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://areas.example.com",
    projectName: "Shared Areas Render",
    siteTitle: "Site",
    theme: "__shared_areas_render_theme__",
  });

const { createPreviewToken } = await import("../controllers/previewController.js");
const { getToken } = await import("../services/previewTokenStore.js");

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

const GRID_TEMPLATE =
  `{% assign items = 'news' | collection: limit: widget.settings.limit %}` +
  `<ul>{% for item in items %}<li>{{ item.settings.title }}</li>{% endfor %}</ul>`;

// The widget says where it is: its index (null in an area) and its area.
const NOTICE_TEMPLATE =
  `{% enqueue_script src: "notice.js", defer: true %}` +
  `<aside class="notice" data-index="{{ widget.index }}" data-area="{{ widget.area }}">{{ widget.settings.text }}</aside>`;

const notice = (text) => ({ type: "notice", settings: { text } });
const areaOf = (widgets) => ({ widgets, widgetsOrder: Object.keys(widgets) });

async function writeArea(language, area) {
  await fs.outputJson(path.join(getProjectPagesDir(PROJECT_FOLDER), language, "global", "areas", "before_footer.json"), area);
}

async function writePage(language, slug, widgets) {
  await fs.outputJson(path.join(getProjectPagesDir(PROJECT_FOLDER), language, `${slug}.json`), {
    name: slug,
    slug,
    uuid: `p-${language || "en"}-${slug}`,
    seo: { title: slug },
    widgets,
    widgetsOrder: Object.keys(widgets),
  });
}

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el"] });
  const projectDir = getProjectDir(PROJECT_FOLDER);

  await fs.outputJson(path.join(projectDir, "theme.json"), {
    sharedAreas: [{ id: "before_footer", label: "Before footer" }],
    settings: { global: { general: [], colors: [] } },
  });
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>{% header_assets %}</head>` +
      `<body><main>{{ main_content | raw }}</main><div id="area">{{ shared_areas.before_footer | raw }}</div><!--/area-->` +
      `{% footer_assets %}</body></html>`,
  );
  await fs.outputFile(path.join(projectDir, "widgets", "notice", "schema.json"), JSON.stringify({ settings: [] }));
  await fs.outputFile(path.join(projectDir, "widgets", "notice", "widget.liquid"), NOTICE_TEMPLATE);
  await fs.outputFile(path.join(projectDir, "widgets", "notice", "notice.js"), "// notice");
  await fs.outputFile(
    path.join(projectDir, "widgets", "news-grid", "schema.json"),
    JSON.stringify({ collection: { type: "news", perPageSetting: "limit" }, settings: [{ type: "number", id: "limit", default: 1 }] }),
  );
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "widget.liquid"), GRID_TEMPLATE);

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  await storage.write(scope, "collection-types/news/template.liquid", "<article>{{ item.settings.title }}</article>");
  for (const [index, title] of ["Alpha", "Beta"].entries()) {
    const slug = title.toLowerCase();
    const created = `2026-01-0${5 - index}T00:00:00.000Z`;
    await storage.write(
      scope,
      `collections/news/${slug}.json`,
      JSON.stringify({ id: slug, uuid: `u-${slug}`, slug, schemaVersion: 1, created, updated: created, settings: { title } }),
    );
  }

  // An area widget with a menu and a picked link, to check they work from every page depth.
  await fs.outputFile(
    path.join(projectDir, "widgets", "areanav", "schema.json"),
    JSON.stringify({ settings: [{ id: "nav", type: "menu" }, { id: "cta", type: "link" }] }),
  );
  await fs.outputFile(
    path.join(projectDir, "widgets", "areanav", "widget.liquid"),
    `{% render 'menu', menu: widget.settings.nav, class_menu: 'areamenu', class_item: 'm', class_link: 'ml' %}` +
      `<a class="cta" href="{{ widget.settings.cta.href }}">{{ widget.settings.cta.text }}</a>`,
  );
  await fs.outputJson(path.join(projectDir, "menus", "main-menu.json"), {
    id: "main-menu",
    uuid: "m-main",
    name: "Main",
    items: [{ id: "i1", label: "About", link: "about.html", pageUuid: "p-en-about" }],
  });

  await writePage("", "index", { w1: { type: "news-grid", settings: { limit: 1, paginate: true } } });
  await writePage("", "about", {});
  await writePage("el", "index", {});
  await writeArea(
    "",
    areaOf({
      a1: notice("Shared English"),
      a3: {
        type: "areanav",
        settings: { nav: "m-main", cta: { href: "about.html", text: "About us", pageUuid: "p-en-about" } },
      },
    }),
  );
  await writeArea("el", areaOf({ a2: notice("Κοινό") }));
});

after(cleanup);

// Export reformats its HTML, so whitespace between tags is dropped before matching.
const areaOn = (html) =>
  html
    .replace(/>\s+</g, "><")
    .match(/<div id="area">(.*?)<\/div><!--\/area-->/s)?.[1]
    ?.trim() ?? null;

describe("shared areas in an export", () => {
  let exportDir;
  before(async () => {
    await resetExports();
    const res = await runExport();
    assert.equal(res._status, 200, JSON.stringify(res._json));
    exportDir = latestExportDir();
  });

  const read = (relativePath) => fs.readFile(path.join(exportDir, ...relativePath.split("/")), "utf8");

  it("shows the area on a normal page, a numbered page and an item page", async () => {
    for (const file of ["index.html", "page/2.html", "news/alpha.html"]) {
      const area = areaOn(await read(file));
      assert.match(area, /<aside class="notice"[^>]*>Shared English<\/aside>/, file);
    }
  });

  it("resolves an area's picked link and menu from each page's depth", async () => {
    for (const [file, prefix] of [
      ["index.html", ""],
      ["page/2.html", "../"],
      ["news/alpha.html", "../"],
    ]) {
      const area = areaOn(await read(file));
      assert.ok(area.includes(`<a class="cta" href="${prefix}about.html">About us</a>`), `${file}: ${area}`);
      assert.ok(area.includes(`<a href="${prefix}about.html" class="ml"`), `${file}: ${area}`);
    }
  });

  it("marks the current page in an area's menu", async () => {
    const onAbout = areaOn(await read("about.html"));
    assert.match(onAbout, /class="m is-active"/);
    assert.match(onAbout, /aria-current="page"/);
    assert.doesNotMatch(areaOn(await read("index.html")), /is-active/);
  });

  it("shows each language its own area", async () => {
    const greek = areaOn(await read("el/index.html"));
    assert.match(greek, />Κοινό</);
    assert.doesNotMatch(greek, /Shared English/);
  });

  it("gives area widgets no page index and names their area", async () => {
    const area = areaOn(await read("index.html"));
    assert.match(area, /data-index=""/);
    assert.match(area, /data-area="before_footer"/);
  });

  it("publishes the widgets alone, and ships an area-only widget's script", async () => {
    const html = await read("index.html");
    assert.doesNotMatch(html, /data-shared-area/);
    assert.match(html, /notice\.js/);
    assert.equal(await fs.pathExists(path.join(exportDir, "assets", "notice.js")), true);
  });
});

describe("shared areas in the editor preview", () => {
  async function preview(pageData) {
    const res = { _status: 200, _json: null, status(code) { res._status = code; return res; }, json(data) { res._json = data; return res; } };
    await createPreviewToken(
      {
        body: { pageData, themeSettings: {}, previewMode: "editor" },
        scope: { ...scope, projectId: PROJECT_ID },
        adapters: { storage },
        activeProject: projectRepo.getProjectById(PROJECT_ID),
      },
      res,
    );
    assert.equal(res._status, 200, JSON.stringify(res._json));
    return getToken(res._json.token);
  }

  const page = { slug: "about", language: "en", widgets: {}, widgetsOrder: [] };

  it("shows the saved area when the editor sends none", async () => {
    const area = areaOn(await preview(page));
    assert.match(area, /<div data-shared-area="before_footer" style="display: contents">/);
    assert.match(area, />Shared English</);
  });

  it("shows the editor's unsaved area over the saved one", async () => {
    const area = areaOn(await preview({ ...page, sharedAreas: { before_footer: areaOf({ a9: notice("Unsaved") }) } }));
    assert.match(area, />Unsaved</);
    assert.doesNotMatch(area, /Shared English/);
  });

  it("marks an empty area so the editor can find it, and renders no widgets in it", async () => {
    const area = areaOn(await preview({ ...page, sharedAreas: { before_footer: areaOf({}) } }));
    assert.equal(area, '<div data-shared-area="before_footer" style="display: contents"></div>');
  });

  it("ignores an area the theme does not declare", async () => {
    const html = await preview({ ...page, sharedAreas: { after_header: areaOf({ x: notice("Stray") }) } });
    assert.doesNotMatch(html, /Stray/);
  });
});
