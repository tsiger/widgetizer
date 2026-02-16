/**
 * Project CRUD Test Suite
 *
 * Tests project creation, reading, updating, deletion, duplication, and
 * active project management through the actual controller functions.
 *
 * Uses an isolated DATA_DIR and THEMES_DIR so tests never touch real data.
 *
 * Run with: node --test server/tests/projects.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

// Create a temporary directory tree for each run
const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-project-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

// Override env BEFORE importing any server modules
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Now import server modules — they'll use our overridden paths
const { DATA_DIR, THEMES_DIR, getProjectDir, getProjectPagesDir, getProjectMenusDir } =
  await import("../config.js");

const {
  readProjectsFile,
  writeProjectsFile,
  getAllProjects,
  getActiveProject,
  createProject,
  setActiveProject,
  updateProject,
  deleteProject,
  duplicateProject,
  exportProject,
  importProject,
} = await import("../controllers/projectController.js");
const { closeDb } = await import("../db/index.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { PassThrough } = await import("stream");
const AdmZip = await import("adm-zip");

// ============================================================================
// Test helpers
// ============================================================================

/** Create a minimal theme with templates and menus for project creation */
async function createTestTheme(themeId = "__test_theme__") {
  const themeDir = path.join(TEST_THEMES_DIR, themeId);
  await fs.ensureDir(themeDir);

  // theme.json
  await fs.writeJson(path.join(themeDir, "theme.json"), {
    name: "Test Theme",
    version: "1.0.0",
    settings: {
      global: {
        colors: [{ id: "primary", label: "Primary", default: "#000" }],
      },
    },
  });

  // layout.liquid
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html><body>{{ content }}</body></html>");

  // templates/
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), {
    name: "Home",
    slug: "index",
    widgets: {},
  });
  await fs.writeJson(path.join(themeDir, "templates", "about.json"), {
    name: "About",
    slug: "about",
    widgets: {},
  });

  // templates/global/
  await fs.ensureDir(path.join(themeDir, "templates", "global"));
  await fs.writeJson(path.join(themeDir, "templates", "global", "header.json"), {
    type: "header",
    widgets: {},
  });
  await fs.writeJson(path.join(themeDir, "templates", "global", "footer.json"), {
    type: "footer",
    widgets: {},
  });

  // menus/
  await fs.ensureDir(path.join(themeDir, "menus"));
  await fs.writeJson(path.join(themeDir, "menus", "main-menu.json"), {
    id: "main-menu",
    name: "Main Menu",
    items: [
      { id: "item_1", label: "Home", link: "index.html" },
      { id: "item_2", label: "About", link: "about.html" },
    ],
  });

  // assets/
  await fs.ensureDir(path.join(themeDir, "assets"));
  await fs.writeFile(path.join(themeDir, "assets", "base.css"), "body { margin: 0; }");

  // widgets/
  await fs.ensureDir(path.join(themeDir, "widgets", "hero"));
  await fs.writeJson(path.join(themeDir, "widgets", "hero", "schema.json"), { name: "Hero", version: "1.0.0" });

  return themeId;
}

/** Build a mock Express req object */
function mockReq({ params = {}, body = {}, file = null } = {}) {
  return {
    params,
    body,
    file,
    // express-validator needs these to exist
    [Symbol.for("express-validator#contexts")]: [],
  };
}

/** Build a mock Express res object that captures the response */
function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
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
    setHeader(key, value) {
      res._headers[key] = value;
      return res;
    },
  };
  return res;
}

/**
 * Helper to call a controller function that uses express-validator.
 * We bypass validation and call the controller directly (the route layer
 * handles validation in production; here we test the controller logic).
 */
async function callController(controllerFn, { params, body, file } = {}) {
  const req = mockReq({ params, body, file });
  const res = mockRes();
  await controllerFn(req, res);
  return res;
}

/** Reset projects to a clean state */
async function resetProjects() {
  await fs.ensureDir(path.join(TEST_DATA_DIR, "projects"));
  await writeProjectsFile({ projects: [], activeProjectId: null });
}

/** Helper: create a project and return the response data */
async function createTestProject(name = "Test Project", extraBody = {}) {
  const res = await callController(createProject, {
    body: { name, description: "A test project", theme: "__test_theme__", ...extraBody },
  });
  assert.equal(res._status, 201, `Expected 201 creating "${name}", got ${res._status}: ${JSON.stringify(res._json)}`);
  return res._json;
}

/** Reusable media fixture for testing export/import/duplicate */
function createTestMediaData() {
  return {
    files: [
      {
        id: "test-media-1",
        filename: "photo.jpg",
        originalName: "photo.jpg",
        type: "image/jpeg",
        size: 50000,
        uploaded: "2025-01-01T00:00:00.000Z",
        path: "/uploads/images/photo.jpg",
        metadata: { alt: "A photo", title: "Photo" },
        width: 800,
        height: 600,
        sizes: {
          thumb: { path: "/uploads/images/photo-thumb.jpg", width: 150, height: 112 },
        },
        usedIn: ["index"],
      },
      {
        id: "test-media-2",
        filename: "banner.png",
        originalName: "banner.png",
        type: "image/png",
        size: 120000,
        uploaded: "2025-01-01T00:00:00.000Z",
        path: "/uploads/images/banner.png",
        metadata: { alt: "Banner", title: "Site Banner" },
        width: 1920,
        height: 400,
        sizes: {},
        usedIn: [],
      },
    ],
  };
}

