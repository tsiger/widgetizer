/**
 * Page CRUD Test Suite
 *
 * Tests page creation, reading, updating, deletion (single + bulk),
 * duplication, savePageContent, and slug handling through the actual
 * controller functions.
 *
 * Uses an isolated DATA_DIR so tests never touch real data.
 * A minimal project is bootstrapped in before() so the page controllers
 * have an active project to work against.
 *
 * Run with: node --test server/tests/pages.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-page-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { getThemeDir, getProjectPagesDir, getPagePath, getProjectDir } = await import("../config.js");

const {
  createPage,
  getPage,
  getAllPages,
  updatePage,
  deletePage,
  bulkDeletePages,
  duplicatePage,
  savePageContent,
} = await import("../controllers/pageController.js");

const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb, getDb } = await import("../db/index.js");
const { LocalStorageAdapter, LocalScopeResolver, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { updateCollectionItemMediaUsage, syncPageMediaUsageOnWrite, getMediaUsage } = await import(
  "../services/mediaUsageService.js"
);

// The page handlers operate on req.adapters.storage over req.scope. Use the real
// OSS storage adapter against the isolated test data root, matching production.
const pageStorage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
// Page writes validate that a newly referenced image still exists, so the asset
// adapter is not optional here any more than it is in a real request.
const pageAssetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
// resolveActiveProject now delegates scope resolution to the injected resolver.
const scopeResolver = new LocalScopeResolver(getDb());

// ============================================================================
// Global teardown
// ============================================================================

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "page-test-project-uuid";
const PROJECT_FOLDER = "page-test-project";

// ============================================================================
// Test helpers
// ============================================================================

let activeProject;

/** Build a mock Express req */
function mockReq({ params = {}, body = {}, query = {} } = {}) {
  return {
    params,
    body,
    query,
    activeProject,
    scope: {
      actor: { id: "default", kind: "local" },
      projectId: activeProject.id,
      folderName: activeProject.folderName,
    },
    adapters: { storage: pageStorage, assetStorage: pageAssetStorage },
    app: { locals: {} },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

/** Build a mock Express res that captures the response */
function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    headersSent: false,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
  };
  return res;
}

async function callController(controllerFn, { params, body, query } = {}) {
  const req = mockReq({ params, body, query });
  const res = mockRes();
  await controllerFn(req, res);
  return res;
}

/** Reset pages directory to empty (keep global/ intact) */
async function resetPages() {
  const pagesDir = getProjectPagesDir(activeProject.folderName);
  // Remove all .json files in pages/ (not the global/ subdirectory)
  const entries = await fs.readdir(pagesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      await fs.remove(path.join(pagesDir, entry.name));
    }
  }
}

/** Helper: create a page and return the response data */
async function createTestPage(name = "Test Page", extraBody = {}) {
  const res = await callController(createPage, {
    body: { name, ...extraBody },
  });
  assert.equal(res._status, 201, `Expected 201 creating "${name}", got ${res._status}: ${JSON.stringify(res._json)}`);
  return res._json;
}

// ============================================================================
// Test setup
// ============================================================================

before(async () => {
  // Create a minimal theme
  const themeDir = getThemeDir("__page_test_theme__");
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "theme.json"), { name: "Page Test Theme", version: "1.0.0", settings: {} });
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html></html>");
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });

  // templates/global/
  await fs.ensureDir(path.join(themeDir, "templates", "global"));
  await fs.writeJson(path.join(themeDir, "templates", "global", "header.json"), { type: "header", widgets: {} });
  await fs.writeJson(path.join(themeDir, "templates", "global", "footer.json"), { type: "footer", widgets: {} });

  // Bootstrap: create a project directly on disk so page controllers work
  activeProject = {
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Page Test Project",
    theme: "__page_test_theme__",
    themeVersion: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  await projectRepo.writeProjectsData({
    projects: [activeProject],
    activeProjectId: activeProject.id,
  });

  // Create project directory structure
  const pagesDir = getProjectPagesDir(activeProject.folderName);
  await fs.ensureDir(pagesDir);
  await fs.ensureDir(path.join(pagesDir, "global"));
  await fs.writeJson(path.join(pagesDir, "global", "header.json"), { type: "header", widgets: {} });
  await fs.writeJson(path.join(pagesDir, "global", "footer.json"), { type: "footer", widgets: {} });
});

// ============================================================================
// Tests
// ============================================================================

// ---------------------------------------------------------------------------
// createPage
// ---------------------------------------------------------------------------

