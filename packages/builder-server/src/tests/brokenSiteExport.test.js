/**
 * An export is the whole site or it fails with a message that names what is
 * wrong: unreadable content, a missing layout, a layout, widget or item template
 * that fails, and files that can't be written or copied. None of them may end as
 * a recorded success, an error page in the site, or a server path in the reply.
 *
 * Run with: node --test packages/builder-server/src/tests/brokenSiteExport.test.js
 */

import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "broken-site-uuid";
const PROJECT_FOLDER = "broken-site-project";

const { storage, scope, getProjectDir, getProjectPagesDir, PUBLISH_DIR, runExport, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-broken-site",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://example.com",
    projectName: "Broken Site",
    siteTitle: "Broken Site",
    theme: "__broken_site_theme__",
  });
const exportRepo = await import("../db/repositories/exportRepository.js");

const projectDir = () => getProjectDir(PROJECT_FOLDER);
const pagesDir = () => getProjectPagesDir(PROJECT_FOLDER);
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

const writeWidget = async (type, template) => {
  const dir = path.join(projectDir(), "widgets", type);
  await fs.outputFile(path.join(dir, "schema.json"), JSON.stringify({ type, displayName: type, settings: [] }));
  await fs.outputFile(path.join(dir, "widget.liquid"), template);
};
const writePage = (slug, name, widgets = {}) =>
  fs.outputFile(
    path.join(pagesDir(), `${slug}.json`),
    JSON.stringify({ id: slug, uuid: `p-${slug}`, slug, name, seo: { title: name }, widgets, widgetsOrder: Object.keys(widgets) }),
  );

// Files a test adds or replaces, put back afterwards so each test starts from a healthy site.
const touched = new Map();
async function replaceFile(file, content) {
  if (!touched.has(file)) touched.set(file, (await fs.pathExists(file)) ? await fs.readFile(file) : null);
  if (content === null) await fs.remove(file);
  else await fs.outputFile(file, content);
}

const exportFolders = async () => (await fs.readdir(PUBLISH_DIR).catch(() => [])).filter((name) => name.startsWith(PROJECT_FOLDER));
const history = () => exportRepo.getExports(PROJECT_ID);

/** A reply that says nothing about where the server keeps its files. */
function assertNoServerPath(res) {
  const text = JSON.stringify({ error: res._json.error, message: res._json.message });
  assert.ok(!text.includes(projectDir()), `the reply holds the project's folder: ${text}`);
  assert.ok(!text.includes(path.dirname(projectDir())), `the reply holds a server folder: ${text}`);
}

before(async () => {
  await seedProjectScaffold();
  await writeWidget("good", `<p class="good">fine</p>`);
  await writePage("index", "Home", { w1: { type: "good", settings: {} } });
  await writePage("about", "About us", { w1: { type: "good", settings: {} } });
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  await storage.write(scope, "collection-types/news/template.liquid", `<h1>{{ item.settings.title }}</h1>`);
  await storage.write(
    scope,
    "collections/news/hello.json",
    JSON.stringify({ id: "hello", uuid: "i-hello", slug: "hello", schemaVersion: 1, settings: { title: "Hello" } }),
  );
});

afterEach(async () => {
  mock.restoreAll();
  for (const [file, content] of touched) {
    if (content === null) await fs.remove(file);
    else await fs.outputFile(file, content);
  }
  touched.clear();
  await resetExports();
});

after(async () => {
  await cleanup();
});

describe("a healthy site", () => {
  it("exports, so every refusal below is the broken part's doing", async () => {
    const res = await runExport();
    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal(history()[0].status, "success");
  });
});

describe("content that can't be read is refused before anything is written", () => {
  async function assertRefused(res, files) {
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.equal(res._json.error, "Export failed: unreadable content");
    for (const file of files) assert.ok(res._json.message.includes(file), res._json.message);
    assertNoServerPath(res);
    assert.deepEqual(history(), [], "a refusal takes no version number");
    assert.deepEqual(await exportFolders(), []);
  }

  it("a page file that isn't valid JSON", async () => {
    await replaceFile(path.join(pagesDir(), "about.json"), "{ not json");
    await assertRefused(await runExport(), ["pages/about.json"]);
  });

  it("a header and a shared area, named together", async () => {
    await replaceFile(path.join(pagesDir(), "global", "header.json"), "{ not json");
    await replaceFile(
      path.join(projectDir(), "theme.json"),
      JSON.stringify({ settings: { global: { general: [], colors: [] } }, sharedAreas: [{ id: "before_footer", label: "Before footer" }] }),
    );
    await replaceFile(path.join(pagesDir(), "global", "areas", "before_footer.json"), "{ not json");
    await assertRefused(await runExport(), ["pages/global/header.json", "pages/global/areas/before_footer.json"]);
  });
});