// ============================================================================
// Test setup & teardown
// ============================================================================

before(async () => {
  // Verify our env override worked
  assert.equal(DATA_DIR, TEST_DATA_DIR, "DATA_DIR should use test override");
  assert.equal(THEMES_DIR, TEST_THEMES_DIR, "THEMES_DIR should use test override");

  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(TEST_THEMES_DIR);
  await createTestTheme();
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Tests
// ============================================================================

// ---------------------------------------------------------------------------
// readProjectsFile / writeProjectsFile (low-level)
// ---------------------------------------------------------------------------

describe("readProjectsFile / writeProjectsFile", () => {
  beforeEach(async () => {
    await resetProjects();
  });

  it("returns empty array when no projects exist", async () => {
    const data = await readProjectsFile();
    assert.deepEqual(data.projects, []);
    assert.equal(data.activeProjectId, null);
  });

  it("returns empty data from a clean database", async () => {
    const data = await readProjectsFile();
    assert.deepEqual(data.projects, []);
    assert.equal(data.activeProjectId, null);
  });

  it("round-trips data through write then read", async () => {
    const now = new Date().toISOString();
    const testData = {
      projects: [{
        id: "abc",
        name: "Round Trip Test",
        folderName: "round-trip",
        description: "",
        theme: null,
        themeVersion: null,
        preset: null,
        receiveThemeUpdates: false,
        siteUrl: "",
        created: now,
        updated: now,
      }],
      activeProjectId: "abc",
    };
    await writeProjectsFile(testData);
    const readBack = await readProjectsFile();
    assert.deepEqual(readBack, testData);
  });
});

// ---------------------------------------------------------------------------
// Create Project
// ---------------------------------------------------------------------------

describe("createProject", () => {
  beforeEach(async () => {
    await resetProjects();
    // Clean up any leftover project directories
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
  });

  it("creates a project with correct metadata", async () => {
    const project = await createTestProject("My Website");

    assert.ok(project.id, "should have a UUID");
    assert.equal(project.name, "My Website");
    assert.equal(project.description, "A test project");
    assert.equal(project.theme, "__test_theme__");
    assert.equal(project.themeVersion, "1.0.0");
    assert.ok(project.created);
    assert.ok(project.updated);
  });

  it("generates a folderName from the project name", async () => {
    const project = await createTestProject("My Cool Website");
    assert.match(project.folderName, /^my-cool-website/);
  });

  it("uses provided folderName when given", async () => {
    const project = await createTestProject("My Website", { folderName: "custom-folder" });
    assert.equal(project.folderName, "custom-folder");
  });

  it("creates the project directory on disk", async () => {
    const project = await createTestProject("Disk Check");
    const dir = getProjectDir(project.folderName);
    assert.ok(await fs.pathExists(dir));
  });

  it("copies theme files to project directory", async () => {
    const project = await createTestProject("Theme Copy");
    const dir = getProjectDir(project.folderName);

    // theme.json should be copied
    assert.ok(await fs.pathExists(path.join(dir, "theme.json")));
    // layout.liquid should be copied
    assert.ok(await fs.pathExists(path.join(dir, "layout.liquid")));
    // assets should be copied
    assert.ok(await fs.pathExists(path.join(dir, "assets", "base.css")));
    // widgets should be copied
    assert.ok(await fs.pathExists(path.join(dir, "widgets", "hero", "schema.json")));
  });

  it("creates pages from templates (NOT a copy of templates/)", async () => {
    const project = await createTestProject("Pages Check");
    const pagesDir = getProjectPagesDir(project.folderName);

    // Pages should exist
    assert.ok(await fs.pathExists(path.join(pagesDir, "index.json")));
    assert.ok(await fs.pathExists(path.join(pagesDir, "about.json")));

    // templates/ directory should NOT exist in the project
    const dir = getProjectDir(project.folderName);
    assert.ok(!(await fs.pathExists(path.join(dir, "templates"))), "templates/ should be excluded from project");
  });

  it("pages have UUIDs and timestamps", async () => {
    const project = await createTestProject("UUID Check");
    const pagesDir = getProjectPagesDir(project.folderName);

    const indexPage = await fs.readJson(path.join(pagesDir, "index.json"));
    assert.ok(indexPage.uuid, "page should have a uuid");
    assert.ok(indexPage.created, "page should have a created timestamp");
    assert.ok(indexPage.updated, "page should have an updated timestamp");
    assert.equal(indexPage.slug, "index");
  });

  it("copies global widgets (header/footer)", async () => {
    const project = await createTestProject("Globals Check");
    const pagesDir = getProjectPagesDir(project.folderName);

    assert.ok(await fs.pathExists(path.join(pagesDir, "global", "header.json")));
    assert.ok(await fs.pathExists(path.join(pagesDir, "global", "footer.json")));
  });

  it("copies menus and enriches with pageUuid", async () => {
    const project = await createTestProject("Menus Check");
    const menusDir = getProjectMenusDir(project.folderName);

    assert.ok(await fs.pathExists(path.join(menusDir, "main-menu.json")));

    const menu = await fs.readJson(path.join(menusDir, "main-menu.json"));
    assert.ok(menu.items.length > 0);

    // Menu items that link to internal pages should have pageUuid
    const homeItem = menu.items.find((i) => i.link === "index.html");
    if (homeItem) {
      assert.ok(homeItem.pageUuid, "menu item linking to index.html should have pageUuid");
    }
  });

  it("sets first project as active automatically", async () => {
    const project = await createTestProject("First Project");
    assert.equal(project.wasSetAsActive, true);

    const data = await readProjectsFile();
    assert.equal(data.activeProjectId, project.id);
  });

  it("does NOT change active project when creating a second project", async () => {
    const first = await createTestProject("First");
    const second = await createTestProject("Second");

    const data = await readProjectsFile();
    assert.equal(data.activeProjectId, first.id, "active should still be the first project");
    assert.notEqual(second.wasSetAsActive, true);
  });

  it("rejects duplicate project names (case-insensitive)", async () => {
    await createTestProject("Unique Name");

    const res = await callController(createProject, {
      body: { name: "unique name", description: "", theme: "__test_theme__" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /already exists/i);
  });

  it("rejects duplicate folderNames", async () => {
    await createTestProject("Project A", { folderName: "my-folder" });

    const res = await callController(createProject, {
      body: { name: "Project B", description: "", theme: "__test_theme__", folderName: "my-folder" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /folder name.*already exists/i);
  });

  it("rejects invalid folderName characters", async () => {
    const res = await callController(createProject, {
      body: { name: "Bad Folder", description: "", theme: "__test_theme__", folderName: "BAD_Folder!" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /lowercase/i);
  });

  it("fails when theme does not exist", async () => {
    const res = await callController(createProject, {
      body: { name: "No Theme", description: "", theme: "nonexistent-theme" },
    });
    assert.equal(res._status, 500);
    assert.match(res._json.error, /failed/i);
  });

  it("stores themeVersion from theme.json", async () => {
    const project = await createTestProject("Version Check");
    assert.equal(project.themeVersion, "1.0.0");
  });

  it("stores receiveThemeUpdates flag", async () => {
    const project = await createTestProject("Updates Flag", { receiveThemeUpdates: true });
    assert.equal(project.receiveThemeUpdates, true);
  });

  it("defaults receiveThemeUpdates to false", async () => {
    const project = await createTestProject("No Updates Flag");
    assert.equal(project.receiveThemeUpdates, false);
  });

  it("does not include a 'slug' property in the response", async () => {
    const project = await createTestProject("No Slug");
    assert.equal("slug" in project, false, "created project should not have a slug property");
  });

  it("preserves special characters in name without HTML-encoding", async () => {
    const name = 'Test & Site #1 \u2014 "Quotes"';
    const project = await createTestProject(name);
    assert.equal(project.name, name, "name should not be HTML-encoded");
    assert.ok(!project.name.includes("&amp;"), "ampersand should not be encoded");
    assert.ok(!project.name.includes("&quot;"), "quotes should not be encoded");
  });

  it("rejects empty name (e.g. after HTML tags are stripped)", async () => {
    const res = await callController(createProject, {
      body: { name: "", description: "", theme: "__test_theme__" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });

  it("rejects whitespace-only name", async () => {
    const res = await callController(createProject, {
      body: { name: "   ", description: "", theme: "__test_theme__" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });
});

// ---------------------------------------------------------------------------
// Get All Projects / Get Active Project
// ---------------------------------------------------------------------------

describe("getAllProjects / getActiveProject", () => {
  beforeEach(async () => {
    await resetProjects();
    // Clean up project dirs
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
  });

  it("getAllProjects returns empty array when no projects", async () => {
    const res = await callController(getAllProjects);
    assert.equal(res._status, 200);
    assert.deepEqual(res._json, []);
  });

  it("getAllProjects returns all created projects", async () => {
    await createTestProject("Project A");
    await createTestProject("Project B");

    const res = await callController(getAllProjects);
    assert.equal(res._json.length, 2);
  });

  it("getAllProjects enriches with themeName", async () => {
    await createTestProject("Enriched");

    const res = await callController(getAllProjects);
    assert.equal(res._json[0].themeName, "Test Theme");
  });

  it("getActiveProject returns the active project", async () => {
    const created = await createTestProject("Active One");

    const res = await callController(getActiveProject);
    assert.equal(res._json.id, created.id);
    assert.equal(res._json.name, "Active One");
  });

  it("getActiveProject returns null when no projects exist", async () => {
    const res = await callController(getActiveProject);
    assert.equal(res._json, null);
  });
});

// ---------------------------------------------------------------------------
// Set Active Project
// ---------------------------------------------------------------------------

describe("setActiveProject", () => {
  beforeEach(async () => {
    await resetProjects();
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
  });

  it("switches the active project", async () => {
    const first = await createTestProject("First");
    const second = await createTestProject("Second");

    // Active should be first
    let data = await readProjectsFile();
    assert.equal(data.activeProjectId, first.id);

    // Switch to second
    const res = await callController(setActiveProject, { params: { id: second.id } });
    assert.equal(res._status, 200);

    data = await readProjectsFile();
    assert.equal(data.activeProjectId, second.id);
  });

  it("returns 404 for non-existent project ID", async () => {
    await createTestProject("Only One");

    const res = await callController(setActiveProject, { params: { id: "non-existent-uuid" } });
    assert.equal(res._status, 404);
  });
});

// ---------------------------------------------------------------------------
// Update Project
// ---------------------------------------------------------------------------

describe("updateProject", () => {
  let project;

  beforeEach(async () => {
    await resetProjects();
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
    project = await createTestProject("Original Name");
  });

  it("updates project name", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Updated Name" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.name, "Updated Name");

    // Verify persisted
    const data = await readProjectsFile();
    assert.equal(data.projects[0].name, "Updated Name");
  });

  it("updates project description", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", description: "New description" },
    });
    assert.equal(res._json.description, "New description");
  });

  it("updates siteUrl", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", siteUrl: "https://example.com" },
    });
    assert.equal(res._json.siteUrl, "https://example.com");
  });

  it("clears siteUrl when set to empty string", async () => {
    // First set it
    await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", siteUrl: "https://example.com" },
    });
    // Then clear it
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", siteUrl: "" },
    });
    assert.equal(res._json.siteUrl, "");
  });

  it("preserves ID across updates", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "New Name" },
    });
    assert.equal(res._json.id, project.id, "ID should never change");
  });

  it("updates the 'updated' timestamp", async () => {
    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Timestamp Check" },
    });
    assert.notEqual(res._json.updated, project.updated, "updated timestamp should change");
  });

  it("renames project folder when folderName changes", async () => {
    const oldDir = getProjectDir(project.folderName);
    assert.ok(await fs.pathExists(oldDir), "old directory should exist before rename");

    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "renamed-folder" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.folderName, "renamed-folder");

    // Old directory should be gone
    assert.ok(!(await fs.pathExists(oldDir)), "old directory should be removed");
    // New directory should exist
    assert.ok(await fs.pathExists(getProjectDir("renamed-folder")), "new directory should exist");
  });

  it("preserves project files after folder rename", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "renamed-files" },
    });
    assert.equal(res._status, 200);

    const newDir = getProjectDir("renamed-files");
    // Theme files should exist in the new folder
    assert.ok(await fs.pathExists(path.join(newDir, "theme.json")), "theme.json should survive rename");
    assert.ok(await fs.pathExists(path.join(newDir, "layout.liquid")), "layout.liquid should survive rename");
    // Pages should exist
    const pagesDir = getProjectPagesDir("renamed-files");
    assert.ok(await fs.pathExists(path.join(pagesDir, "index.json")), "pages should survive rename");
  });

  it("preserves project ID and metadata after folder rename", async () => {
    const originalId = project.id;
    const originalTheme = project.theme;
    const originalThemeVersion = project.themeVersion;

    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "renamed-meta" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.id, originalId, "ID must not change after rename");
    assert.equal(res._json.theme, originalTheme, "theme must survive rename");
    assert.equal(res._json.themeVersion, originalThemeVersion, "themeVersion must survive rename");
  });

  it("active project still resolves after its folder is renamed", async () => {
    // project is active (first project created in beforeEach)
    const data = await readProjectsFile();
    assert.equal(data.activeProjectId, project.id);

    // Rename its folder
    await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "renamed-active" },
    });

    // getActiveProject should still return it
    const activeRes = await callController(getActiveProject);
    assert.equal(activeRes._json.id, project.id);
    assert.equal(activeRes._json.folderName, "renamed-active");
  });

  it("rejects duplicate names (case-insensitive)", async () => {
    await createTestProject("Other Project");

    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "other project" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /already exists/i);
  });

  it("allows keeping the same name on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", description: "Changed description only" },
    });
    assert.equal(res._status, 200);
  });

  it("rejects duplicate folderName", async () => {
    await createTestProject("Other", { folderName: "taken-folder" });

    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "taken-folder" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /folder name.*already exists/i);
  });

  it("returns 404 for non-existent project", async () => {
    const res = await callController(updateProject, {
      params: { id: "non-existent-uuid" },
      body: { name: "Ghost" },
    });
    assert.equal(res._status, 404);
  });

  it("updates receiveThemeUpdates flag", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", receiveThemeUpdates: true },
    });
    assert.equal(res._json.receiveThemeUpdates, true);
  });

  it("rejects invalid folderName characters on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "BAD_Folder!" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /lowercase/i);
  });

  it("rejects folderName with spaces on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "has spaces" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /lowercase/i);
  });

  it("rejects folderName with uppercase on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: "HasUpperCase" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /lowercase/i);
  });

  it("allows keeping the same folderName on update (no-op rename)", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Original Name", folderName: project.folderName },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.folderName, project.folderName);
  });

  it("does not include a 'slug' property in the response", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "Updated Name" },
    });
    assert.equal(res._status, 200);
    assert.equal("slug" in res._json, false, "project should not have a slug property");
  });

  it("rejects empty name on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "" },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });

  it("rejects whitespace-only name on update", async () => {
    const res = await callController(updateProject, {
      params: { id: project.id },
      body: { name: "   " },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /name.*required/i);
  });
});

