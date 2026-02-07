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

const { getProjectsFilePath, getProjectPagesDir, getPagePath } = await import("../config.js");

const {
  createPage,
  getPage,
  getAllPages,
  updatePage,
  deletePage,
  bulkDeletePages,
  duplicatePage,
  savePageContent,
  listProjectPagesData,
  readGlobalWidgetData,
} = await import("../controllers/pageController.js");

const { writeProjectsFile } = await import("../controllers/projectController.js");

// ============================================================================
// Test helpers
// ============================================================================

// Our test project metadata — created in before()
let activeProject;

/** Build a mock Express req */
function mockReq({ params = {}, body = {} } = {}) {
  return {
    params,
    body,
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

async function callController(controllerFn, { params, body } = {}) {
  const req = mockReq({ params, body });
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
// Test setup & teardown
// ============================================================================

before(async () => {
  // Create a minimal theme so createProject works
  const themeDir = path.join(TEST_THEMES_DIR, "__page_test_theme__");
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "theme.json"), { name: "Page Test Theme", version: "1.0.0", settings: {} });
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html></html>");
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });

  // templates/global/
  await fs.ensureDir(path.join(themeDir, "templates", "global"));
  await fs.writeJson(path.join(themeDir, "templates", "global", "header.json"), { type: "header", widgets: {} });
  await fs.writeJson(path.join(themeDir, "templates", "global", "footer.json"), { type: "footer", widgets: {} });

  // Bootstrap: create a project directly on disk so page controllers work
  // (avoids needing the full createProject flow, which we already tested)
  activeProject = {
    id: "page-test-project-uuid",
    folderName: "page-test-project",
    name: "Page Test Project",
    theme: "__page_test_theme__",
    themeVersion: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  await fs.ensureDir(path.join(TEST_DATA_DIR, "projects"));
  await writeProjectsFile({
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

after(async () => {
  await fs.remove(TEST_ROOT);
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

  it("preserves SEO data passed in body", async () => {
    const seo = { description: "A test page", og_title: "OG Title", og_image: "hero.jpg" };
    const page = await createTestPage("SEO Page", { seo });
    assert.deepEqual(page.seo, seo);
  });

  it("returns 404 when no active project", async () => {
    // Temporarily clear the active project
    const original = await fs.readJson(getProjectsFilePath());
    await writeProjectsFile({ ...original, activeProjectId: null });

    const res = await callController(createPage, {
      body: { name: "No Project Page" },
    });
    assert.equal(res._status, 404);

    // Restore
    await writeProjectsFile(original);
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

// ---------------------------------------------------------------------------
// listProjectPagesData (exported helper)
// ---------------------------------------------------------------------------

describe("listProjectPagesData", () => {
  beforeEach(async () => {
    await resetPages();
  });

  it("returns page data directly by folderName", async () => {
    await createTestPage("Direct Access");
    const pages = await listProjectPagesData(activeProject.folderName);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].name, "Direct Access");
  });

  it("returns empty array for non-existent project", async () => {
    const pages = await listProjectPagesData("non-existent-folder");
    assert.deepEqual(pages, []);
  });
});

// ---------------------------------------------------------------------------
// readGlobalWidgetData (exported helper)
// ---------------------------------------------------------------------------

describe("readGlobalWidgetData", () => {
  it("reads header global widget", async () => {
    const header = await readGlobalWidgetData(activeProject.folderName, "header");
    assert.ok(header);
    assert.equal(header.type, "header");
  });

  it("reads footer global widget", async () => {
    const footer = await readGlobalWidgetData(activeProject.folderName, "footer");
    assert.ok(footer);
    assert.equal(footer.type, "footer");
  });

  it("returns null for invalid widget type", async () => {
    const result = await readGlobalWidgetData(activeProject.folderName, "sidebar");
    assert.equal(result, null);
  });

  it("returns null for non-existent project", async () => {
    const result = await readGlobalWidgetData("non-existent", "header");
    assert.equal(result, null);
  });
});

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
      "w1": { type: "hero", settings: { title: "Hero Title" } },
      "w2": { type: "text", settings: { body: "Hello world" } },
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

  it("creates a copy with 'Copy of' prefix", async () => {
    const page = await createTestPage("Original Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(res._status, 201);
    assert.equal(res._json.name, "Copy of Original Page");
  });

  it("assigns a new UUID to the copy", async () => {
    const page = await createTestPage("UUID Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.ok(res._json.uuid);
    assert.notEqual(res._json.uuid, page.uuid);
  });

  it("generates a new slug for the copy", async () => {
    const page = await createTestPage("Slug Page");

    const res = await callController(duplicatePage, { params: { id: page.slug } });
    assert.notEqual(res._json.slug, page.slug);
    assert.match(res._json.slug, /copy-of-slug-page/);
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
    assert.equal(first._json.name, "Copy of Multi Copy");

    const second = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(second._json.name, "Copy 2 of Multi Copy");

    const third = await callController(duplicatePage, { params: { id: page.slug } });
    assert.equal(third._json.name, "Copy 3 of Multi Copy");
  });

  it("duplicating a copy names correctly (strips existing Copy prefix)", async () => {
    const page = await createTestPage("Base Page");
    const copy1 = await callController(duplicatePage, { params: { id: page.slug } });
    // Now duplicate the copy itself
    const copy2 = await callController(duplicatePage, { params: { id: copy1._json.slug } });
    // Should be "Copy 2 of Base Page", not "Copy of Copy of Base Page"
    assert.equal(copy2._json.name, "Copy 2 of Base Page");
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
