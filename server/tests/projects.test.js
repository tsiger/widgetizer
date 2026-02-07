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
const { DATA_DIR, THEMES_DIR, getProjectsFilePath, getProjectDir, getProjectPagesDir, getProjectMenusDir } =
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
} = await import("../controllers/projectController.js");

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

/** Reset the projects.json to a clean state */
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

  it("creates projects.json if missing", async () => {
    await fs.remove(getProjectsFilePath());
    const data = await readProjectsFile();
    assert.deepEqual(data.projects, []);
    // File should now exist
    assert.ok(await fs.pathExists(getProjectsFilePath()));
  });

  it("round-trips data through write then read", async () => {
    const testData = {
      projects: [{ id: "abc", name: "Round Trip Test", folderName: "round-trip" }],
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
      if (entry !== "projects.json") {
        await fs.remove(path.join(projectsDir, entry));
      }
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
      if (entry !== "projects.json") await fs.remove(path.join(projectsDir, entry));
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
      if (entry !== "projects.json") await fs.remove(path.join(projectsDir, entry));
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
      if (entry !== "projects.json") await fs.remove(path.join(projectsDir, entry));
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
      if (entry !== "projects.json") await fs.remove(path.join(projectsDir, entry));
    }
  });

  it("removes project from projects.json", async () => {
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
      if (entry !== "projects.json") await fs.remove(path.join(projectsDir, entry));
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

  it("adds the duplicate to projects.json", async () => {
    await callController(duplicateProject, { params: { id: original.id } });

    const data = await readProjectsFile();
    assert.equal(data.projects.length, 2);
  });

  it("returns 404 for non-existent project", async () => {
    const res = await callController(duplicateProject, { params: { id: "non-existent" } });
    assert.equal(res._status, 404);
  });
});