// ---------------------------------------------------------------------------
// Delete Project
// ---------------------------------------------------------------------------

describe("deleteProject", () => {
  beforeEach(async () => {
    await resetProjects();
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
  });

  it("removes project from the database", async () => {
    const project = await createTestProject("To Delete");

    const res = await callController(deleteProject, { params: { id: project.id } });
    assert.equal(res._status, 200);
    assert.equal(res._json.success, true);

    const data = await readProjectsFile();
    assert.equal(data.projects.length, 0);
  });

  it("removes project directory from disk", async () => {
    const project = await createTestProject("Disk Delete");
    const dir = getProjectDir(project.folderName);
    assert.ok(await fs.pathExists(dir), "directory should exist before delete");

    await callController(deleteProject, { params: { id: project.id } });
    assert.ok(!(await fs.pathExists(dir)), "directory should be removed after delete");
  });

  it("switches active project to next available on delete", async () => {
    const first = await createTestProject("First");
    const second = await createTestProject("Second");

    // First is active
    let data = await readProjectsFile();
    assert.equal(data.activeProjectId, first.id);

    // Delete first
    await callController(deleteProject, { params: { id: first.id } });

    // Active should switch to second
    data = await readProjectsFile();
    assert.equal(data.activeProjectId, second.id);
  });

  it("sets activeProjectId to null when last project is deleted", async () => {
    const project = await createTestProject("Last One");

    await callController(deleteProject, { params: { id: project.id } });

    const data = await readProjectsFile();
    assert.equal(data.activeProjectId, null);
  });

  it("returns 404 for non-existent project", async () => {
    const res = await callController(deleteProject, { params: { id: "non-existent" } });
    assert.equal(res._status, 404);
  });

  it("response includes a success message with the project name", async () => {
    const project = await createTestProject("Named Project");
    const res = await callController(deleteProject, { params: { id: project.id } });
    assert.match(res._json.message, /Named Project/);
  });

  it("cascades deletion to media metadata in SQLite", async () => {
    const project = await createTestProject("Media Delete");
    const mediaData = createTestMediaData();
    mediaRepo.writeMediaData(project.id, mediaData);

    // Verify media exists before delete
    const beforeDelete = mediaRepo.getMediaFiles(project.id);
    assert.equal(beforeDelete.files.length, 2);

    await callController(deleteProject, { params: { id: project.id } });

    // Media should be gone (cascade delete)
    const afterDelete = mediaRepo.getMediaFiles(project.id);
    assert.equal(afterDelete.files.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Duplicate Project
// ---------------------------------------------------------------------------

describe("duplicateProject", () => {
  let original;

  beforeEach(async () => {
    await resetProjects();
    const projectsDir = path.join(TEST_DATA_DIR, "projects");
    const entries = await fs.readdir(projectsDir);
    for (const entry of entries) {
      await fs.remove(path.join(projectsDir, entry));
    }
    original = await createTestProject("Original Project");
  });

  it("creates a copy with 'Copy of' prefix", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(res._status, 201);
    assert.equal(res._json.name, "Copy of Original Project");
  });

  it("generates a unique folderName for the copy", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });
    assert.notEqual(res._json.folderName, original.folderName);
  });

  it("assigns a new UUID to the copy", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });
    assert.notEqual(res._json.id, original.id);
  });

  it("copies the project directory to a new location", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });
    const newDir = getProjectDir(res._json.folderName);
    assert.ok(await fs.pathExists(newDir));
    assert.ok(await fs.pathExists(path.join(newDir, "theme.json")));
  });

  it("preserves theme info from the original", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(res._json.theme, original.theme);
    assert.equal(res._json.themeVersion, original.themeVersion);
  });

  it("regenerates page UUIDs in the copy", async () => {
    const res = await callController(duplicateProject, { params: { id: original.id } });

    const originalPagesDir = getProjectPagesDir(original.folderName);
    const copyPagesDir = getProjectPagesDir(res._json.folderName);

    const origIndex = await fs.readJson(path.join(originalPagesDir, "index.json"));
    const copyIndex = await fs.readJson(path.join(copyPagesDir, "index.json"));

    assert.ok(origIndex.uuid, "original should have uuid");
    assert.ok(copyIndex.uuid, "copy should have uuid");
    assert.notEqual(origIndex.uuid, copyIndex.uuid, "copy should have a different uuid");
  });

  it("increments copy number for multiple duplicates", async () => {
    const first = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(first._json.name, "Copy of Original Project");

    const second = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(second._json.name, "Copy 2 of Original Project");

    const third = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(third._json.name, "Copy 3 of Original Project");
  });

  it("adds the duplicate to the database", async () => {
    await callController(duplicateProject, { params: { id: original.id } });

    const data = await readProjectsFile();
    assert.equal(data.projects.length, 2);
  });

  it("returns 404 for non-existent project", async () => {
    const res = await callController(duplicateProject, { params: { id: "non-existent" } });
    assert.equal(res._status, 404);
  });

  it("copies media metadata to the duplicate with new IDs", async () => {
    // Write media metadata for the original project
    const mediaData = createTestMediaData();
    mediaRepo.writeMediaData(original.id, mediaData);

    const res = await callController(duplicateProject, { params: { id: original.id } });
    assert.equal(res._status, 201);

    // Duplicate should have media in SQLite
    const dupMedia = mediaRepo.getMediaFiles(res._json.id);
    assert.equal(dupMedia.files.length, 2);

    // Metadata should match
    const photo = dupMedia.files.find((f) => f.filename === "photo.jpg");
    const banner = dupMedia.files.find((f) => f.filename === "banner.png");
    assert.ok(photo, "photo.jpg should exist in duplicate");
    assert.ok(banner, "banner.png should exist in duplicate");
    assert.equal(photo.type, "image/jpeg");
    assert.equal(photo.path, "/uploads/images/photo.jpg");
    assert.ok(photo.sizes.thumb, "Size variants should be copied");
    assert.deepEqual(photo.usedIn, ["index"]);

    // IDs should be different from the original
    const originalMedia = mediaRepo.getMediaFiles(original.id);
    const originalIds = new Set(originalMedia.files.map((f) => f.id));
    for (const file of dupMedia.files) {
      assert.ok(!originalIds.has(file.id), `Duplicate media ID "${file.id}" should differ from original`);
    }
  });
});