describe("createPage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("creates a page with correct metadata", async () => {
    const page = await createTestPage("My New Page");
    assert.ok(page.uuid, "should have a UUID");
    assert.equal(page.name, "My New Page");
    assert.equal(page.slug, "my-new-page");
    assert.equal(page.id, "my-new-page");
    assert.deepEqual(page.widgets, {});
    assert.ok(page.created);
    assert.ok(page.updated);
  });

  it("writes the page file to disk", async () => {
    const page = await createTestPage("Disk Write");
    const filePath = getPagePath(activeProject.folderName, page.slug);
    assert.ok(await fs.pathExists(filePath));

    const onDisk = await fs.readJson(filePath);
    assert.equal(onDisk.name, "Disk Write");
  });

  it("generates slug from name", async () => {
    const page = await createTestPage("Hello World");
    assert.equal(page.slug, "hello-world");
  });

  it("uses provided slug when given", async () => {
    const page = await createTestPage("Custom Slug Page", { slug: "my-custom-slug" });
    assert.equal(page.slug, "my-custom-slug");
  });

  it("sanitizes provided slug", async () => {
    const page = await createTestPage("Sanitize Test", { slug: "Hello World!" });
    assert.equal(page.slug, "hello-world");
  });

  it("auto-increments slug when duplicate exists", async () => {
    const first = await createTestPage("Services");
    assert.equal(first.slug, "services");

    const second = await createTestPage("Services");
    assert.equal(second.slug, "services-1");

    const third = await createTestPage("Services");
    assert.equal(third.slug, "services-2");
  });

  it("never creates a page named page", async () => {
    const fromName = await createTestPage("Page");
    assert.equal(fromName.slug, "page-1");

    const fromSlug = await createTestPage("Something", { slug: "page" });
    assert.equal(fromSlug.slug, "page-2");
    assert.ok(!(await fs.pathExists(getPagePath(activeProject.folderName, "page"))));
  });

  it("preserves SEO data passed in body", async () => {
    const seo = { description: "A test page", og_title: "OG Title", og_image: "hero.jpg" };
    const page = await createTestPage("SEO Page", { seo });
    assert.deepEqual(page.seo, seo);
  });

  it("preserves special characters in SEO fields without HTML-encoding", async () => {
    const seo = {
      description: 'About & "FAQ" \u2014 Company Info',
      og_title: "Tom's Site \u2014 News & Updates",
    };
    const page = await createTestPage("SEO Special Chars", { seo });
    assert.equal(page.seo.description, seo.description, "description should not be HTML-encoded");
    assert.equal(page.seo.og_title, seo.og_title, "og_title should not be HTML-encoded");
    assert.ok(!page.seo.description.includes("&amp;"), "ampersand should not be encoded in description");
    assert.ok(!page.seo.og_title.includes("&#039;"), "apostrophe should not be encoded in og_title");
  });

  it("preserves full SEO round-trip with all fields", async () => {
    const seo = {
      description: "Full SEO test page",
      og_title: "OG Full Title",
      og_image: "/uploads/images/hero.jpg",
      canonical_url: "https://example.com/full-seo",
      robots: "noindex,follow",
    };
    const page = await createTestPage("Full SEO", { seo });
    assert.equal(page.seo.description, seo.description);
    assert.equal(page.seo.og_title, seo.og_title);
    assert.equal(page.seo.og_image, seo.og_image);
    assert.equal(page.seo.canonical_url, seo.canonical_url);
    assert.equal(page.seo.robots, seo.robots);
  });

  it("returns 404 when no active project", async () => {
    const { resolveActiveProject } = await import("../middleware/resolveActiveProject.js");

    // Temporarily clear the active project
    const original = await projectRepo.readProjectsData();
    await projectRepo.writeProjectsData({ ...original, activeProjectId: null });

    const req = { adapters: { scopeResolver } };
    const res = mockRes();
    let nextCalled = false;
    await resolveActiveProject(req, res, () => { nextCalled = true; });

    assert.equal(res._status, 404);
    assert.match(res._json.error, /no active project/i);
    assert.equal(nextCalled, false);

    // Restore
    await projectRepo.writeProjectsData(original);
  });

  it("preserves special characters in name without HTML-encoding", async () => {
    const name = 'About & "FAQ" \u2014 Info';
    const page = await createTestPage(name);
    assert.equal(page.name, name, "name should not be HTML-encoded");
    assert.ok(!page.name.includes("&amp;"), "ampersand should not be encoded");
    assert.ok(!page.name.includes("&quot;"), "quotes should not be encoded");
  });

  it("rejects empty name (e.g. after HTML tags are stripped)", async () => {
    const res = await callController(createPage, {
      body: { name: "" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });

  it("strips HTML from canonical_url", async () => {
    const seo = {
      canonical_url: 'https://example.com/<script>alert(1)</script>',
    };
    const page = await createTestPage("Canonical Sanitize", { seo });
    assert.ok(!page.seo.canonical_url.includes("<script>"), "canonical_url should not contain script tags");
    assert.ok(page.seo.canonical_url.includes("https://example.com/"), "canonical_url should preserve the valid URL part");
  });

  it("rejects whitespace-only name", async () => {
    const res = await callController(createPage, {
      body: { name: "   " },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });
});

// ---------------------------------------------------------------------------
// getPage
// ---------------------------------------------------------------------------

describe("getPage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("retrieves a page by slug", async () => {
    const created = await createTestPage("Fetch Me");

    const res = await callController(getPage, { params: { id: created.slug } });
    assert.equal(res._status, 200);
    assert.equal(res._json.name, "Fetch Me");
    assert.equal(res._json.slug, "fetch-me");
  });

  it("returns 404 for non-existent page", async () => {
    const res = await callController(getPage, { params: { id: "non-existent" } });
    assert.equal(res._status, 404);
  });

  it("returns full page data including widgets and SEO", async () => {
    await createTestPage("Full Data", { seo: { description: "test" } });

    const res = await callController(getPage, { params: { id: "full-data" } });
    assert.ok(res._json.widgets !== undefined);
    assert.equal(res._json.seo.description, "test");
  });
});

// ---------------------------------------------------------------------------
// getAllPages
// ---------------------------------------------------------------------------

describe("getAllPages", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("returns empty array when no pages exist", async () => {
    const res = await callController(getAllPages);
    assert.equal(res._status, 200);
    assert.deepEqual(res._json, []);
  });

  it("returns all created pages", async () => {
    await createTestPage("Page A");
    await createTestPage("Page B");
    await createTestPage("Page C");

    const res = await callController(getAllPages);
    assert.equal(res._json.length, 3);
  });

  it("does NOT include global widgets (header/footer)", async () => {
    await createTestPage("Regular Page");

    const res = await callController(getAllPages);
    const names = res._json.map((p) => p.name);
    assert.ok(!names.includes("header"));
    assert.ok(!names.includes("footer"));
    assert.equal(res._json.length, 1);
  });

  it("each page has an id matching its filename", async () => {
    await createTestPage("ID Check");

    const res = await callController(getAllPages);
    const page = res._json.find((p) => p.name === "ID Check");
    assert.equal(page.id, "id-check");
  });
});

// Note: the dir-explicit page/global-widget readers (listPagesFromDir /
// readGlobalWidgetFromDir) that replaced the former listProjectPagesData /
// readGlobalWidgetData helpers are covered in projectContentFs.test.js.

// ---------------------------------------------------------------------------
// updatePage
// ---------------------------------------------------------------------------

