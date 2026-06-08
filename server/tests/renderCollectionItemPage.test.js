/**
 * Focused contract test for renderCollectionItemPage — the single shared
 * pipeline behind BOTH item-page render paths (export + preview), extracted in
 * the finding #2 follow-up. The integrated export/preview suites assert the
 * resulting files/HTML; this pins the function's own return contract directly:
 *
 *   { html, mainContentHtml, itemPageData, resolvedItem }
 *
 * - `html` is the full laid-out page (header/main/footer through the layout).
 * - `mainContentHtml` is the INNER template output only — the export path feeds
 *   it to markdown parity, so it must exclude the layout wrapper.
 * - the item template receives the documented collection/page/project context.
 * - the item body class is `collection-{type} item-{slug}`.
 *
 * Exercised in both publish ("../") and preview ("") modes.
 *
 * Run with: node --test server/tests/renderCollectionItemPage.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-rcip-${Date.now()}`);
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
} = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { renderCollectionItemPage } = await import("../services/renderingService.js");
const { getCollectionSchema, listCollectionItems } = await import("../services/collectionService.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "rcip-project";
const FOLDER = "rcip-folder";
const SITE_URL = "https://rcip.example.com";

const LAYOUT = `<!DOCTYPE html>
<html>
<head>{% seo %}</head>
<body class="{{ body_class }}">
{{ header | raw }}
<main>{{ main_content | raw }}</main>
{{ footer | raw }}
</body>
</html>`;

// slugPrefix deliberately differs from type, to prove the page-shaped id/slug are
// built from slugPrefix, not type.
const SCHEMA = {
  type: "portfolio",
  schemaVersion: 1,
  displayName: "Portfolio Item",
  displayNamePlural: "Portfolio",
  slugPrefix: "work",
  hasItemPages: true,
  defaultSort: "manual",
  settings: [
    { type: "header", id: "content_header", label: "Content" },
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
  ],
};

const TEMPLATE = `<article class="item">
<h1>{{ item.settings.title }}</h1>
<span class="c">{{ collection.displayName }}</span>
<span class="p">{{ project.siteTitle }}</span>
<span class="s">{{ page.slug }}</span>
</article>`;

const ITEM = {
  id: "alpha",
  slug: "alpha",
  uuid: "uuid-alpha",
  schemaVersion: 1,
  created: "2025-01-01T00:00:00.000Z",
  updated: "2025-02-02T00:00:00.000Z",
  settings: { title: "Alpha" },
  seo: {
    description: "Alpha desc",
    og_title: "",
    og_image: "",
    og_type: "article",
    twitter_card: "summary",
    canonical_url: "",
    robots: "index,follow",
  },
};

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: FOLDER,
        name: "RCIP",
        siteTitle: "RCIP Site",
        theme: "__rcip_theme__",
        themeVersion: "1.0.0",
        siteUrl: SITE_URL,
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "assets"));
  await fs.outputFile(getProjectThemeJsonPath(FOLDER), JSON.stringify({ settings: { global: {} } }, null, 2));
  await fs.writeFile(path.join(projectDir, "layout.liquid"), LAYOUT);
  await fs.outputFile(getProjectCollectionSchemaPath(FOLDER, "portfolio"), JSON.stringify(SCHEMA, null, 2));
  await fs.writeFile(getProjectCollectionTemplatePath(FOLDER, "portfolio"), TEMPLATE);
  await fs.outputJson(getProjectCollectionItemPath(FOLDER, "portfolio", "alpha"), ITEM);
});

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  try {
    closeDb();
  } catch {
    /* ignore */
  }
  await fs.remove(TEST_ROOT);
});

function buildGlobals(renderMode, outputPathPrefix) {
  return {
    projectId: PROJECT_ID,
    apiUrl: renderMode === "preview" ? "http://localhost:3001" : "",
    renderMode,
    themeSettingsRaw: { settings: { global: {} } },
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
    enqueuedPreloads: new Map(),
    collectionCache: new Map(),
    pagesByUuid: new Map(),
    outputPathPrefix,
    currentCanonicalPath: "work/alpha.html",
  };
}

async function loadFixture() {
  const schema = await getCollectionSchema(FOLDER, "portfolio");
  const items = await listCollectionItems(FOLDER, "portfolio");
  const item = items.find((i) => i.slug === "alpha");
  const projectData = projectRepo.getProjectById(PROJECT_ID);
  return { schema, item, projectData };
}

describe("renderCollectionItemPage — contract", () => {
  it("returns html, inner mainContentHtml, page data and resolved item (publish, '../')", async () => {
    const { schema, item, projectData } = await loadFixture();
    const result = await renderCollectionItemPage({
      projectId: PROJECT_ID,
      schema,
      item,
      template: TEMPLATE,
      rawThemeSettings: { settings: { global: {} } },
      renderMode: "publish",
      sharedGlobals: buildGlobals("publish", "../"),
      headerData: null,
      footerData: null,
      projectData,
      siteUrl: SITE_URL,
    });

    // `html` is the full laid-out page with the item body class.
    assert.ok(result.html.includes("<!DOCTYPE html>"), "html is the full laid-out page");
    assert.ok(result.html.includes("<main>"), "html wraps content in the layout");
    assert.match(result.html, /<body class="collection-portfolio item-alpha">/);

    // `mainContentHtml` is the INNER template output only (no layout wrapper),
    // and it is what the laid-out page embeds.
    assert.ok(result.mainContentHtml.includes('<article class="item">'));
    assert.ok(!result.mainContentHtml.includes("<body"), "mainContentHtml excludes the layout");
    assert.ok(result.html.includes('<article class="item">'), "the inner content is embedded in html");

    // The item template received the documented collection/page/project context.
    assert.match(result.mainContentHtml, /<span class="c">Portfolio Item<\/span>/);
    assert.match(result.mainContentHtml, /<span class="p">RCIP Site<\/span>/);
    assert.match(result.mainContentHtml, /<span class="s">work\/alpha<\/span>/);

    // Page-shaped object: id is CSS-safe (slugPrefix-slug), slug is path-shaped.
    assert.equal(result.itemPageData.id, "work-alpha");
    assert.equal(result.itemPageData.slug, "work/alpha");
    assert.equal(result.resolvedItem.slug, "alpha");
  });

  it("renders in preview mode at root depth ('')", async () => {
    const { schema, item, projectData } = await loadFixture();
    const result = await renderCollectionItemPage({
      projectId: PROJECT_ID,
      schema,
      item,
      template: TEMPLATE,
      rawThemeSettings: { settings: { global: {} } },
      renderMode: "preview",
      sharedGlobals: buildGlobals("preview", ""),
      headerData: null,
      footerData: null,
      projectData,
      siteUrl: "",
    });

    assert.match(result.html, /<body class="collection-portfolio item-alpha">/);
    assert.match(result.mainContentHtml, /<h1>Alpha<\/h1>/);
    assert.equal(result.itemPageData.slug, "work/alpha");
  });
});