// ---------------------------------------------------------------------------
// exportProject / importProject
// ---------------------------------------------------------------------------

/**
 * Build a mock Express response that behaves as a writable stream.
 * `archiver` calls archive.pipe(res), so res must support write/end/on.
 * After the stream ends, call getBuffer() to retrieve the full ZIP data.
 */
function mockStreamRes() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));

  const res = Object.assign(stream, {
    _status: 200,
    _json: null,
    _headers: {},
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
    setHeader(key, value) {
      res._headers[key] = value;
      return res;
    },
    getBuffer() {
      return Buffer.concat(chunks);
    },
  });
  return res;
}

/** Wait for a stream to finish (the archive pipes and then calls end) */
function waitForStreamEnd(stream) {
  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

/** Helper: export a project and return { res, zip, manifest } */
async function exportTestProject(projectId) {
  const req = mockReq({ params: { projectId } });
  const res = mockStreamRes();
  const done = waitForStreamEnd(res);
  await exportProject(req, res);
  await done;

  const buffer = res.getBuffer();
  const zip = new AdmZip.default(buffer);
  const manifestEntry = zip.getEntry("project-export.json");
  const manifest = manifestEntry ? JSON.parse(manifestEntry.getData().toString("utf8")) : null;
  return { res, zip, manifest };
}

/** Helper: build an in-memory ZIP buffer with a manifest and optional extra files */
function buildImportZip(manifestObj, extraFiles = {}) {
  const zip = new AdmZip.default();
  zip.addFile("project-export.json", Buffer.from(JSON.stringify(manifestObj, null, 2)));
  for (const [name, content] of Object.entries(extraFiles)) {
    zip.addFile(name, Buffer.from(typeof content === "string" ? content : JSON.stringify(content, null, 2)));
  }
  return zip.toBuffer();
}

describe("exportProject", () => {
  let project;

  before(async () => {
    await resetProjects();
    project = await createTestProject("Export Test");
  });

  it("exports a project as a ZIP with a valid manifest", async () => {
    const { res, manifest } = await exportTestProject(project.id);

    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "application/zip");
    assert.ok(res._headers["Content-Disposition"].includes(".zip"));

    // Manifest structure
    assert.ok(manifest);
    assert.equal(manifest.formatVersion, "1.1");
    assert.ok(manifest.exportedAt);
    assert.ok(manifest.widgetizerVersion);
    assert.equal(manifest.project.name, "Export Test");
    assert.equal(manifest.project.theme, "__test_theme__");
  });

  it("manifest includes receiveThemeUpdates and preset", async () => {
    // Create a project with receiveThemeUpdates enabled
    const p = await createTestProject("Export Flags Test", { receiveThemeUpdates: true });
    const { manifest } = await exportTestProject(p.id);

    assert.equal(manifest.project.receiveThemeUpdates, true);
    // preset is null by default for non-preset projects
    assert.equal(manifest.project.preset, null);
  });

  it("includes project files in the ZIP", async () => {
    const { zip } = await exportTestProject(project.id);
    const entryNames = zip.getEntries().map((e) => e.entryName);

    // Should contain the manifest
    assert.ok(entryNames.includes("project-export.json"));

    // Should contain project files (pages, theme.json, etc.)
    assert.ok(entryNames.some((n) => n.startsWith("pages/")), "Expected pages/ directory in ZIP");
    assert.ok(entryNames.includes("theme.json"), "Expected theme.json in ZIP");
  });

  it("returns 404 for non-existent project", async () => {
    const req = mockReq({ params: { projectId: "non-existent-id" } });
    const res = mockStreamRes();
    await exportProject(req, res);

    assert.equal(res._status, 404);
    assert.ok(res._json.error);
  });

  it("includes media metadata from SQLite in the ZIP", async () => {
    const p = await createTestProject("Export Media Test");
    const mediaData = createTestMediaData();
    mediaRepo.writeMediaData(p.id, mediaData);

    const { zip } = await exportTestProject(p.id);
    const mediaEntry = zip.getEntry("uploads/media.json");
    assert.ok(mediaEntry, "ZIP should contain uploads/media.json");

    const exported = JSON.parse(mediaEntry.getData().toString("utf8"));
    assert.equal(exported.files.length, 2);
    assert.equal(exported.files[0].filename, "photo.jpg");
    assert.equal(exported.files[0].type, "image/jpeg");
    assert.deepEqual(exported.files[0].usedIn, ["index"]);
    assert.ok(exported.files[0].sizes.thumb, "Should include size variants");
    assert.equal(exported.files[1].filename, "banner.png");
  });
});

