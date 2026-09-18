/**
 * The preview controllers on a translated site.
 *
 * Everything here goes through the real controller rather than the renderer,
 * because the bugs this pins were in the wiring between them: a language read
 * from the request and then dropped on the way to the render is invisible to
 * any test that starts after that point.
 *
 * Run with: node --test packages/builder-server/src/tests/previewLanguages.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preview-lang-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _log = console.log;
const _warn = console.warn;
const _error = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { createCollectionPreviewToken, createPreviewToken } = await import("../controllers/previewController.js");
const { getToken } = await import("../services/previewTokenStore.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "preview-lang-uuid";
const PROJECT_FOLDER = "preview-lang-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const RAW_THEME_SETTINGS = { settings: { global: { general: [], colors: [] } } };

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "Story",
  displayNamePlural: "News",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

// The template prints the language it was rendered as, so a dropped language is
// visible in the output rather than only in what it breaks downstream.
const NEWS_TEMPLATE = `<article data-language="{{ page.language }}"><h1>{{ item.settings.title }}</h1></article>`;

const headerWidget = (text) => ({
  type: "header",
  settings: { text },
  blocks: {},
  blocksOrder: [],
});

async function seed() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Preview Languages",
        siteTitle: "Preview Languages",
        theme: "__preview_lang_theme__",
        themeVersion: "1.0.0",
        siteUrl: "",
        defaultLanguage: "en",
        languages: ["el"],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.outputFile(getProjectThemeJsonPath(PROJECT_FOLDER), JSON.stringify(RAW_THEME_SETTINGS, null, 2));

  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><title>{{ page.seo.title }}</title></head>` +
      `<body>{{ header | raw }}` +
      `<nav class="crumbs">{% for crumb in page.breadcrumbs %}<span>{{ crumb.label }}</span>{% endfor %}</nav>` +
      `<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>`,
  );

  // A header per language, each saying which one it is.
  await storage.write(scope, "pages/global/header.json", JSON.stringify(headerWidget("ENGLISH HEADER")));
  await storage.write(scope, "pages/global/footer.json", JSON.stringify({ ...headerWidget("ENGLISH FOOTER"), type: "footer" }));
  await storage.write(scope, "pages/el/global/header.json", JSON.stringify(headerWidget("GREEK HEADER")));
  await storage.write(scope, "pages/el/global/footer.json", JSON.stringify({ ...headerWidget("GREEK FOOTER"), type: "footer" }));

  // Global widgets render from the project's own widgets/global/<type>/.
  for (const type of ["header", "footer"]) {
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", type, "widget.liquid"),
      `<${type === "header" ? "header" : "footer"}>{{ widget.settings.text }}</${type === "header" ? "header" : "footer"}>`,
    );
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", type, "schema.json"),
      JSON.stringify({ name: type, settings: [{ type: "text", id: "text", label: "Text" }] }, null, 2),
    );
  }

  // A home page and a listing page, so there is a trail to lose.
  await storage.write(
    scope,
    "pages/index.json",
    JSON.stringify({ id: "index", uuid: "u-home", slug: "index", name: "Home", widgets: {}, widgetsOrder: [] }),
  );
  await storage.write(
    scope,
    "pages/blog.json",
    JSON.stringify({ id: "blog", uuid: "u-blog", slug: "blog", name: "Blog", widgets: {}, widgetsOrder: [] }),
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
}

function mockReq(body, query = {}) {
  const project = projectRepo.getProjectById(PROJECT_ID);
  return {
    body,
    query,
    params: {},
    scope,
    activeProject: project,
    adapters: { storage },
  };
}

function mockRes() {
  const res = { _status: 200, _json: null };
  res.status = (code) => {
    res._status = code;
    return res;
  };
  res.json = (payload) => {
    res._json = payload;
    return res;
  };
  return res;
}

async function previewItemHtml(query) {
  const req = mockReq(
    { collectionType: "news", slug: "story", settings: { title: "Story" } },
    query,
  );
  const res = mockRes();
  await createCollectionPreviewToken(req, res);
  assert.equal(res._status, 200, JSON.stringify(res._json));
  return getToken(res._json.token);
}

before(async () => {
  await seed();
});

after(async () => {
  console.log = _log;
  console.warn = _warn;
  console.error = _error;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("a collection item preview in another language", () => {
  it("wraps it in that language's header and footer", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /GREEK HEADER/);
    assert.match(html, /GREEK FOOTER/);
    assert.doesNotMatch(html, /ENGLISH HEADER/);
  });

  it("renders the item AS that language, so everything downstream resolves in it", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /data-language="el"/);
  });

  it("tells the runtime which codes are languages", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /data-languages="el"/);
    assert.match(html, /data-default-language="en"/);
  });

  it("is the default language's page when no language is asked for", async () => {
    const html = await previewItemHtml({});
    assert.match(html, /ENGLISH HEADER/);
    assert.match(html, /data-language="en"/);
    assert.doesNotMatch(html, /GREEK HEADER/);
  });

  it("refuses a language the project has not enabled", async () => {
    const req = mockReq({ collectionType: "news", slug: "story", settings: {} }, { language: "fr" });
    const res = mockRes();
    await createCollectionPreviewToken(req, res);
    assert.equal(res._status, 400);
  });
});

// A page is listed under its FIRST copy's path, so the lookup that finds it has
// to ask for page one however deep into the pagination the preview is. The
// numbered crumb comes from the pagination plan, not from this path.
describe("a numbered page preview", () => {
  async function pageHtml(pageNumber) {
    const req = mockReq({
      pageData: { id: "blog", uuid: "u-blog", slug: "blog", name: "Blog", widgets: {}, widgetsOrder: [] },
      themeSettings: RAW_THEME_SETTINGS,
      previewMode: "standalone",
      pageNumber,
    });
    const res = mockRes();
    await createPreviewToken(req, res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    return getToken(res._json.token);
  }

  it("keeps its breadcrumb trail on page one", async () => {
    const html = await pageHtml(1);
    assert.match(html, /<nav class="crumbs">.*Blog.*<\/nav>/s);
  });

  it("keeps the same trail on a later page", async () => {
    const html = await pageHtml(2);
    assert.match(html, /<nav class="crumbs">.*Blog.*<\/nav>/s);
  });
});