describe("updatePage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("updates page name", async () => {
    const page = await createTestPage("Old Name");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "New Name", slug: page.slug },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.data.name, "New Name");
  });

  it("preserves UUID across updates", async () => {
    const page = await createTestPage("UUID Preserve");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "UUID Preserve Updated", slug: page.slug },
    });
    assert.equal(res._json.data.uuid, page.uuid);
  });

  it("preserves original creation date", async () => {
    const page = await createTestPage("Created Date");

    await new Promise((r) => setTimeout(r, 10));
    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Created Date Updated", slug: page.slug },
    });
    assert.equal(res._json.data.created, page.created);
  });

  it("updates the 'updated' timestamp", async () => {
    const page = await createTestPage("Timestamp");

    await new Promise((r) => setTimeout(r, 10));
    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Timestamp Updated", slug: page.slug },
    });
    assert.notEqual(res._json.data.updated, page.updated);
  });

  it("renames file when slug changes", async () => {
    const page = await createTestPage("Rename Me");
    const oldPath = getPagePath(activeProject.folderName, page.slug);
    assert.ok(await fs.pathExists(oldPath));

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Rename Me", slug: "renamed-slug" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.data.slug, "renamed-slug");

    // Old file should be gone
    assert.ok(!(await fs.pathExists(oldPath)));
    // New file should exist
    assert.ok(await fs.pathExists(getPagePath(activeProject.folderName, "renamed-slug")));
  });

  it("returns 409 when new slug conflicts with existing page", async () => {
    await createTestPage("Existing");
    const page = await createTestPage("Conflict Me");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Conflict Me", slug: "existing" },
    });
    assert.equal(res._status, 409);
    assert.match(res._json.error, /slug already exists/i);
  });

  it("refuses renaming a page to page", async () => {
    const page = await createTestPage("Rename To Page");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Rename To Page", slug: "page" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /reserved/i);
    assert.ok(await fs.pathExists(getPagePath(activeProject.folderName, page.slug)));
  });

  it("still saves a page that was already named page", async () => {
    const legacy = await createTestPage("Legacy");
    const legacyPath = getPagePath(activeProject.folderName, legacy.slug);
    const onDisk = await fs.readJson(legacyPath);
    await fs.writeJson(getPagePath(activeProject.folderName, "page"), { ...onDisk, id: "page", slug: "page" });
    await fs.remove(legacyPath);

    const res = await callController(updatePage, {
      params: { id: "page" },
      body: { name: "Legacy Renamed", slug: "page" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.data.slug, "page");
  });

  it("generates slug from name when slug is empty", async () => {
    const page = await createTestPage("Auto Slug");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Brand New Name", slug: "" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.data.slug, "brand-new-name");
  });

  it("returns 400 when both name and slug are empty", async () => {
    const page = await createTestPage("Empty Check");

    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "", slug: "" },
    });
    assert.equal(res._status, 400);
  });

  it("preserves widgets when not included in update body", async () => {
    // Create page, then manually add widgets to it on disk
    const page = await createTestPage("Widget Preserve");
    const pagePath = getPagePath(activeProject.folderName, page.slug);
    const onDisk = await fs.readJson(pagePath);
    onDisk.widgets = { "widget-1": { type: "hero", settings: { title: "Hello" } } };
    await fs.writeJson(pagePath, onDisk);

    // Update without sending widgets
    const res = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: "Widget Preserve", slug: page.slug },
    });
    assert.equal(res._json.data.widgets["widget-1"].settings.title, "Hello");
  });
});

// ---------------------------------------------------------------------------
// savePageContent (from editor)
// ---------------------------------------------------------------------------

describe("savePageContent", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("saves page content with widgets", async () => {
    const page = await createTestPage("Editor Page");
    const widgets = {
      w1: { type: "hero", settings: { title: "Hero Title" } },
      w2: { type: "text", settings: { body: "Hello world" } },
    };

    const res = await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "Editor Page", slug: page.slug, widgets },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.success, true);

    // Verify on disk
    const onDisk = await fs.readJson(getPagePath(activeProject.folderName, page.slug));
    assert.equal(Object.keys(onDisk.widgets).length, 2);
    assert.equal(onDisk.widgets.w1.settings.title, "Hero Title");
  });

  it("preserves uuid and created date", async () => {
    const page = await createTestPage("Preserve Check");

    await new Promise((r) => setTimeout(r, 10));
    await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "Preserve Check", slug: page.slug, widgets: { w: { type: "text" } } },
    });

    const onDisk = await fs.readJson(getPagePath(activeProject.folderName, page.slug));
    assert.equal(onDisk.uuid, page.uuid);
    assert.equal(onDisk.created, page.created);
    assert.notEqual(onDisk.updated, page.updated);
  });

  it("handles slug change and deletes old file", async () => {
    const page = await createTestPage("Old Slug");
    const oldPath = getPagePath(activeProject.folderName, page.slug);

    const res = await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "Old Slug", slug: "new-slug", widgets: {} },
    });
    assert.equal(res._status, 200);

    assert.ok(!(await fs.pathExists(oldPath)), "old file should be removed");
    assert.ok(await fs.pathExists(getPagePath(activeProject.folderName, "new-slug")));
  });

  it("refuses a slug change to page", async () => {
    const page = await createTestPage("Editor Rename");

    const res = await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "Editor Rename", slug: "page", widgets: {} },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /reserved/i);
    assert.ok(await fs.pathExists(getPagePath(activeProject.folderName, page.slug)));
    assert.ok(!(await fs.pathExists(getPagePath(activeProject.folderName, "page"))));
  });

  it("saves SEO data", async () => {
    const page = await createTestPage("SEO Save");
    const seo = { description: "Updated description", og_image: "new-hero.jpg" };

    await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "SEO Save", slug: page.slug, widgets: {}, seo },
    });

    const onDisk = await fs.readJson(getPagePath(activeProject.folderName, page.slug));
    assert.equal(onDisk.seo.description, "Updated description");
    assert.equal(onDisk.seo.og_image, "new-hero.jpg");
  });

  it("returns 400 when required fields are missing", async () => {
    const page = await createTestPage("Missing Fields");

    const res = await callController(savePageContent, {
      params: { id: page.slug },
      body: { name: "Missing Fields" }, // missing slug and widgets
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /missing required/i);
  });

  // The widget-count ceiling comes from the limits adapter. Inject a tiny
  // cap so we can exercise the boundary without persisting thousands of widgets.
  function makeWidgets(n) {
    const widgets = {};
    const widgetsOrder = [];
    for (let i = 0; i < n; i++) {
      widgets[`w${i}`] = { type: "text", settings: {} };
      widgetsOrder.push(`w${i}`);
    }
    return { widgets, widgetsOrder };
  }

  it("rejects a page whose widget count exceeds the adapter limit", async () => {
    const page = await createTestPage("Too Many Widgets");
    const req = mockReq({
      params: { id: page.slug },
      body: { name: "Too Many Widgets", slug: page.slug, ...makeWidgets(4) },
    });
    req.adapters.limits = { getLimit: async () => 3 }; // cap below the 4 widgets
    const res = mockRes();
    await savePageContent(req, res);
    assert.equal(res._status, 422);
    assert.match(res._json.error, /too many widgets/i);
  });

  it("allows a page exactly at the widget cap", async () => {
    const page = await createTestPage("At Cap");
    const req = mockReq({
      params: { id: page.slug },
      body: { name: "At Cap", slug: page.slug, ...makeWidgets(3) },
    });
    req.adapters.limits = { getLimit: async () => 3 };
    const res = mockRes();
    await savePageContent(req, res);
    assert.equal(res._status, 200);
    assert.equal(res._json.success, true);
  });

  it("stays unbounded when the adapter reports Infinity (OSS)", async () => {
    const page = await createTestPage("Unbounded");
    const req = mockReq({
      params: { id: page.slug },
      body: { name: "Unbounded", slug: page.slug, ...makeWidgets(50) },
    });
    req.adapters.limits = { getLimit: async () => Infinity };
    const res = mockRes();
    await savePageContent(req, res);
    assert.equal(res._status, 200);
  });
});

