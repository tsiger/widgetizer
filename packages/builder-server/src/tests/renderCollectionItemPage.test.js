/**
 * renderCollectionItemPage return-contract test (TODO §19, tight scope).
 *
 * Master's renderCollectionItemPage.test.js (1aa6e92d — the shared item-page
 * pipeline unifying export + preview) was never ported. The function is fully
 * ported and works; exp covers it only transitively through exportProject
 * (collectionItemExport.test.js asserts written files), never its direct return
 * shape. This pins the load-bearing part of that contract:
 *
 *   { html, mainContentHtml, itemPageData, resolvedItem }
 *
 * The seam that matters is the html / mainContentHtml SEPARATION:
 *   - mainContentHtml is the INNER template output only — NO layout wrapper.
 *     The export path feeds it to markdown parity, so a refactor that folded
 *     the layout into it would keep the export-file tests green while silently
 *     breaking markdown export + preview.
 *   - html is the full laid-out page (wrapper + the inner content).
 * Verified in both publish ("../") and preview ("") modes.
 *
 * Run with: node --test packages/builder-server/src/tests/renderCollectionItemPage.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-rcip-test-${Date.now()}`);
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
const { renderCollectionItemPage } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "rcip-uuid";
const PROJECT_FOLDER = "rcip-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const RAW_THEME_SETTINGS = { settings: { global: { general: [], colors: [] } } };

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "richtext", id: "body", label: "Body" },
  ],
};

// Inner template output carries a distinct marker (<article class="news-item">)
// that must appear in mainContentHtml but never the layout wrapper around it.
const NEWS_TEMPLATE = `<article class="news-item"><h1>{{ item.settings.title }}</h1><div class="body">{{ item.settings.body | raw }}</div></article>`;

const ALPHA = {
  id: "alpha",
  uuid: "u-alpha",
  slug: "alpha",
  schemaVersion: 1,
  created: "2026-01-02T00:00:00.000Z",
  updated: "2026-01-02T00:00:00.000Z",
  settings: { title: "Alpha", body: "<p>Body of Alpha</p>" },
};

async function seedProjectScaffold() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "RCIP Project",
        siteTitle: "RCIP Site",
        theme: "__rcip_theme__",
        themeVersion: "1.0.0",
        siteUrl: "",
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

  // Layout wrapper with recognizable markers: <!DOCTYPE>, <title>, <body class>.
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title></head>` +
      `<body class="{{ body_class }}">{{ header | raw }}<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>`,
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
  await storage.write(scope, "collections/news/alpha.json", JSON.stringify(ALPHA));
}

/** Render the alpha item at a given mode/depth via the scope-first wrapper. */
function renderAlpha(renderMode, outputPathPrefix) {
  const sharedGlobals = {
    projectId: PROJECT_ID,
    apiUrl: "",
    renderMode,
    themeSettingsRaw: RAW_THEME_SETTINGS,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
    collectionCache: new Map(),
    pagesByUuid: new Map(),
    collectionItemsByUuid: new Map(),
    outputPathPrefix,
    currentCanonicalPath: `news/alpha.html`,
  };
  return renderCollectionItemPage(
    PROJECT_ID,
    {
      schema: NEWS_SCHEMA,
      item: ALPHA,
      template: NEWS_TEMPLATE,
      rawThemeSettings: RAW_THEME_SETTINGS,
      renderMode,
      sharedGlobals,
      headerData: null,
      footerData: null,
      projectData: { name: "RCIP Project", siteTitle: "RCIP Site" },
      siteUrl: "",
    },
    { storage, scope },
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

for (const { mode, prefix, label } of [
  { mode: "publish", prefix: "../", label: "publish (depth-1)" },
  { mode: "preview", prefix: "", label: "preview (depth-0)" },
]) {
  describe(`renderCollectionItemPage — ${label} return contract (TODO §19)`, () => {
    let result;
    before(async () => {
      result = await renderAlpha(mode, prefix);
    });

    it("returns the four-field shape", () => {
      assert.deepEqual(Object.keys(result).sort(), ["html", "itemPageData", "mainContentHtml", "resolvedItem"]);
    });

    it("mainContentHtml is the INNER template output only — no layout wrapper", () => {
      assert.match(result.mainContentHtml, /<article class="news-item">/);
      assert.match(result.mainContentHtml, /<h1>Alpha<\/h1>/);
      // The load-bearing separation: the layout wrapper must NOT be folded in.
      assert.doesNotMatch(result.mainContentHtml, /<!doctype|<body|<title>/i);
    });

    it("html is the full laid-out page — wrapper plus the inner content", () => {
      assert.match(result.html, /<!DOCTYPE html>/);
      assert.match(result.html, /<body class="collection-news item-alpha">/);
      assert.match(result.html, /<article class="news-item">/);
    });

    it("itemPageData and resolvedItem carry the expected slugs", () => {
      assert.equal(result.resolvedItem.slug, "alpha");
      assert.equal(result.itemPageData.slug, "news/alpha");
    });
  });
}
