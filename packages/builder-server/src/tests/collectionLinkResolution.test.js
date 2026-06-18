/**
 * Render-time resolution of widget `link` settings that target a collection item
 * (collectionItemUuid). Exercises the new-arch wiring end-to-end through
 * renderWidget + the scope-aware `collectionDeps`: the engine lazily loads the
 * item uuid -> { slugPrefix, slug } map via deps.loadCollectionItemsByUuid and
 * resolveWidgetPageLinks rewrites the href to the item's current page URL,
 * depth-aware (outputPathPrefix), clearing the link when the item is gone (#11
 * parity with pageUuid).
 *
 * Mirrors collectionFilter.test.js (real LocalStorageAdapter over a tmp dataRoot).
 *
 * Run with: node --test packages/builder-server/src/tests/collectionLinkResolution.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-colllink-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { renderWidget } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "colllink-uuid";
const PROJECT_FOLDER = "colllink-project";
const RAW_THEME = { settings: { global: { general: [], colors: [] } } };

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const collectionDeps = { storage, scope };

const PORTFOLIO_SCHEMA = {
  type: "portfolio",
  schemaVersion: 1,
  displayName: "Portfolio",
  displayNamePlural: "Portfolio",
  icon: "Briefcase",
  hasItemPages: true,
  slugPrefix: "portfolio",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

// A widget with a single `link` setting; the template prints the resolved href.
const LINK_WIDGET_SCHEMA = { type: "link-widget", settings: [{ type: "link", id: "cta" }] };

async function renderLinkWidget(linkValue, sharedGlobals = null) {
  const dir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "link-widget");
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, "widget.liquid"), `<a href="{{ widget.settings.cta.href }}">{{ widget.settings.cta.text }}</a>`);
  await fs.writeFile(path.join(dir, "schema.json"), JSON.stringify(LINK_WIDGET_SCHEMA));
  return renderWidget(
    PROJECT_ID,
    "link-widget",
    { type: "link-widget", settings: { cta: linkValue } },
    RAW_THEME,
    "publish",
    sharedGlobals,
    null,
    collectionDeps,
  );
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Coll Link", theme: "__t__", created: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
  const dir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(dir, "pages", "global"));
  await fs.ensureDir(path.join(dir, "widgets"));

  await storage.write(scope, "collection-types/portfolio/schema.json", JSON.stringify(PORTFOLIO_SCHEMA, null, 2));
  await storage.write(
    scope,
    "collections/portfolio/alpha.json",
    JSON.stringify(
      { id: "alpha", uuid: "u-alpha", slug: "alpha", schemaVersion: 1, created: "2026-01-02T00:00:00.000Z", updated: "2026-01-02T00:00:00.000Z", settings: { title: "Alpha" } },
      null,
      2,
    ),
  );
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("widget link resolution to collection items", () => {
  it("resolves a collectionItemUuid link to the item's current page URL", async () => {
    const html = await renderLinkWidget({ collectionItemUuid: "u-alpha", href: "portfolio/stale.html", text: "Go", target: "_self" });
    assert.ok(html.includes('href="portfolio/alpha.html"'), html);
  });

  it("depth-prefixes the resolved href when rendering inside a nested item page", async () => {
    const html = await renderLinkWidget(
      { collectionItemUuid: "u-alpha", href: "portfolio/stale.html", text: "Go", target: "_self" },
      { outputPathPrefix: "../" },
    );
    assert.ok(html.includes('href="../portfolio/alpha.html"'), html);
  });

  it("clears the link when the collection item no longer exists", async () => {
    const html = await renderLinkWidget({ collectionItemUuid: "u-missing", href: "portfolio/gone.html", text: "Go", target: "_self" });
    assert.ok(html.includes('href=""'), html);
    assert.ok(!html.includes("portfolio/gone.html"), html);
  });

  it("leaves a custom URL link untouched", async () => {
    const html = await renderLinkWidget({ href: "https://example.com", text: "Out", target: "_blank" });
    assert.ok(html.includes('href="https://example.com"'), html);
  });
});

// Widget `menu` settings now resolve through the SAME shared menuResolver as
// collection-item rendering (the consolidation of the old inline widget-menu
// path): collection-item menu targets resolve to the item's page URL and custom
// menu links are sanitized.
const NAV_WIDGET_SCHEMA = { type: "nav-widget", settings: [{ type: "menu", id: "nav" }] };

async function renderNavWidget() {
  const dir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "nav-widget");
  await fs.ensureDir(dir);
  await fs.writeFile(
    path.join(dir, "widget.liquid"),
    `{% for i in widget.settings.nav.items %}[{{ i.link }}]{% endfor %}`,
  );
  await fs.writeFile(path.join(dir, "schema.json"), JSON.stringify(NAV_WIDGET_SCHEMA));
  // A menu with: a collection-item target, a dangerous custom link, and a custom URL.
  const menusDir = path.join(getProjectDir(PROJECT_FOLDER), "menus");
  await fs.ensureDir(menusDir);
  await fs.writeFile(
    path.join(menusDir, "main.json"),
    JSON.stringify({
      uuid: "menu-1",
      name: "Main",
      items: [
        { collectionItemUuid: "u-alpha", label: "Alpha" },
        { link: "javascript:alert(1)", label: "Bad" },
        { link: "https://example.com", label: "Out" },
      ],
    }),
  );
  return renderWidget(
    PROJECT_ID,
    "nav-widget",
    { type: "nav-widget", settings: { nav: "menu-1" } },
    RAW_THEME,
    "publish",
    null,
    null,
    collectionDeps,
  );
}

describe("widget menu resolution via the shared resolver", () => {
  it("resolves a collection-item menu target and sanitizes a dangerous custom link", async () => {
    const html = await renderNavWidget();
    assert.ok(html.includes("[portfolio/alpha.html]"), html); // collection-item target resolved
    assert.ok(html.includes("[https://example.com]"), html); // safe custom URL kept
    assert.ok(!html.includes("javascript:"), `dangerous menu link must be sanitized — got: ${html}`);
  });
});