// ---------------------------------------------------------------------------
// deletePage
// ---------------------------------------------------------------------------

describe("deletePage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("deletes a page file from disk", async () => {
    const page = await createTestPage("Delete Me");
    const filePath = getPagePath(activeProject.folderName, page.slug);
    assert.ok(await fs.pathExists(filePath));

    const res = await callController(deletePage, { params: { id: page.slug } });
    assert.equal(res._status, 200);
    assert.equal(res._json.success, true);
    assert.ok(!(await fs.pathExists(filePath)));
  });

  it("returns 404 for non-existent page", async () => {
    const res = await callController(deletePage, { params: { id: "ghost-page" } });
    assert.equal(res._status, 404);
  });

  it("page no longer appears in getAllPages after deletion", async () => {
    const page = await createTestPage("Vanishing Page");
    await callController(deletePage, { params: { id: page.slug } });

    const res = await callController(getAllPages);
    assert.equal(res._json.length, 0);
  });
});

// ---------------------------------------------------------------------------
// bulkDeletePages
// ---------------------------------------------------------------------------

describe("bulkDeletePages", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("deletes multiple pages at once", async () => {
    const a = await createTestPage("Bulk A");
    const b = await createTestPage("Bulk B");
    const c = await createTestPage("Bulk C");

    const res = await callController(bulkDeletePages, {
      body: { pageIds: [a.slug, b.slug, c.slug] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.results.deleted.length, 3);

    // Verify all gone
    const remaining = await callController(getAllPages);
    assert.equal(remaining._json.length, 0);
  });

  it("reports not-found pages without failing the whole operation", async () => {
    const page = await createTestPage("Real Page");

    const res = await callController(bulkDeletePages, {
      body: { pageIds: [page.slug, "non-existent-1", "non-existent-2"] },
    });
    // Partial success = 207
    assert.equal(res._status, 207);
    assert.equal(res._json.results.deleted.length, 1);
    assert.equal(res._json.results.notFound.length, 2);
  });

  it("returns 400 when none of the pages exist", async () => {
    const res = await callController(bulkDeletePages, {
      body: { pageIds: ["fake-1", "fake-2"] },
    });
    assert.equal(res._status, 400);
    assert.equal(res._json.results.notFound.length, 2);
  });
});

// ---------------------------------------------------------------------------
// duplicatePage
// ---------------------------------------------------------------------------

describe("duplicatePage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("creates a copy with a '(Copy)' suffix", async () => {
    const page = await createTestPage("Original Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(res._status, 201);
    assert.equal(res._json.name, "Original Page (Copy)");
  });

  it("assigns a new UUID to the copy", async () => {
    const page = await createTestPage("UUID Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.ok(res._json.uuid);
    assert.notEqual(res._json.uuid, page.uuid);
  });

  it("succeeds when a directory named *.json sits in pages/ (F8 — no EISDIR 500)", async () => {
    const page = await createTestPage("Dir Hazard");
    // A directory whose name ends in .json passes the .endsWith(".json") filter;
    // reading it as a file would throw EISDIR and 500 the whole duplicate.
    const pagesDir = getProjectPagesDir(activeProject.folderName);
    await fs.ensureDir(path.join(pagesDir, "evil.json"));

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.equal(res._json.name, "Dir Hazard (Copy)");

    await fs.remove(path.join(pagesDir, "evil.json"));
  });

  it("generates a new slug for the copy", async () => {
    const page = await createTestPage("Slug Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.notEqual(res._json.slug, page.slug);
    assert.equal(res._json.slug, "slug-page-copy");
  });

  it("preserves widgets from the original", async () => {
    const page = await createTestPage("Widget Page");
    // Add widgets to the page on disk
    const pagePath = getPagePath(activeProject.folderName, page.slug);
    const onDisk = await fs.readJson(pagePath);
    onDisk.widgets = { hero: { type: "hero", settings: { title: "Keep Me" } } };
    await fs.writeJson(pagePath, onDisk);

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(res._json.widgets.hero.settings.title, "Keep Me");
  });

  it("increments copy number for multiple duplicates", async () => {
    const page = await createTestPage("Multi Copy");

    const first = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(first._json.name, "Multi Copy (Copy)");

    const second = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(second._json.name, "Multi Copy (Copy 2)");

    const third = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(third._json.name, "Multi Copy (Copy 3)");
  });

  it("duplicating a copy names correctly (strips existing copy suffix)", async () => {
    const page = await createTestPage("Base Page");
    const copy1 = await callController(duplicatePage, { params: { id: page.slug } });
    // Now duplicate the copy itself
    const copy2 = await callController(duplicatePage, { params: { id: copy1._json.slug } });
    // Should be "Base Page (Copy 2)", not "Base Page (Copy) (Copy)"
    assert.equal(copy2._json.name, "Base Page (Copy 2)");
  });

  it("returns 500 when page does not exist", async () => {
    const res = await callController(duplicatePage, { params: { id: "non-existent" } });
    assert.equal(res._status, 500);
  });

  it("creates a file on disk for the duplicate", async () => {
    const page = await createTestPage("Disk Dup");
    const res = await callController(duplicatePage, { params: { id: page.slug } });

    const dupPath = getPagePath(activeProject.folderName, res._json.slug);
    assert.ok(await fs.pathExists(dupPath));
  });
});

// ---------------------------------------------------------------------------
// deletePage / bulkDeletePages — re-sync collection-item media usage
//
// Deleting a page clears collection-item links that point to it, and must
// re-derive those items' media usage — but only if the controller calls
// cleanupDeletedPageReferences(storage, scope, …), whose media-usage sync keys
// off scope.projectId. We make the re-sync
// observable with a collection-item link that carries BOTH the deleted page's
// uuid AND a media href: clearing the link drops the media reference, so a
// re-synced usage index goes from ["collection:item-alpha"] -> []. The
// link is cleared on disk regardless, but the usage INDEX only updates when
// projectId is passed — so this asserts the caller-threading, not just the
// function-level behaviour (which collectionLinkEnrichment.test.js covers).
// ---------------------------------------------------------------------------

/** Write a collection item file by hand (no controller for this in OSS tests). */
async function writeCollectionItem(type, slug, settings) {
  await fs.outputJSON(path.join(getProjectDir(activeProject.folderName), "collections", type, `${slug}.json`), {
    id: slug,
    uuid: `item-${slug}`,
    slug,
    settings,
  });
}

/** Read a collection item file back. */
function readCollectionItem(type, slug) {
  return fs.readJSON(path.join(getProjectDir(activeProject.folderName), "collections", type, `${slug}.json`));
}

/**
 * Seed: a media file used only via a collection item's link href, where that
 * link also targets `pageUuid`. Returns nothing; asserts the seeded usage.
 */
async function seedItemLinkingToPage(pageUuid) {
  await writeMediaFile(PROJECT_ID, {
    files: [{ id: "f1", filename: "x.pdf", path: "/uploads/files/x.pdf", type: "application/pdf", usedIn: [] }],
  });
  await writeCollectionItem("portfolio", "alpha", {
    title: "Alpha",
    doc: { pageUuid, href: "/uploads/files/x.pdf", text: "Doc", target: "_self" },
  });
  await updateCollectionItemMediaUsage(PROJECT_ID, await readCollectionItem("portfolio", "alpha"));
  assert.deepEqual(
    (await getMediaUsage(PROJECT_ID, "f1")).usedIn,
    ["collection:item-alpha"],
    "precondition: the media file is seeded as used by the collection item",
  );
}

describe("deletePage — a page with no uuid", () => {
  beforeEach(async () => {
    await resetPages();
  });

  /** Seed a page file written before uuids existed, plus its slug-keyed usage row. */
  async function seedUuidlessPage(slug) {
    await writeMediaFile(PROJECT_ID, {
      files: [{ id: "f1", filename: "x.pdf", path: "/uploads/files/x.pdf", type: "application/pdf", usedIn: [] }],
    });
    const pageData = {
      id: slug,
      slug,
      title: "Legacy",
      widgets: { w1: { type: "text", settings: { doc: { href: "/uploads/files/x.pdf", text: "Doc", target: "_self" } } } },
    };
    await fs.outputJSON(path.join(getProjectPagesDir(activeProject.folderName), `${slug}.json`), pageData);
    await syncPageMediaUsageOnWrite(PROJECT_ID, pageData);
    assert.deepEqual(
      (await getMediaUsage(PROJECT_ID, "f1")).usedIn,
      [`page:slug:${slug}`],
      "precondition: usage is keyed by the pending slug id",
    );
  }

  it("clears the row recorded under its slug", async () => {
    await seedUuidlessPage("legacy");

    const res = await callController(deletePage, { params: { id: "legacy" } });
    assert.equal(res._status, 200);

    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, [], "no orphaned usage row survives the delete");
  });

  it("clears it via bulkDeletePages too", async () => {
    await seedUuidlessPage("legacy-bulk");

    const res = await callController(bulkDeletePages, { body: { pageIds: ["legacy-bulk"] } });
    assert.ok(res._json.results.deleted.includes("legacy-bulk"));

    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, []);
  });
});

