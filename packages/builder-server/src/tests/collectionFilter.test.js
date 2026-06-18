/**
 * `| collection` Liquid filter test suite.
 *
 * Renders a real widget through renderWidget with a scope-aware `collectionDeps`
 * ({ storage, scope }) — the same capability the preview/export route handlers
 * pass — so this exercises the async filter end-to-end through the new-arch
 * wiring: the OSS `buildCollectionItemsLoader` factory reading items via the
 * storage adapter, keyword-argument parsing, invalid-item exclusion, `item.url`
 * depth resolution, and the per-render cache.
 *
 * Mirrors the storage-adapter/scope pattern of collectionApi.test.js (real
 * LocalStorageAdapter over a tmp dataRoot). Without `collectionDeps` the filter
 * returns [] — that path is covered implicitly by every non-collection render.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionFilter.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collfilter-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { renderWidget } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "collfilter-uuid";
const PROJECT_FOLDER = "collfilter-project";
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

const item = (slug, title, created) => ({
  id: slug,
  uuid: `u-${slug}`,
  slug,
  schemaVersion: 1,
  created,
  updated: created,
  settings: { title },
});

// Render a widget whose template uses the `| collection` filter, passing the
// scope-aware collectionDeps so the loader is wired onto globals.
async function renderListWidget(template) {
  const dir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "coll-list");
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, "widget.liquid"), template);
  await fs.writeFile(path.join(dir, "schema.json"), JSON.stringify({ type: "coll-list", settings: [] }));
  return renderWidget(
    PROJECT_ID,
    "coll-list",
    { type: "coll-list", settings: {} },
    RAW_THEME,
    "preview",
    null,
    null,
    collectionDeps,
  );
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Coll Filter", theme: "__t__", created: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
  const dir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(dir, "pages", "global"));
  await fs.ensureDir(path.join(dir, "snippets"));
  await fs.ensureDir(path.join(dir, "widgets"));

  // portfolio schema (hasItemPages: true) + 3 items, one invalid (empty title)
  await storage.write(scope, "collection-types/portfolio/schema.json", JSON.stringify(PORTFOLIO_SCHEMA, null, 2));
  for (const it of [
    item("alpha", "Alpha", "2026-01-02T00:00:00.000Z"),
    item("bravo", "Bravo", "2026-01-03T00:00:00.000Z"),
    item("broken", "", "2026-01-04T00:00:00.000Z"),
  ]) {
    await storage.write(scope, `collections/portfolio/${it.slug}.json`, JSON.stringify(it, null, 2));
  }
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("| collection filter", () => {
  it("lists valid items (excluding invalid) with default sort", async () => {
    const html = await renderListWidget(
      `{% assign items = 'portfolio' | collection %}{% for i in items %}[{{ i.settings.title }}]{% endfor %}`,
    );
    assert.ok(html.includes("[Alpha]"), html);
    assert.ok(html.includes("[Bravo]"), html);
    assert.ok(!html.includes("[]"), "invalid (empty-title) item must be excluded");
    // manual default sort, no _order -> created_desc: Bravo (Jan 3) before Alpha (Jan 2)
    assert.ok(html.indexOf("[Bravo]") < html.indexOf("[Alpha]"), html);
  });

  it("honors the limit keyword argument", async () => {
    const html = await renderListWidget(
      `{% assign items = 'portfolio' | collection: limit: 1 %}{% for i in items %}[{{ i.settings.title }}]{% endfor %}`,
    );
    assert.ok(html.includes("[Bravo]"), html);
    assert.ok(!html.includes("[Alpha]"), `limit:1 should return one item — got: ${html}`);
  });

  it("honors the sort keyword argument", async () => {
    const html = await renderListWidget(
      `{% assign items = 'portfolio' | collection: sort: 'title_asc' %}{% for i in items %}[{{ i.settings.title }}]{% endfor %}`,
    );
    assert.ok(html.indexOf("[Alpha]") < html.indexOf("[Bravo]"), html);
  });

  it("computes item.url from slugPrefix when hasItemPages is true", async () => {
    const html = await renderListWidget(
      `{% assign items = 'portfolio' | collection: sort: 'title_asc' %}{% for i in items %}<a href="{{ i.url }}"></a>{% endfor %}`,
    );
    assert.ok(html.includes('href="portfolio/alpha.html"'), html);
  });

  it("combines limit and sort (limit counts valid items)", async () => {
    const html = await renderListWidget(
      `{% assign items = 'portfolio' | collection: sort: 'title_asc', limit: 1 %}{% for i in items %}[{{ i.settings.title }}]{% endfor %}`,
    );
    assert.ok(html.includes("[Alpha]"), html);
    assert.ok(!html.includes("[Bravo]"), html);
  });

  it("supports the filter used twice in one render (per-render cache path)", async () => {
    const html = await renderListWidget(
      `{% assign a = 'portfolio' | collection %}{% assign b = 'portfolio' | collection %}` +
        `{% for i in a %}A{{ i.slug }}{% endfor %}{% for i in b %}B{{ i.slug }}{% endfor %}`,
    );
    // both passes resolve identically (cache returns the same shape)
    assert.ok(html.includes("Aalpha") && html.includes("Balpha"), html);
    assert.ok(html.includes("Abravo") && html.includes("Bbravo"), html);
  });

  it("returns [] when no collectionDeps are wired (non-render context)", async () => {
    // Same widget rendered WITHOUT collectionDeps — the filter must yield nothing
    // rather than throw or leak items.
    const dir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "coll-list");
    await fs.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, "widget.liquid"),
      `{% assign items = 'portfolio' | collection %}<n>{{ items.size }}</n>`,
    );
    await fs.writeFile(path.join(dir, "schema.json"), JSON.stringify({ type: "coll-list", settings: [] }));
    const html = await renderWidget(PROJECT_ID, "coll-list", { type: "coll-list", settings: {} }, RAW_THEME, "preview");
    assert.ok(html.includes("<n>0</n>"), html);
  });
});