describe("importProject", () => {
  before(async () => {
    await resetProjects();
  });

  beforeEach(async () => {
    await resetProjects();
  });

  /** Base manifest for import tests */
  const baseManifest = {
    formatVersion: "1.1",
    exportedAt: new Date().toISOString(),
    widgetizerVersion: "1.0.0",
    project: {
      name: "Imported Project",
      description: "Imported via test",
      theme: "__test_theme__",
      themeVersion: "1.0.0",
      receiveThemeUpdates: false,
      preset: null,
      siteUrl: "https://example.com",
      created: "2025-01-01T00:00:00.000Z",
      updated: "2025-01-01T00:00:00.000Z",
    },
  };

  it("imports a project from a valid ZIP", async () => {
    const zipBuffer = buildImportZip(baseManifest, {
      "theme.json": { name: "Test Theme", version: "1.0.0" },
      "pages/index.json": { name: "Home", slug: "index", widgets: {} },
    });

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 201);
    assert.equal(res._json.name, "Imported Project");
    assert.equal(res._json.description, "Imported via test");
    assert.equal(res._json.theme, "__test_theme__");
    assert.equal(res._json.siteUrl, "https://example.com");
    assert.ok(res._json.id, "Should have a generated ID");
    assert.ok(res._json.folderName, "Should have a generated folderName");

    // Verify project exists in DB
    const data = await readProjectsFile();
    assert.equal(data.projects.length, 1);
    assert.equal(data.projects[0].name, "Imported Project");
  });

  it("preserves receiveThemeUpdates and preset from manifest", async () => {
    const manifest = {
      ...baseManifest,
      project: {
        ...baseManifest.project,
        receiveThemeUpdates: true,
        preset: "starter",
      },
    };
    const zipBuffer = buildImportZip(manifest, {
      "theme.json": { name: "Test Theme", version: "1.0.0" },
    });

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 201);
    assert.equal(res._json.receiveThemeUpdates, true);
    assert.equal(res._json.preset, "starter");

    // Verify round-trip through DB
    const data = await readProjectsFile();
    const imported = data.projects.find((p) => p.id === res._json.id);
    assert.equal(imported.receiveThemeUpdates, true);
    assert.equal(imported.preset, "starter");
  });

  it("defaults receiveThemeUpdates/preset for older exports", async () => {
    // Older exports won't have these fields in the manifest
    const oldManifest = {
      formatVersion: "1.1",
      exportedAt: new Date().toISOString(),
      widgetizerVersion: "0.9.0",
      project: {
        name: "Legacy Import",
        description: "",
        theme: "__test_theme__",
        themeVersion: "1.0.0",
        siteUrl: "",
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-01T00:00:00.000Z",
        // no receiveThemeUpdates or preset
      },
    };
    const zipBuffer = buildImportZip(oldManifest, {
      "theme.json": { name: "Test Theme", version: "1.0.0" },
    });

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 201);
    assert.equal(res._json.receiveThemeUpdates, false);
    assert.equal(res._json.preset, null);
  });

  it("rejects ZIP without manifest", async () => {
    const zip = new AdmZip.default();
    zip.addFile("some-file.txt", Buffer.from("hello"));
    const zipBuffer = zip.toBuffer();

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("missing project-export.json"));
  });

  it("rejects ZIP with invalid manifest JSON", async () => {
    const zip = new AdmZip.default();
    zip.addFile("project-export.json", Buffer.from("{ invalid json !!!"));
    const zipBuffer = zip.toBuffer();

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("corrupted manifest"));
  });

  it("rejects ZIP with incomplete manifest (missing theme)", async () => {
    const incompleteManifest = {
      formatVersion: "1.1",
      project: {
        name: "No Theme",
        // missing 'theme'
      },
    };
    const zipBuffer = buildImportZip(incompleteManifest);

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("incomplete manifest"));
  });

  it("rejects ZIP referencing a non-existent theme", async () => {
    const manifest = {
      ...baseManifest,
      project: { ...baseManifest.project, theme: "non-existent-theme-xyz" },
    };
    const zipBuffer = buildImportZip(manifest);

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("not found"));
  });

  it("rejects when no file is uploaded", async () => {
    const res = await callController(importProject, { file: null });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("No ZIP file"));
  });

  it("cleans up on failure (no leftover project in DB)", async () => {
    // Use a theme that doesn't exist to trigger failure after extraction
    const manifest = {
      ...baseManifest,
      project: { ...baseManifest.project, theme: "ghost-theme-404" },
    };
    const zipBuffer = buildImportZip(manifest);

    await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });

    // Verify no project was left behind
    const data = await readProjectsFile();
    assert.equal(data.projects.length, 0);
  });

  it("restores media metadata from ZIP into SQLite", async () => {
    const mediaData = createTestMediaData();
    const zipBuffer = buildImportZip(baseManifest, {
      "theme.json": { name: "Test Theme", version: "1.0.0" },
      "uploads/media.json": mediaData,
    });

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });
    assert.equal(res._status, 201);

    // Media should be in SQLite
    const imported = mediaRepo.getMediaFiles(res._json.id);
    assert.equal(imported.files.length, 2);
    assert.equal(imported.files[0].filename, "photo.jpg");
    assert.equal(imported.files[1].filename, "banner.png");

    // media.json should be cleaned up from disk
    const mediaJsonPath = path.join(getProjectDir(res._json.folderName), "uploads", "media.json");
    assert.ok(!(await fs.pathExists(mediaJsonPath)), "media.json should be removed after import");
  });

  it("regenerates media file IDs on import", async () => {
    const mediaData = createTestMediaData();
    const originalIds = mediaData.files.map((f) => f.id);

    const zipBuffer = buildImportZip(baseManifest, {
      "theme.json": { name: "Test Theme", version: "1.0.0" },
      "uploads/media.json": mediaData,
    });

    const res = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });
    assert.equal(res._status, 201);

    const imported = mediaRepo.getMediaFiles(res._json.id);
    assert.equal(imported.files.length, 2);

    // IDs should be regenerated (not match originals)
    for (const file of imported.files) {
      assert.ok(!originalIds.includes(file.id), `Media file ID "${file.id}" should have been regenerated`);
    }

    // But metadata should be preserved
    const photo = imported.files.find((f) => f.filename === "photo.jpg");
    assert.ok(photo);
    assert.equal(photo.type, "image/jpeg");
    assert.equal(photo.path, "/uploads/images/photo.jpg");
    assert.ok(photo.sizes.thumb, "Size variants should be preserved");
  });

  it("import media IDs don't collide with existing project", async () => {
    // Create original project with media
    const original = await createTestProject("Original With Media");
    const mediaData = createTestMediaData();
    mediaRepo.writeMediaData(original.id, mediaData);

    // Export the original
    const { res: exportRes } = await exportTestProject(original.id);
    assert.equal(exportRes._status, 200);
    const zipBuffer = exportRes.getBuffer();

    // Import while original still exists
    const importRes = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });
    assert.equal(importRes._status, 201);

    // Both projects should have media
    const originalMedia = mediaRepo.getMediaFiles(original.id);
    const importedMedia = mediaRepo.getMediaFiles(importRes._json.id);
    assert.equal(originalMedia.files.length, 2);
    assert.equal(importedMedia.files.length, 2);

    // No ID overlap
    const originalIds = new Set(originalMedia.files.map((f) => f.id));
    for (const file of importedMedia.files) {
      assert.ok(!originalIds.has(file.id), `Imported media ID "${file.id}" should not match any original ID`);
    }
  });
});