describe("deletePage — re-syncs collection-item media usage", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("re-derives a linked collection item's media usage when its target page is deleted", async () => {
    const page = await createTestPage("Linked Page");
    await seedItemLinkingToPage(page.uuid);

    const res = await callController(deletePage, { params: { id: page.id } });
    assert.equal(res._status, 200);

    // The link is cleared AND the usage index re-synced -> the file is now unused.
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, []);
  });

  it("re-derives media usage via bulkDeletePages too", async () => {
    const page = await createTestPage("Linked Page Bulk");
    await seedItemLinkingToPage(page.uuid);

    const res = await callController(bulkDeletePages, { body: { pageIds: [page.id] } });
    assert.ok(res._json.results.deleted.includes(page.id));

    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, []);
  });
});

// ============================================================================
// Breadcrumb hierarchy: parent pages and the listing anchor
// ============================================================================

describe("parentPageUuid", () => {
  before(async () => {
    await resetPages();
  });

  it("round-trips through update and read", async () => {
    const parent = await createTestPage("About Us");
    const child = await createTestPage("Our Team");

    const res = await callController(updatePage, {
      params: { id: child.slug },
      body: { name: child.name, slug: child.slug, parentPageUuid: parent.uuid },
    });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    const read = await callController(getPage, { params: { id: child.slug } });
    assert.equal(read._json.parentPageUuid, parent.uuid);
  });

  it("drops the field when cleared", async () => {
    const parent = await createTestPage("Parent To Clear");
    const child = await createTestPage("Child To Clear");
    await callController(updatePage, {
      params: { id: child.slug },
      body: { name: child.name, slug: child.slug, parentPageUuid: parent.uuid },
    });

    await callController(updatePage, {
      params: { id: child.slug },
      body: { name: child.name, slug: child.slug, parentPageUuid: "" },
    });

    const read = await callController(getPage, { params: { id: child.slug } });
    assert.equal("parentPageUuid" in read._json, false);
  });

  // The picker never offers the page itself, but a direct API call must not be
  // able to write a self-parent either.
  it("refuses to store a page as its own parent", async () => {
    const page = await createTestPage("Self Parent");
    await callController(updatePage, {
      params: { id: page.slug },
      body: { name: page.name, slug: page.slug, parentPageUuid: page.uuid },
    });

    const read = await callController(getPage, { params: { id: page.slug } });
    assert.equal("parentPageUuid" in read._json, false);
  });

  it("clears the pointer on pages whose parent is deleted", async () => {
    const parent = await createTestPage("Doomed Parent");
    const child = await createTestPage("Surviving Child");
    await callController(updatePage, {
      params: { id: child.slug },
      body: { name: child.name, slug: child.slug, parentPageUuid: parent.uuid },
    });

    await callController(deletePage, { params: { id: parent.slug } });

    const read = await callController(getPage, { params: { id: child.slug } });
    assert.equal(read._status, 200);
    assert.equal("parentPageUuid" in read._json, false);
  });
});