describe("a missing layout is refused before anything is written", () => {
  it("names the layout, not where the server keeps it", async () => {
    await replaceFile(path.join(projectDir(), "layout.liquid"), null);
    const res = await runExport();
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.equal(res._json.error, "Export failed: the theme's layout is missing");
    assertNoServerPath(res);
    assert.deepEqual(history(), []);
    assert.deepEqual(await exportFolders(), []);
  });
});

describe("a page that can't be built fails the export", () => {
  async function assertFailed(res, expected) {
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.equal(res._json.error, "Export failed: a page could not be built");
    for (const text of expected) assert.ok(res._json.message.includes(text), res._json.message);
    assertNoServerPath(res);
    assert.equal(history()[0].status, "failed", "pages were written before it, so it is a failed export");
    assert.equal(history()[0].outputDir, null);
    assert.deepEqual(await exportFolders(), [], "and its folder is gone");
  }

  it("a widget whose template has an error, naming the page and the widget", async () => {
    await writeWidget("broken", `{% if %}<p>never</p>{% endif %}`);
    await replaceFile(
      path.join(pagesDir(), "about.json"),
      JSON.stringify({ id: "about", uuid: "p-about", slug: "about", name: "About us", widgets: { w1: { type: "broken", settings: {} } }, widgetsOrder: ["w1"] }),
    );
    try {
      await assertFailed(await runExport(), ['"About us" (about.html)', 'the "broken" widget failed']);
    } finally {
      await fs.remove(path.join(projectDir(), "widgets", "broken"));
    }
  });

  it("a widget whose type the theme doesn't have", async () => {
    await replaceFile(
      path.join(pagesDir(), "about.json"),
      JSON.stringify({ id: "about", uuid: "p-about", slug: "about", name: "About us", widgets: { w1: { type: "gone", settings: {} } }, widgetsOrder: ["w1"] }),
    );
    await assertFailed(await runExport(), ['"About us" (about.html)', 'the "gone" widget failed', "Widget template not found"]);
  });

  it("a layout with an error", async () => {
    await replaceFile(path.join(projectDir(), "layout.liquid"), `<html>{% if %}{{ main_content | raw }}</html>`);
    await assertFailed(await runExport(), ["the theme's layout failed"]);
  });

  it("a collection item whose template has an error", async () => {
    await replaceFile(path.join(projectDir(), "collection-types", "news", "template.liquid"), `{% if %}<h1>never</h1>`);
    await assertFailed(await runExport(), ["news/hello.html", 'the "news" item template failed']);
  });
});

describe("a file that can't be written or copied fails the export", () => {
  async function assertFailed(res, text) {
    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.message, text);
    assert.equal(history()[0].status, "failed");
    assert.deepEqual(await exportFolders(), []);
  }

  it("sitemap.xml, which the site generator marks as one a site can do without", async () => {
    const outputFile = fs.outputFile;
    mock.method(fs, "outputFile", async (file, ...rest) => {
      if (path.basename(String(file)) === "sitemap.xml") throw new Error("disk full");
      return outputFile(file, ...rest);
    });
    await assertFailed(await runExport(), /disk full/);
  });

  it("the theme's assets", async () => {
    const assetsDir = path.join(projectDir(), "assets");
    await replaceFile(path.join(assetsDir, "css", "base.css"), "body{}");
    const copy = fs.copy;
    mock.method(fs, "copy", async (src, ...rest) => {
      if (src === assetsDir) throw new Error("permission denied");
      return copy(src, ...rest);
    });
    await assertFailed(await runExport(), /could not be copied into the export: the theme's assets \(permission denied\)/);
  });
});