describe("exportProject → importProject round-trip", () => {
  before(async () => {
    await resetProjects();
  });

  it("exports and re-imports a project preserving all metadata", async () => {
    // Create a project
    const original = await createTestProject("Round Trip", { receiveThemeUpdates: true });

    // Export it
    const { res: exportRes } = await exportTestProject(original.id);
    assert.equal(exportRes._status, 200);
    const zipBuffer = exportRes.getBuffer();

    // Import it back
    const importRes = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });
    assert.equal(importRes._status, 201);

    // Verify metadata is preserved
    assert.equal(importRes._json.name, "Round Trip");
    assert.equal(importRes._json.theme, "__test_theme__");
    assert.equal(importRes._json.receiveThemeUpdates, true);

    // Should have a different ID and folderName
    assert.notEqual(importRes._json.id, original.id);
    assert.notEqual(importRes._json.folderName, original.folderName);

    // Both projects should exist
    const data = await readProjectsFile();
    assert.equal(data.projects.length, 2);
  });

  it("round-trips media metadata through export and import", async () => {
    const original = await createTestProject("Media Round Trip");
    const mediaData = createTestMediaData();
    mediaRepo.writeMediaData(original.id, mediaData);

    // Export
    const { res: exportRes } = await exportTestProject(original.id);
    assert.equal(exportRes._status, 200);
    const zipBuffer = exportRes.getBuffer();

    // Import
    const importRes = await callController(importProject, {
      file: { buffer: zipBuffer, size: zipBuffer.length },
    });
    assert.equal(importRes._status, 201);

    // Imported project should have the same media files
    const importedMedia = mediaRepo.getMediaFiles(importRes._json.id);
    assert.equal(importedMedia.files.length, 2);

    // Filenames, types, and paths preserved
    const photo = importedMedia.files.find((f) => f.filename === "photo.jpg");
    const banner = importedMedia.files.find((f) => f.filename === "banner.png");
    assert.ok(photo, "photo.jpg should exist");
    assert.ok(banner, "banner.png should exist");
    assert.equal(photo.type, "image/jpeg");
    assert.equal(photo.path, "/uploads/images/photo.jpg");
    assert.ok(photo.sizes.thumb, "Sizes should be preserved");
    assert.deepEqual(photo.usedIn, ["index"]);

    // IDs should be different from originals
    const originalMedia = mediaRepo.getMediaFiles(original.id);
    const originalIds = new Set(originalMedia.files.map((f) => f.id));
    for (const file of importedMedia.files) {
      assert.ok(!originalIds.has(file.id), "Imported media IDs should be regenerated");
    }
  });
});