describe("listing anchor (one page per collection)", () => {
  const gridWidget = (anchor) => ({
    w1: { type: "news-grid", settings: { listing_anchor: anchor } },
  });

  before(async () => {
    await resetPages();
    // The widget's schema is what says which collection it lists — without it
    // nothing can hold an anchor.
    await fs.outputFile(
      path.join(getProjectDir(activeProject.folderName), "widgets", "news-grid", "schema.json"),
      JSON.stringify({
        type: "news-grid",
        collection: { type: "news", perPageSetting: "limit" },
        settings: [{ type: "number", id: "limit", default: 3 }],
      }),
    );
  });

  const saveWith = async (slug, name, widgets) =>
    callController(savePageContent, {
      params: { id: slug },
      body: { name, slug, widgets, widgetsOrder: Object.keys(widgets) },
    });

  it("moves the anchor off the previous page and reports which", async () => {
    const first = await createTestPage("Blog");
    const second = await createTestPage("News Archive");

    await saveWith(first.slug, first.name, gridWidget(true));
    const res = await saveWith(second.slug, second.name, gridWidget(true));

    assert.equal(res._status, 200);
    assert.deepEqual(res._json.listingAnchorMovedFrom, ["Blog"]);

    const firstRead = await callController(getPage, { params: { id: first.slug } });
    assert.equal(firstRead._json.widgets.w1.settings.listing_anchor, false);
    const secondRead = await callController(getPage, { params: { id: second.slug } });
    assert.equal(secondRead._json.widgets.w1.settings.listing_anchor, true);
  });

  it("says nothing when the saved page claims no anchor", async () => {
    const page = await createTestPage("Plain Listing");
    const res = await saveWith(page.slug, page.name, gridWidget(false));
    assert.equal("listingAnchorMovedFrom" in res._json, false);
  });

  // A duplicate is written directly, so the save-time sweep never sees it. Left
  // alone, both pages would claim the collection and slug order would decide.
  it("does not carry the anchor onto a duplicated page", async () => {
    const original = await createTestPage("Anchored Original");
    await saveWith(original.slug, original.name, gridWidget(true));

    const dup = await callController(duplicatePage, { params: { id: original.slug } });
    assert.equal(dup._status, 201, JSON.stringify(dup._json));

    const copy = await callController(getPage, { params: { id: dup._json.slug } });
    assert.equal(copy._json.widgets.w1.settings.listing_anchor, false);
    // The original keeps it.
    const kept = await callController(getPage, { params: { id: original.slug } });
    assert.equal(kept._json.widgets.w1.settings.listing_anchor, true);
  });

  it("leaves a widget alone when its schema declares no collection", async () => {
    await fs.outputFile(
      path.join(getProjectDir(activeProject.folderName), "widgets", "plain-grid", "schema.json"),
      JSON.stringify({ type: "plain-grid", settings: [] }),
    );
    const holder = await createTestPage("Holds Anchor");
    const other = await createTestPage("Undeclared Widget");

    await saveWith(holder.slug, holder.name, gridWidget(true));
    await saveWith(other.slug, other.name, { w1: { type: "plain-grid", settings: { listing_anchor: true } } });

    // The undeclared widget lists nothing, so it never took the news anchor away.
    const holderRead = await callController(getPage, { params: { id: holder.slug } });
    assert.equal(holderRead._json.widgets.w1.settings.listing_anchor, true);
  });

  it("makes a paginating widget its collection's anchor", async () => {
    const holder = await createTestPage("Old Blog");
    await saveWith(holder.slug, holder.name, gridWidget(true));

    const page = await createTestPage("Paged Blog");
    const res = await saveWith(page.slug, page.name, {
      w1: { type: "news-grid", settings: { paginate: true, listing_anchor: false } },
    });
    assert.equal(res._status, 200);
    assert.deepEqual(res._json.listingAnchorMovedFrom, ["Old Blog"]);

    const read = await callController(getPage, { params: { id: page.slug } });
    assert.equal(read._json.widgets.w1.settings.listing_anchor, true);
  });

  it("refuses a second paginating widget on the same page", async () => {
    const page = await createTestPage("Two Pagers");
    const res = await saveWith(page.slug, page.name, {
      w1: { type: "news-grid", settings: { paginate: true } },
      w2: { type: "news-grid", settings: { paginate: true } },
    });
    assert.equal(res._status, 422);
    const read = await callController(getPage, { params: { id: page.slug } });
    assert.deepEqual(read._json.widgets, {});
  });

  it("does not carry pagination onto a duplicated page", async () => {
    const original = await createTestPage("Paged Original");
    await saveWith(original.slug, original.name, { w1: { type: "news-grid", settings: { paginate: true } } });

    const dup = await callController(duplicatePage, { params: { id: original.slug } });
    const copy = await callController(getPage, { params: { id: dup._json.slug } });
    assert.equal(copy._json.widgets.w1.settings.paginate, false);
    assert.equal(copy._json.widgets.w1.settings.listing_anchor, false);
  });

  it("refuses items per page that are not a whole number of at least 1", async () => {
    const page = await createTestPage("Bad Per Page");
    for (const limit of [0, -2, 2.5, "abc", ""]) {
      const res = await saveWith(page.slug, page.name, { w1: { type: "news-grid", settings: { paginate: true, limit } } });
      assert.equal(res._status, 422, JSON.stringify(limit));
    }
  });

  it("falls back to the schema default when items per page is missing", async () => {
    const page = await createTestPage("Default Per Page");
    const res = await saveWith(page.slug, page.name, { w1: { type: "news-grid", settings: { paginate: true } } });
    assert.equal(res._status, 200);
  });

  it("turns pagination off on a widget whose schema cannot paginate", async () => {
    await fs.outputFile(
      path.join(getProjectDir(activeProject.folderName), "widgets", "plain-grid", "schema.json"),
      JSON.stringify({ type: "plain-grid", settings: [] }),
    );
    const page = await createTestPage("Cannot Paginate");
    const res = await saveWith(page.slug, page.name, { w1: { type: "plain-grid", settings: { paginate: true } } });
    assert.equal(res._status, 200);

    const read = await callController(getPage, { params: { id: page.slug } });
    assert.equal(read._json.widgets.w1.settings.paginate, false);
    assert.notEqual(read._json.widgets.w1.settings.listing_anchor, true);
  });

  it("turns pagination off on the page that loses the anchor", async () => {
    const first = await createTestPage("Paged First");
    const second = await createTestPage("Paged Second");
    await saveWith(first.slug, first.name, { w1: { type: "news-grid", settings: { paginate: true } } });
    await saveWith(second.slug, second.name, { w1: { type: "news-grid", settings: { paginate: true } } });

    const firstRead = await callController(getPage, { params: { id: first.slug } });
    assert.equal(firstRead._json.widgets.w1.settings.paginate, false);
    assert.equal(firstRead._json.widgets.w1.settings.listing_anchor, false);
    const secondRead = await callController(getPage, { params: { id: second.slug } });
    assert.equal(secondRead._json.widgets.w1.settings.paginate, true);
    assert.equal(secondRead._json.widgets.w1.settings.listing_anchor, true);
  });

  it("applies the same rules when widgets arrive through the page details update", async () => {
    const page = await createTestPage("Details Update");
    const twoPagers = {
      w1: { type: "news-grid", settings: { paginate: true } },
      w2: { type: "news-grid", settings: { paginate: true } },
    };
    const refused = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: page.name, slug: page.slug, widgets: twoPagers },
    });
    assert.equal(refused._status, 422);

    const holder = await createTestPage("Details Holder");
    await saveWith(holder.slug, holder.name, { w1: { type: "news-grid", settings: { paginate: true } } });
    const accepted = await callController(updatePage, {
      params: { id: page.slug },
      body: { name: page.name, slug: page.slug, widgets: { w1: { type: "news-grid", settings: { paginate: true } } } },
    });
    assert.equal(accepted._status, 200);
    assert.equal(accepted._json.data.widgets.w1.settings.listing_anchor, true);
    assert.deepEqual(accepted._json.listingAnchorMovedFrom, ["Details Holder"]);
  });

  it("does not fail on a malformed widget schema, and a later paginator still works", async () => {
    await fs.outputFile(
      path.join(getProjectDir(activeProject.folderName), "widgets", "broken-grid", "schema.json"),
      JSON.stringify({ type: "broken-grid", collection: { type: "news", perPageSetting: "limit" }, settings: {} }),
    );
    const page = await createTestPage("Broken First");
    const res = await saveWith(page.slug, page.name, {
      w1: { type: "broken-grid", settings: { paginate: true, limit: 2 } },
      w2: { type: "news-grid", settings: { paginate: true } },
    });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    const read = await callController(getPage, { params: { id: page.slug } });
    assert.equal(read._json.widgets.w1.settings.paginate, false);
    assert.equal(read._json.widgets.w2.settings.paginate, true);
    assert.equal(read._json.widgets.w2.settings.listing_anchor, true);
  });
});

// ---------------------------------------------------------------------------
// Languages: every page key goes through the addressing layer
// ---------------------------------------------------------------------------

describe("pages in another language", () => {
  const EL = { language: "el" };
  const projectDir = () => getProjectDir(activeProject.folderName);
  const greekPagePath = (slug) => path.join(getProjectPagesDir(activeProject.folderName), "el", `${slug}.json`);

  before(() => {
    activeProject.defaultLanguage = "en";
    activeProject.languages = ["el"];
    // Persisted too, not just on the in-memory request object: the language check
    // at each write re-reads the project row, which is what a real removal updates.
    projectRepo.updateProject(activeProject.id, { defaultLanguage: "en", languages: ["el"] });
  });

  after(() => {
    delete activeProject.defaultLanguage;
    delete activeProject.languages;
    projectRepo.updateProject(activeProject.id, { defaultLanguage: "en", languages: [] });
  });

  beforeEach(async () => {
    await resetPages();
    await fs.remove(path.join(getProjectPagesDir(activeProject.folderName), "el"));
    await fs.remove(path.join(projectDir(), "menus"));
  });

  it("writes a Greek page in its folder, without a language field, in its own translation group", async () => {
    const page = await createTestPage("Epikoinonia", EL);
    assert.equal(page.language, "el");
    assert.equal(page.translationGroupId, page.uuid);
    const onDisk = await fs.readJson(greekPagePath("epikoinonia"));
    assert.equal(onDisk.uuid, page.uuid);
    assert.equal("language" in onDisk, false, "the folder says the language, the file never does");
    assert.equal(onDisk.translationGroupId, page.uuid);
  });

  it("keeps the default language at the root and strips a language echoed back by the client", async () => {
    const page = await createTestPage("Contact", { language: "en" });
    assert.equal(page.language, "en");
    const rootPath = getPagePath(activeProject.folderName, "contact");
    assert.equal("language" in (await fs.readJson(rootPath)), false);

    const saved = await callController(savePageContent, {
      params: { id: "contact" },
      body: { ...page, widgets: {} },
    });
    assert.equal(saved._status, 200, JSON.stringify(saved._json));
    assert.equal("language" in (await fs.readJson(rootPath)), false);
  });

  it("lets the same slug exist once per language, and lists both with their language", async () => {
    const en = await createTestPage("Gallery");
    const el = await createTestPage("Gallery", EL);
    assert.equal(en.slug, "gallery");
    assert.equal(el.slug, "gallery", "no -1 suffix: uniqueness is per language folder");

    const list = await callController(getAllPages);
    const galleries = list._json.filter((p) => p.slug === "gallery").map((p) => p.language).sort();
    assert.deepEqual(galleries, ["el", "en"]);

    const read = await callController(getPage, { params: { id: "gallery" }, query: EL });
    assert.equal(read._json.uuid, el.uuid);
    assert.equal(read._json.language, "el");
  });

  it("refuses a root page slugged like an enabled language, but not the same slug inside a language", async () => {
    const root = await callController(createPage, { body: { name: "Greek", slug: "el" } });
    assert.equal(root._status, 201);
    assert.equal(root._json.slug, "el-1", "the reserved slug is skipped, not taken");

    const renamed = await callController(updatePage, { params: { id: "el-1" }, body: { name: "Greek", slug: "el" } });
    assert.equal(renamed._status, 400);

    const inside = await callController(createPage, { body: { name: "Italian", slug: "it", ...EL } });
    assert.equal(inside._status, 201);
    assert.equal(inside._json.slug, "it");
  });

  it("refuses a language the project has not enabled", async () => {
    const created = await callController(createPage, { body: { name: "Bonjour", language: "fr" } });
    assert.equal(created._status, 400);
    assert.match(created._json.message, /"fr"/);
    const read = await callController(getPage, { params: { id: "anything" }, query: { language: "fr" } });
    assert.equal(read._status, 400);
    const malformed = await callController(createPage, { body: { name: "Odd", language: "not-a-language" } });
    assert.equal(malformed._status, 400, "a malformed code is refused, never handed to the path builder");
    assert.equal(await fs.pathExists(path.join(getProjectPagesDir(activeProject.folderName), "not-a-language")), false);
  });

  it("updates, saves, duplicates and deletes inside the language folder", async () => {
    const page = await createTestPage("Nea", EL);

    const renamed = await callController(updatePage, {
      params: { id: "nea" },
      body: { name: "Nea", slug: "ta-nea", ...EL },
    });
    assert.equal(renamed._status, 200, JSON.stringify(renamed._json));
    assert.equal(renamed._json.data.language, "el");
    assert.equal(renamed._json.data.translationGroupId, page.uuid);
    assert.equal(await fs.pathExists(greekPagePath("nea")), false);
    assert.equal(await fs.pathExists(greekPagePath("ta-nea")), true);

    const saved = await callController(savePageContent, {
      params: { id: "ta-nea" },
      body: { name: "Nea", slug: "ta-nea", widgets: { w1: { type: "text", settings: {} } }, ...EL },
    });
    assert.equal(saved._status, 200);
    assert.equal((await fs.readJson(greekPagePath("ta-nea"))).translationGroupId, page.uuid);

    const copy = await callController(duplicatePage, { params: { id: "ta-nea" }, query: EL });
    assert.equal(copy._status, 201);
    assert.equal(copy._json.language, "el");
    assert.equal(copy._json.translationGroupId, copy._json.uuid, "a copy starts its own group");
    assert.equal(await fs.pathExists(greekPagePath(copy._json.slug)), true);

    const deleted = await callController(deletePage, { params: { id: "ta-nea" }, query: EL });
    assert.equal(deleted._status, 200);
    assert.equal(await fs.pathExists(greekPagePath("ta-nea")), false);

    const bulk = await callController(bulkDeletePages, { body: { pageIds: [copy._json.slug], ...EL } });
    assert.equal(bulk._status, 200);
    assert.equal(await fs.pathExists(greekPagePath(copy._json.slug)), false);
  });

  it("clears references to a deleted page in every language's pages and menus", async () => {
    const target = await createTestPage("Target");
    const greek = await createTestPage("Greek Linker", EL);
    await callController(savePageContent, {
      params: { id: "greek-linker" },
      body: {
        ...greek,
        widgets: { w1: { type: "cta", settings: { link: { href: "target.html", pageUuid: target.uuid } } } },
      },
    });
    const menuPath = path.join(projectDir(), "menus", "el", "main.json");
    await fs.outputJson(menuPath, {
      id: "main",
      uuid: "menu-el",
      items: [{ id: "i1", label: "Target", link: "target.html", pageUuid: target.uuid }],
    });

    const deleted = await callController(deletePage, { params: { id: "target" } });
    assert.equal(deleted._status, 200);

    const linker = await fs.readJson(greekPagePath("greek-linker"));
    assert.equal(linker.widgets.w1.settings.link.pageUuid, undefined);
    assert.equal(linker.widgets.w1.settings.link.href, "");
    const menu = await fs.readJson(menuPath);
    assert.equal(menu.items[0].pageUuid, undefined);
    assert.equal(menu.items[0].link, "");
  });
});
