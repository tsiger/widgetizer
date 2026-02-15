/**
 * Theme Controller Test Suite
 *
 * Tests theme CRUD, upload with validation, deletion with in-use protection,
 * versioning (getThemeVersions, buildLatestSnapshot), theme listing,
 * widget/template listing, copyThemeToProject, update flow,
 * and project theme settings.
 *
 * Uses AdmZip to create realistic theme zip files in-memory for upload tests.
 *
 * Run with: node --test server/tests/themes.test.js
 */

import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-themes-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence console noise
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const {
  THEMES_DIR,
  getThemeDir,
  getThemeJsonPath,
  getThemeWidgetsDir,
  getThemeTemplatesDir,
  getThemeUpdatesDir,
  getThemeLatestDir,
  getThemeVersionDir,
  getProjectDir,
  getProjectThemeJsonPath,
  getProjectPagesDir,
} = await import("../config.js");

const { writeProjectsFile } = await import("../controllers/projectController.js");

const {
  ensureThemesDirectory,
  getThemeVersions,
  getThemeSourceDir,
  getThemeLatestVersion,
  buildLatestSnapshot,
  getAllThemes,
  getTheme,
  getThemeWidgets,
  getThemeTemplates,
  getThemeVersionsHandler,
  themeHasPendingUpdates,
  getThemeUpdateCount,
  updateTheme,
  copyThemeToProject,
  readProjectThemeData,
  deleteTheme,
  uploadTheme,
  getProjectThemeSettings,
  saveProjectThemeSettings,
  resolvePresetPaths,
  getThemePresets,
} = await import("../controllers/themeController.js");
const { closeDb } = await import("../db/index.js");

// Lazy-load AdmZip for building test zip files
let AdmZip;

// ============================================================================
// Mock helpers
// ============================================================================

function mockReq({ params = {}, body = {}, file = null } = {}) {
  return {
    params,
    body,
    file,
    [Symbol.for("express-validator#contexts")]: [],
  };
}

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

async function callController(fn, { params, body, file } = {}) {
  const req = mockReq({ params, body, file });
  const res = mockRes();
  await fn(req, res);
  return res;
}

// ============================================================================
// Theme zip builder helpers
// ============================================================================

/**
 * Build a valid theme zip buffer with all required files.
 */
function buildThemeZip(themeName, opts = {}) {
  const {
    version = "1.0.0",
    author = "Test Author",
    description = "A test theme",
    name = themeName,
    includeScreenshot = true,
    includeLayout = true,
    includeAssets = true,
    includeTemplates = true,
    includeWidgets = true,
    themeJsonOverride = null,
    updates = [], // Array of { version, themeJsonVersion?, files? }
    extraFiles = {},
  } = opts;

  const zip = new AdmZip.default();

  // theme.json
  const themeJson = themeJsonOverride || { name, version, author, description };
  zip.addFile(`${themeName}/theme.json`, Buffer.from(JSON.stringify(themeJson, null, 2)));

  // screenshot.png
  if (includeScreenshot) {
    zip.addFile(`${themeName}/screenshot.png`, Buffer.from("fake-png-data"));
  }

  // layout.liquid
  if (includeLayout) {
    zip.addFile(
      `${themeName}/layout.liquid`,
      Buffer.from("<!DOCTYPE html><html><head></head><body>{{ main_content | raw }}</body></html>"),
    );
  }

  // assets/
  if (includeAssets) {
    zip.addFile(`${themeName}/assets/styles.css`, Buffer.from("body { margin: 0; }"));
  }

  // templates/
  if (includeTemplates) {
    zip.addFile(`${themeName}/templates/home.json`, Buffer.from(JSON.stringify({ id: "home", name: "Home Page" })));
  }

  // widgets/
  if (includeWidgets) {
    zip.addFile(
      `${themeName}/widgets/hero/schema.json`,
      Buffer.from(JSON.stringify({ type: "hero", displayName: "Hero" })),
    );
    zip.addFile(
      `${themeName}/widgets/hero/widget.liquid`,
      Buffer.from("<div class='hero'>{{ widget.settings.title }}</div>"),
    );
  }

  // Update versions
  for (const update of updates) {
    const uVersion = update.version;
    const uThemeVersion = update.themeJsonVersion || uVersion;
    zip.addFile(
      `${themeName}/updates/${uVersion}/theme.json`,
      Buffer.from(JSON.stringify({ name, version: uThemeVersion, author, description })),
    );
    if (update.files) {
      for (const [filePath, content] of Object.entries(update.files)) {
        zip.addFile(`${themeName}/updates/${uVersion}/${filePath}`, Buffer.from(content));
      }
    }
  }

  // Extra files
  for (const [filePath, content] of Object.entries(extraFiles)) {
    zip.addFile(`${themeName}/${filePath}`, Buffer.from(content));
  }

  return zip.toBuffer();
}

// ============================================================================
// Global setup / teardown
// ============================================================================

before(async () => {
  const admZipModule = await import("adm-zip");
  AdmZip = admZipModule;

  await fs.ensureDir(TEST_THEMES_DIR);
  await fs.ensureDir(TEST_DATA_DIR);

  // projects.json with a project using a specific theme
  await writeProjectsFile({
    projects: [
      {
        id: "theme-test-project-uuid",
        folderName: "theme-test-project",
        name: "Theme Test Project",
        theme: "in-use-theme",
        siteUrl: "",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: "theme-test-project-uuid",
  });

  // Create project dir with theme.json for readProjectThemeData tests
  const projDir = getProjectDir("theme-test-project");
  await fs.ensureDir(projDir);
  await fs.ensureDir(getProjectPagesDir("theme-test-project"));
  await fs.outputFile(
    getProjectThemeJsonPath("theme-test-project"),
    JSON.stringify({ settings: { global: { colors: [{ id: "primary", value: "#ff0000" }] } } }, null, 2),
  );
});

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Helper: create a theme on disk (for non-upload tests)
// ============================================================================

async function createThemeOnDisk(themeId, opts = {}) {
  const { version = "1.0.0", author = "Disk Author", name = themeId, widgetCount = 1, templateCount = 1 } = opts;

  const themeDir = getThemeDir(themeId);
  await fs.ensureDir(themeDir);

  // theme.json
  await fs.outputFile(getThemeJsonPath(themeId), JSON.stringify({ name, version, author, description: "Disk theme" }));

  // screenshot, layout
  await fs.writeFile(path.join(themeDir, "screenshot.png"), "png");
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html></html>");

  // assets, templates
  await fs.ensureDir(path.join(themeDir, "assets"));
  await fs.writeFile(path.join(themeDir, "assets", "style.css"), "body{}");

  const templatesDir = path.join(themeDir, "templates");
  await fs.ensureDir(templatesDir);
  for (let i = 0; i < templateCount; i++) {
    await fs.writeFile(
      path.join(templatesDir, `template-${i}.json`),
      JSON.stringify({ id: `template-${i}`, name: `Template ${i}` }),
    );
  }

  // widgets
  const widgetsDir = getThemeWidgetsDir(themeId);
  await fs.ensureDir(widgetsDir);
  for (let i = 0; i < widgetCount; i++) {
    const widgetDir = path.join(widgetsDir, `widget-${i}`);
    await fs.ensureDir(widgetDir);
    await fs.writeFile(
      path.join(widgetDir, "schema.json"),
      JSON.stringify({ type: `widget-${i}`, displayName: `Widget ${i}` }),
    );
    await fs.writeFile(path.join(widgetDir, "widget.liquid"), `<div>Widget ${i}</div>`);
  }

  return themeDir;
}

// ============================================================================
// ensureThemesDirectory
// ============================================================================

describe("ensureThemesDirectory", () => {
  it("creates the themes directory if it does not exist", async () => {
    // It's already created in before(), but let's verify idempotency
    await ensureThemesDirectory();
    assert.ok(await fs.pathExists(THEMES_DIR));
  });
});

// ============================================================================
// Theme versioning
// ============================================================================

describe("getThemeVersions", () => {
  const VERSIONED = "versioned-theme";

  before(async () => {
    await createThemeOnDisk(VERSIONED, { version: "1.0.0" });
    // Add update versions
    const updatesDir = getThemeUpdatesDir(VERSIONED);
    await fs.ensureDir(updatesDir);

    const v110Dir = getThemeVersionDir(VERSIONED, "1.1.0");
    await fs.ensureDir(v110Dir);
    await fs.writeFile(path.join(v110Dir, "theme.json"), JSON.stringify({ name: VERSIONED, version: "1.1.0" }));

    const v200Dir = getThemeVersionDir(VERSIONED, "2.0.0");
    await fs.ensureDir(v200Dir);
    await fs.writeFile(path.join(v200Dir, "theme.json"), JSON.stringify({ name: VERSIONED, version: "2.0.0" }));
  });

  after(async () => {
    await fs.remove(getThemeDir(VERSIONED));
  });

  it("returns base and update versions sorted ascending", async () => {
    const versions = await getThemeVersions(VERSIONED);
    assert.deepEqual(versions, ["1.0.0", "1.1.0", "2.0.0"]);
  });

  it("returns only base version when no updates exist", async () => {
    const singleTheme = "single-version-theme";
    await createThemeOnDisk(singleTheme, { version: "1.0.0" });

    const versions = await getThemeVersions(singleTheme);
    assert.deepEqual(versions, ["1.0.0"]);

    await fs.remove(getThemeDir(singleTheme));
  });

  it("returns empty array for nonexistent theme", async () => {
    const versions = await getThemeVersions("nonexistent-theme");
    assert.deepEqual(versions, []);
  });

  it("ignores invalid version folder names", async () => {
    const badFolders = "bad-folders-theme";
    await createThemeOnDisk(badFolders, { version: "1.0.0" });
    const updatesDir = getThemeUpdatesDir(badFolders);
    await fs.ensureDir(updatesDir);
    // Create invalid folder name
    await fs.ensureDir(path.join(updatesDir, "not-a-version"));
    // And a valid one
    const validDir = getThemeVersionDir(badFolders, "1.1.0");
    await fs.ensureDir(validDir);
    await fs.writeFile(path.join(validDir, "theme.json"), JSON.stringify({ version: "1.1.0" }));

    const versions = await getThemeVersions(badFolders);
    assert.ok(!versions.includes("not-a-version"));
    assert.ok(versions.includes("1.1.0"));

    await fs.remove(getThemeDir(badFolders));
  });
});

describe("getThemeLatestVersion", () => {
  it("returns the highest version", async () => {
    const theme = "latest-ver-theme";
    await createThemeOnDisk(theme, { version: "1.0.0" });
    const updDir = getThemeVersionDir(theme, "2.0.0");
    await fs.ensureDir(updDir);
    await fs.writeFile(path.join(updDir, "theme.json"), JSON.stringify({ version: "2.0.0" }));

    const latest = await getThemeLatestVersion(theme);
    assert.equal(latest, "2.0.0");

    await fs.remove(getThemeDir(theme));
  });

  it("returns null for nonexistent theme", async () => {
    const latest = await getThemeLatestVersion("ghost-theme");
    assert.equal(latest, null);
  });
});

describe("getThemeSourceDir", () => {
  it("returns root when no latest/ exists", async () => {
    const theme = "no-latest-theme";
    await createThemeOnDisk(theme);

    const sourceDir = await getThemeSourceDir(theme);
    assert.equal(sourceDir, getThemeDir(theme));

    await fs.remove(getThemeDir(theme));
  });

  it("returns latest/ when it contains theme.json", async () => {
    const theme = "has-latest-theme";
    await createThemeOnDisk(theme);
    const latestDir = getThemeLatestDir(theme);
    await fs.ensureDir(latestDir);
    await fs.writeFile(path.join(latestDir, "theme.json"), JSON.stringify({ version: "2.0.0" }));

    const sourceDir = await getThemeSourceDir(theme);
    assert.equal(sourceDir, latestDir);

    await fs.remove(getThemeDir(theme));
  });
});

// ============================================================================
// buildLatestSnapshot
// ============================================================================

describe("buildLatestSnapshot", () => {
  const SNAP_THEME = "snapshot-theme";

  before(async () => {
    await createThemeOnDisk(SNAP_THEME, { version: "1.0.0" });

    // Add a file in base that we can verify gets copied
    await fs.writeFile(path.join(getThemeDir(SNAP_THEME), "base-file.txt"), "base content");

    // Add update v1.1.0 with an overriding file
    const v110 = getThemeVersionDir(SNAP_THEME, "1.1.0");
    await fs.ensureDir(v110);
    await fs.writeFile(path.join(v110, "theme.json"), JSON.stringify({ name: SNAP_THEME, version: "1.1.0" }));
    await fs.writeFile(path.join(v110, "base-file.txt"), "updated content");
    // Add a new file in the update
    await fs.writeFile(path.join(v110, "new-in-110.txt"), "new file");
  });

  after(async () => {
    await fs.remove(getThemeDir(SNAP_THEME));
  });

  it("builds latest/ directory from base + updates", async () => {
    await buildLatestSnapshot(SNAP_THEME);

    const latestDir = getThemeLatestDir(SNAP_THEME);
    assert.ok(await fs.pathExists(latestDir));
    assert.ok(await fs.pathExists(path.join(latestDir, "theme.json")));
  });

  it("update files overwrite base files", async () => {
    const latestDir = getThemeLatestDir(SNAP_THEME);
    const content = await fs.readFile(path.join(latestDir, "base-file.txt"), "utf8");
    assert.equal(content, "updated content");
  });

  it("new files from updates are included", async () => {
    const latestDir = getThemeLatestDir(SNAP_THEME);
    assert.ok(await fs.pathExists(path.join(latestDir, "new-in-110.txt")));
  });

  it("excludes updates/ and latest/ directories from snapshot", async () => {
    const latestDir = getThemeLatestDir(SNAP_THEME);
    assert.ok(!(await fs.pathExists(path.join(latestDir, "updates"))));
    assert.ok(!(await fs.pathExists(path.join(latestDir, "latest"))));
  });

  it("skips build when no updates exist", async () => {
    const singleTheme = "no-updates-theme";
    await createThemeOnDisk(singleTheme, { version: "1.0.0" });

    await buildLatestSnapshot(singleTheme);
    const latestDir = getThemeLatestDir(singleTheme);
    assert.ok(!(await fs.pathExists(latestDir)), "Should not create latest/ without updates");

    await fs.remove(getThemeDir(singleTheme));
  });

  it("throws when version folder has mismatching theme.json", async () => {
    const badTheme = "mismatch-theme";
    await createThemeOnDisk(badTheme, { version: "1.0.0" });
    const v110 = getThemeVersionDir(badTheme, "1.1.0");
    await fs.ensureDir(v110);
    // Version in theme.json doesn't match folder name
    await fs.writeFile(path.join(v110, "theme.json"), JSON.stringify({ version: "9.9.9" }));

    await assert.rejects(
      () => buildLatestSnapshot(badTheme),
      (err) => {
        assert.ok(err.message.includes("version mismatch"));
        return true;
      },
    );

    await fs.remove(getThemeDir(badTheme));
  });

  it("throws when version folder is missing theme.json", async () => {
    const noJsonTheme = "no-json-theme";
    await createThemeOnDisk(noJsonTheme, { version: "1.0.0" });
    const v110 = getThemeVersionDir(noJsonTheme, "1.1.0");
    await fs.ensureDir(v110);
    // No theme.json in this version folder

    await assert.rejects(
      () => buildLatestSnapshot(noJsonTheme),
      (err) => {
        assert.ok(err.message.includes("missing theme.json"));
        return true;
      },
    );

    await fs.remove(getThemeDir(noJsonTheme));
  });

  it("processes deleted/ folder to remove files", async () => {
    const delTheme = "delete-test-theme";
    await createThemeOnDisk(delTheme, { version: "1.0.0" });
    await fs.writeFile(path.join(getThemeDir(delTheme), "remove-me.txt"), "to be removed");

    const v110 = getThemeVersionDir(delTheme, "1.1.0");
    await fs.ensureDir(v110);
    await fs.writeFile(path.join(v110, "theme.json"), JSON.stringify({ version: "1.1.0" }));
    // Mark file for deletion
    const deletedDir = path.join(v110, "deleted");
    await fs.ensureDir(deletedDir);
    await fs.writeFile(path.join(deletedDir, "remove-me.txt"), ""); // placeholder

    await buildLatestSnapshot(delTheme);

    const latestDir = getThemeLatestDir(delTheme);
    assert.ok(!(await fs.pathExists(path.join(latestDir, "remove-me.txt"))), "File should be deleted");

    await fs.remove(getThemeDir(delTheme));
  });
});

// ============================================================================
// getAllThemes (controller)
// ============================================================================

describe("getAllThemes", () => {
  before(async () => {
    await createThemeOnDisk("list-theme-a", { version: "1.0.0", name: "Theme A", widgetCount: 3 });
    await createThemeOnDisk("list-theme-b", { version: "2.0.0", name: "Theme B", widgetCount: 1 });
  });

  after(async () => {
    await fs.remove(getThemeDir("list-theme-a"));
    await fs.remove(getThemeDir("list-theme-b"));
  });

  it("returns all themes with metadata", async () => {
    const res = await callController(getAllThemes);
    assert.equal(res._status, 200);
    assert.ok(Array.isArray(res._json));

    const themeA = res._json.find((t) => t.id === "list-theme-a");
    assert.ok(themeA, "Theme A should be in the list");
    assert.equal(themeA.name, "Theme A");
    assert.equal(themeA.version, "1.0.0");
    assert.equal(themeA.widgets, 3);
  });

  it("includes version information", async () => {
    const res = await callController(getAllThemes);
    const themeA = res._json.find((t) => t.id === "list-theme-a");
    assert.ok(Array.isArray(themeA.versions));
    assert.ok(themeA.versions.includes("1.0.0"));
    assert.ok(themeA.latestVersion);
  });

  it("skips themes with invalid theme.json", async () => {
    // Create a broken theme
    const brokenDir = getThemeDir("broken-theme");
    await fs.ensureDir(brokenDir);
    await fs.writeFile(path.join(brokenDir, "theme.json"), "NOT JSON!!!");

    const res = await callController(getAllThemes);
    const broken = res._json.find((t) => t.id === "broken-theme");
    assert.ok(!broken, "Broken theme should be filtered out");

    await fs.remove(brokenDir);
  });
});

// ============================================================================
// getTheme (single theme)
// ============================================================================

describe("getTheme", () => {
  before(async () => {
    await createThemeOnDisk("get-single-theme", { version: "1.5.0", name: "Get Test" });
  });

  after(async () => {
    await fs.remove(getThemeDir("get-single-theme"));
  });

  it("returns theme.json data", async () => {
    const res = await callController(getTheme, { params: { id: "get-single-theme" } });
    assert.equal(res._status, 200);
    assert.equal(res._json.name, "Get Test");
    assert.equal(res._json.version, "1.5.0");
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(getTheme, { params: { id: "ghost-theme" } });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// getThemeWidgets
// ============================================================================

describe("getThemeWidgets", () => {
  before(async () => {
    await createThemeOnDisk("widgets-test-theme", { widgetCount: 3 });
    // Also create a global/ directory (should be excluded from count)
    const globalDir = path.join(getThemeWidgetsDir("widgets-test-theme"), "global");
    await fs.ensureDir(globalDir);
    await fs.writeFile(path.join(globalDir, "schema.json"), JSON.stringify({ type: "global" }));
  });

  after(async () => {
    await fs.remove(getThemeDir("widgets-test-theme"));
  });

  it("returns widget schemas excluding global/", async () => {
    const res = await callController(getThemeWidgets, { params: { id: "widgets-test-theme" } });
    assert.equal(res._status, 200);
    assert.equal(res._json.length, 3);
    assert.ok(!res._json.find((w) => w.type === "global"), "global/ should be excluded");
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(getThemeWidgets, { params: { id: "no-such-theme" } });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// getThemeTemplates
// ============================================================================

describe("getThemeTemplates", () => {
  before(async () => {
    await createThemeOnDisk("templates-test-theme", { templateCount: 2 });
  });

  after(async () => {
    await fs.remove(getThemeDir("templates-test-theme"));
  });

  it("returns template JSON files", async () => {
    const res = await callController(getThemeTemplates, { params: { id: "templates-test-theme" } });
    assert.equal(res._status, 200);
    assert.equal(res._json.length, 2);
    assert.ok(res._json[0].id);
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(getThemeTemplates, { params: { id: "no-such-theme" } });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// getThemeVersionsHandler
// ============================================================================

describe("getThemeVersionsHandler", () => {
  before(async () => {
    await createThemeOnDisk("ver-handler-theme", { version: "1.0.0" });
  });

  after(async () => {
    await fs.remove(getThemeDir("ver-handler-theme"));
  });

  it("returns versions and latestVersion", async () => {
    const res = await callController(getThemeVersionsHandler, { params: { id: "ver-handler-theme" } });
    assert.equal(res._status, 200);
    assert.equal(res._json.themeId, "ver-handler-theme");
    assert.deepEqual(res._json.versions, ["1.0.0"]);
    assert.equal(res._json.latestVersion, "1.0.0");
  });
});

// ============================================================================
// deleteTheme
// ============================================================================

describe("deleteTheme", () => {
  it("deletes an unused theme", async () => {
    await createThemeOnDisk("deletable-theme");

    const res = await callController(deleteTheme, { params: { id: "deletable-theme" } });
    assert.equal(res._status, 200);
    assert.ok(res._json.success);
    assert.ok(!(await fs.pathExists(getThemeDir("deletable-theme"))));
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(deleteTheme, { params: { id: "ghost-theme" } });
    assert.equal(res._status, 404);
  });

  it("returns 409 when theme is in use by a project", async () => {
    // "in-use-theme" is used by our test project (set up in before())
    await createThemeOnDisk("in-use-theme");

    const res = await callController(deleteTheme, { params: { id: "in-use-theme" } });
    assert.equal(res._status, 409);
    assert.ok(res._json.error.includes("in use"));
    assert.ok(Array.isArray(res._json.projectsUsingTheme));
    assert.equal(res._json.projectsUsingTheme.length, 1);
    assert.equal(res._json.projectsUsingTheme[0].name, "Theme Test Project");

    // Theme should still exist
    assert.ok(await fs.pathExists(getThemeDir("in-use-theme")));
    await fs.remove(getThemeDir("in-use-theme"));
  });
});

// ============================================================================
// uploadTheme — validation
// ============================================================================

describe("uploadTheme validation", () => {
  it("returns 400 when no file is uploaded", async () => {
    const res = await callController(uploadTheme, { file: null });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("No theme zip"));
  });

  it("returns 400 for empty zip", async () => {
    const zip = new AdmZip.default();
    const res = await callController(uploadTheme, {
      file: { buffer: zip.toBuffer() },
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("empty"));
  });

  it("returns 400 when theme.json is missing", async () => {
    // buildThemeZip always adds theme.json, so build manually:
    const zip = new AdmZip.default();
    zip.addFile("my-theme/screenshot.png", Buffer.from("png"));
    zip.addFile("my-theme/layout.liquid", Buffer.from("<html></html>"));
    zip.addFile("my-theme/assets/style.css", Buffer.from("body{}"));
    zip.addFile("my-theme/templates/home.json", Buffer.from("{}"));
    zip.addFile("my-theme/widgets/hero/schema.json", Buffer.from("{}"));

    const res = await callController(uploadTheme, {
      file: { buffer: zip.toBuffer() },
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("theme.json"));
  });

  it("returns 400 when screenshot.png is missing", async () => {
    const buffer = buildThemeZip("no-screenshot", { includeScreenshot: false });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("screenshot.png"));
  });

  it("returns 400 when layout.liquid is missing", async () => {
    const buffer = buildThemeZip("no-layout", { includeLayout: false });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("layout.liquid"));
  });

  it("returns 400 when assets/ directory is missing", async () => {
    const buffer = buildThemeZip("no-assets", { includeAssets: false });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("assets"));
  });

  it("returns 400 when templates/ directory is missing", async () => {
    const buffer = buildThemeZip("no-templates", { includeTemplates: false });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("templates"));
  });

  it("returns 400 when widgets/ directory is missing", async () => {
    const buffer = buildThemeZip("no-widgets", { includeWidgets: false });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("widgets"));
  });

  it("returns 400 when theme.json has invalid JSON", async () => {
    const zip = new AdmZip.default();
    zip.addFile("bad-json-theme/theme.json", Buffer.from("{ broken JSON!!!"));
    zip.addFile("bad-json-theme/screenshot.png", Buffer.from("png"));
    zip.addFile("bad-json-theme/layout.liquid", Buffer.from("<html></html>"));
    zip.addFile("bad-json-theme/assets/s.css", Buffer.from(""));
    zip.addFile("bad-json-theme/templates/h.json", Buffer.from("{}"));
    zip.addFile("bad-json-theme/widgets/w/s.json", Buffer.from("{}"));

    const res = await callController(uploadTheme, { file: { buffer: zip.toBuffer() } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("parse JSON"));
  });

  it("returns 400 when required metadata fields are missing", async () => {
    const buffer = buildThemeZip("missing-fields", {
      themeJsonOverride: { version: "1.0.0" }, // missing name and author
    });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("Missing required fields"));
    assert.ok(res._json.message.includes("name"));
    assert.ok(res._json.message.includes("author"));
  });

  it("returns 400 for invalid semver version", async () => {
    const buffer = buildThemeZip("bad-version", { version: "not-a-version" });
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("Invalid version format"));
  });

  it("returns 400 for files at zip root (no folder wrapper)", async () => {
    const zip = new AdmZip.default();
    zip.addFile("theme.json", Buffer.from(JSON.stringify({ name: "test", version: "1.0.0", author: "a" })));
    zip.addFile("layout.liquid", Buffer.from("<html></html>"));

    const res = await callController(uploadTheme, { file: { buffer: zip.toBuffer() } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("structure is invalid") || res._json.message.includes("root folder"));
  });
});

// ============================================================================
// uploadTheme — update version validation
// ============================================================================

describe("uploadTheme update validation", () => {
  it("returns 400 when update folder name is not valid semver", async () => {
    const zip = new AdmZip.default();
    const n = "upd-bad-ver";
    zip.addFile(`${n}/theme.json`, Buffer.from(JSON.stringify({ name: n, version: "1.0.0", author: "a" })));
    zip.addFile(`${n}/screenshot.png`, Buffer.from("png"));
    zip.addFile(`${n}/layout.liquid`, Buffer.from("<html></html>"));
    zip.addFile(`${n}/assets/s.css`, Buffer.from(""));
    zip.addFile(`${n}/templates/h.json`, Buffer.from("{}"));
    zip.addFile(`${n}/widgets/w/s.json`, Buffer.from("{}"));
    zip.addFile(`${n}/updates/bad-name/theme.json`, Buffer.from(JSON.stringify({ version: "bad-name" })));

    const res = await callController(uploadTheme, { file: { buffer: zip.toBuffer() } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("Invalid update folder name"));
  });

  it("returns 400 when update folder missing theme.json", async () => {
    const zip = new AdmZip.default();
    const n = "upd-no-json";
    zip.addFile(`${n}/theme.json`, Buffer.from(JSON.stringify({ name: n, version: "1.0.0", author: "a" })));
    zip.addFile(`${n}/screenshot.png`, Buffer.from("png"));
    zip.addFile(`${n}/layout.liquid`, Buffer.from("<html></html>"));
    zip.addFile(`${n}/assets/s.css`, Buffer.from(""));
    zip.addFile(`${n}/templates/h.json`, Buffer.from("{}"));
    zip.addFile(`${n}/widgets/w/s.json`, Buffer.from("{}"));
    // Update folder with no theme.json
    zip.addFile(`${n}/updates/1.1.0/assets/new.css`, Buffer.from(""));

    const res = await callController(uploadTheme, { file: { buffer: zip.toBuffer() } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("missing required theme.json"));
  });

  it("returns 400 when update version doesn't match folder name", async () => {
    const buffer = buildThemeZip("upd-mismatch", {
      version: "1.0.0",
      updates: [{ version: "1.1.0", themeJsonVersion: "9.9.9" }],
    });

    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 400);
    assert.ok(res._json.message.includes("version mismatch"));
  });
});

// ============================================================================
// uploadTheme — successful installation
// ============================================================================

describe("uploadTheme — new theme", () => {
  afterEach(async () => {
    // Clean up installed themes
    for (const name of ["fresh-theme", "theme-with-updates"]) {
      await fs.remove(getThemeDir(name));
    }
  });

  it("installs a new theme successfully", async () => {
    const buffer = buildThemeZip("fresh-theme", {
      version: "1.0.0",
      name: "Fresh Theme",
      author: "Test Author",
    });

    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 201, `Expected 201, got ${res._status}: ${JSON.stringify(res._json)}`);
    assert.ok(res._json.message.includes("installed"));
    assert.equal(res._json.theme.id, "fresh-theme");
    assert.equal(res._json.theme.name, "Fresh Theme");
    assert.equal(res._json.theme.version, "1.0.0");
    assert.equal(res._json.theme.isUpdate, false);
    assert.equal(res._json.theme.widgets, 1); // One widget (hero/)
  });

  it("creates theme directory with all required files", async () => {
    const buffer = buildThemeZip("fresh-theme");
    await callController(uploadTheme, { file: { buffer } });

    const themeDir = getThemeDir("fresh-theme");
    assert.ok(await fs.pathExists(path.join(themeDir, "theme.json")));
    assert.ok(await fs.pathExists(path.join(themeDir, "screenshot.png")));
    assert.ok(await fs.pathExists(path.join(themeDir, "layout.liquid")));
    assert.ok(await fs.pathExists(path.join(themeDir, "assets")));
    assert.ok(await fs.pathExists(path.join(themeDir, "templates")));
    assert.ok(await fs.pathExists(path.join(themeDir, "widgets")));
  });

  it("installs theme with update versions and builds latest/", async () => {
    const buffer = buildThemeZip("theme-with-updates", {
      version: "1.0.0",
      updates: [{ version: "1.1.0", files: { "assets/new.css": "new style" } }],
    });

    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 201);
    assert.ok(res._json.theme.versions.includes("1.0.0"));
    assert.ok(res._json.theme.versions.includes("1.1.0"));

    // latest/ should be built
    const latestDir = getThemeLatestDir("theme-with-updates");
    assert.ok(await fs.pathExists(latestDir));
  });

  it("returns 409 when theme is already installed and up to date", async () => {
    const buffer = buildThemeZip("fresh-theme", { version: "1.0.0" });
    await callController(uploadTheme, { file: { buffer } });

    // Upload again — same version, no new updates
    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 409);
    assert.ok(res._json.message.includes("already up to date"));
  });
});

// ============================================================================
// uploadTheme — updating existing theme
// ============================================================================

describe("uploadTheme — theme update", () => {
  const EXISTING_THEME = "existing-for-update";

  before(async () => {
    // Install the base theme first
    const buffer = buildThemeZip(EXISTING_THEME, { version: "1.0.0" });
    await callController(uploadTheme, { file: { buffer } });
  });

  after(async () => {
    await fs.remove(getThemeDir(EXISTING_THEME));
  });

  it("imports new update versions into existing theme", async () => {
    const buffer = buildThemeZip(EXISTING_THEME, {
      version: "1.0.0",
      updates: [{ version: "1.1.0", files: { "assets/patch.css": "patched" } }],
    });

    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 201);
    assert.ok(res._json.theme.isUpdate);
    assert.deepEqual(res._json.theme.addedVersions, ["1.1.0"]);
    assert.ok(res._json.message.includes("1.1.0"));
  });

  it("rejects when base version doesn't match", async () => {
    const buffer = buildThemeZip(EXISTING_THEME, {
      version: "2.0.0", // Different base
      updates: [{ version: "2.1.0" }],
    });

    const res = await callController(uploadTheme, { file: { buffer } });
    assert.equal(res._status, 409);
    assert.ok(res._json.message.includes("base version"));
  });
});

// ============================================================================
// copyThemeToProject
// ============================================================================

describe("copyThemeToProject", () => {
  const COPY_THEME = "copy-theme";

  before(async () => {
    await createThemeOnDisk(COPY_THEME, { version: "3.0.0", widgetCount: 2, templateCount: 2 });
  });

  after(async () => {
    await fs.remove(getThemeDir(COPY_THEME));
  });

  it("copies theme files to project directory", async () => {
    const targetDir = path.join(TEST_ROOT, "copy-target");
    await fs.ensureDir(targetDir);

    const version = await copyThemeToProject(COPY_THEME, targetDir);
    assert.equal(version, "3.0.0");
    assert.ok(await fs.pathExists(path.join(targetDir, "theme.json")));
    assert.ok(await fs.pathExists(path.join(targetDir, "layout.liquid")));
    assert.ok(await fs.pathExists(path.join(targetDir, "widgets")));

    await fs.remove(targetDir);
  });

  it("excludes updates/ and latest/ from copy", async () => {
    // Add fake updates/ and latest/ dirs
    await fs.ensureDir(path.join(getThemeDir(COPY_THEME), "updates"));
    await fs.ensureDir(path.join(getThemeDir(COPY_THEME), "latest"));

    const targetDir = path.join(TEST_ROOT, "copy-target-2");
    await fs.ensureDir(targetDir);

    await copyThemeToProject(COPY_THEME, targetDir);
    assert.ok(!(await fs.pathExists(path.join(targetDir, "updates"))));
    assert.ok(!(await fs.pathExists(path.join(targetDir, "latest"))));

    await fs.remove(targetDir);
  });
});

// ============================================================================
// readProjectThemeData / getProjectThemeSettings / saveProjectThemeSettings
// ============================================================================

describe("readProjectThemeData", () => {
  it("reads theme.json from project directory", async () => {
    const data = await readProjectThemeData("theme-test-project-uuid");
    assert.ok(data.settings);
    assert.ok(data.settings.global);
  });

  it("throws for nonexistent project", async () => {
    await assert.rejects(
      () => readProjectThemeData("nonexistent-uuid"),
      (err) => err.message.includes("not found"),
    );
  });
});

describe("getProjectThemeSettings", () => {
  it("returns project theme data", async () => {
    const res = await callController(getProjectThemeSettings, {
      params: { projectId: "theme-test-project-uuid" },
    });
    assert.equal(res._status, 200);
    assert.ok(res._json.settings);
  });
});

describe("saveProjectThemeSettings", () => {
  it("saves theme settings to project", async () => {
    const newSettings = { settings: { global: { colors: [{ id: "bg", value: "#000" }] } } };
    const res = await callController(saveProjectThemeSettings, {
      params: { projectId: "theme-test-project-uuid" },
      body: newSettings,
    });
    assert.equal(res._status, 200);
    assert.ok(res._json.message.includes("saved"));

    // Verify persisted
    const saved = await readProjectThemeData("theme-test-project-uuid");
    assert.equal(saved.settings.global.colors[0].id, "bg");
  });
});

// ============================================================================
// updateTheme (controller) and themeHasPendingUpdates
// ============================================================================

describe("updateTheme", () => {
  const UPD_THEME = "updateable-theme";

  before(async () => {
    await createThemeOnDisk(UPD_THEME, { version: "1.0.0" });
    // Add a pending update
    const v110 = getThemeVersionDir(UPD_THEME, "1.1.0");
    await fs.ensureDir(v110);
    await fs.writeFile(path.join(v110, "theme.json"), JSON.stringify({ name: UPD_THEME, version: "1.1.0" }));
  });

  after(async () => {
    await fs.remove(getThemeDir(UPD_THEME));
  });

  it("detects pending updates", async () => {
    const hasPending = await themeHasPendingUpdates(UPD_THEME);
    assert.equal(hasPending, true);
  });

  it("builds latest/ and returns updated version", async () => {
    const res = await callController(updateTheme, { params: { id: UPD_THEME } });
    assert.equal(res._status, 200);
    assert.ok(res._json.message.includes("1.1.0"));
    assert.equal(res._json.theme.version, "1.1.0");
  });

  it("returns 400 when no pending updates", async () => {
    // After building, no more pending updates
    const res = await callController(updateTheme, { params: { id: UPD_THEME } });
    assert.equal(res._status, 400);
    assert.ok(res._json.error.includes("no pending updates"));
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(updateTheme, { params: { id: "ghost" } });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// getThemeUpdateCount
// ============================================================================

describe("getThemeUpdateCount", () => {
  before(async () => {
    // Create a theme with pending updates
    await createThemeOnDisk("count-theme-a", { version: "1.0.0" });
    const v = getThemeVersionDir("count-theme-a", "1.1.0");
    await fs.ensureDir(v);
    await fs.writeFile(path.join(v, "theme.json"), JSON.stringify({ version: "1.1.0" }));

    // Create a theme without pending updates
    await createThemeOnDisk("count-theme-b", { version: "1.0.0" });
  });

  after(async () => {
    await fs.remove(getThemeDir("count-theme-a"));
    await fs.remove(getThemeDir("count-theme-b"));
  });

  it("returns count of themes with pending updates", async () => {
    const res = await callController(getThemeUpdateCount);
    assert.equal(res._status, 200);
    assert.ok(typeof res._json.count === "number");
    assert.ok(res._json.count >= 1, "Should count at least 1 theme with pending updates");
  });
});

// ============================================================================
// Theme Presets — resolvePresetPaths
// ============================================================================

describe("resolvePresetPaths", () => {
  const PRESET_THEME = "preset-resolve-theme";

  before(async () => {
    await createThemeOnDisk(PRESET_THEME, { version: "1.0.0" });

    const presetsDir = path.join(getThemeDir(PRESET_THEME), "presets");
    await fs.ensureDir(presetsDir);

    await fs.outputFile(
      path.join(presetsDir, "presets.json"),
      JSON.stringify({
        default: "default",
        presets: [
          { id: "default", name: "Default" },
          { id: "restaurant", name: "Restaurant" },
          { id: "minimal", name: "Minimal" },
        ],
      }),
    );

    // restaurant: has templates, menus, and settings
    const restaurantDir = path.join(presetsDir, "restaurant");
    await fs.ensureDir(path.join(restaurantDir, "templates"));
    await fs.outputFile(
      path.join(restaurantDir, "templates", "index.json"),
      JSON.stringify({ id: "index", name: "Home", slug: "index" }),
    );
    await fs.ensureDir(path.join(restaurantDir, "menus"));
    await fs.outputFile(
      path.join(restaurantDir, "menus", "main-menu.json"),
      JSON.stringify({ id: "main-menu", name: "Main menu", items: [] }),
    );
    await fs.outputFile(
      path.join(restaurantDir, "preset.json"),
      JSON.stringify({ settings: { standard_bg_primary: "#fefbf6" } }),
    );

    // minimal: settings only (no templates/menus)
    const minimalDir = path.join(presetsDir, "minimal");
    await fs.ensureDir(minimalDir);
    await fs.outputFile(
      path.join(minimalDir, "preset.json"),
      JSON.stringify({ settings: { standard_accent: "#000000" } }),
    );
  });

  after(async () => {
    await fs.remove(getThemeDir(PRESET_THEME));
  });

  it("returns root paths when no presetId", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, null);
    assert.equal(result.templatesDir, getThemeTemplatesDir(PRESET_THEME));
    assert.equal(result.menusDir, null);
    assert.equal(result.settingsOverrides, null);
  });

  it("returns root paths for default preset with no physical dir", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "default");
    assert.equal(result.templatesDir, getThemeTemplatesDir(PRESET_THEME));
    assert.equal(result.menusDir, null);
    assert.equal(result.settingsOverrides, null);
  });

  it("returns preset templates/menus/settings for full preset", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "restaurant");
    const expectedTemplates = path.join(getThemeDir(PRESET_THEME), "presets", "restaurant", "templates");
    const expectedMenus = path.join(getThemeDir(PRESET_THEME), "presets", "restaurant", "menus");
    assert.equal(result.templatesDir, expectedTemplates);
    assert.equal(result.menusDir, expectedMenus);
    assert.deepEqual(result.settingsOverrides, { standard_bg_primary: "#fefbf6" });
  });

  it("returns root templates with settings for settings-only preset", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "minimal");
    assert.equal(result.templatesDir, getThemeTemplatesDir(PRESET_THEME));
    assert.equal(result.menusDir, null);
    assert.deepEqual(result.settingsOverrides, { standard_accent: "#000000" });
  });

  it("returns root paths for nonexistent preset", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "nonexistent");
    assert.equal(result.templatesDir, getThemeTemplatesDir(PRESET_THEME));
    assert.equal(result.menusDir, null);
    assert.equal(result.settingsOverrides, null);
  });
});

// ============================================================================
// Theme Presets — getThemePresets endpoint
// ============================================================================

describe("getThemePresets", () => {
  const PRESET_EP_THEME = "preset-endpoint-theme";

  before(async () => {
    await createThemeOnDisk(PRESET_EP_THEME);
    const presetsDir = path.join(getThemeDir(PRESET_EP_THEME), "presets");
    await fs.ensureDir(presetsDir);
    await fs.outputFile(
      path.join(presetsDir, "presets.json"),
      JSON.stringify({
        default: "default",
        presets: [
          { id: "default", name: "Default", description: "Base style" },
          { id: "dark", name: "Dark Mode", description: "Dark theme" },
        ],
      }),
    );
    // Add screenshot for dark preset
    const darkDir = path.join(presetsDir, "dark");
    await fs.ensureDir(darkDir);
    await fs.writeFile(path.join(darkDir, "screenshot.png"), "fake-png");
  });

  after(async () => {
    await fs.remove(getThemeDir(PRESET_EP_THEME));
  });

  it("returns presets with enriched data", async () => {
    const res = await callController(getThemePresets, { params: { id: PRESET_EP_THEME } });
    assert.equal(res._status, 200);
    assert.equal(res._json.default, "default");
    assert.equal(res._json.presets.length, 2);

    const defaultPreset = res._json.presets.find((p) => p.id === "default");
    assert.ok(defaultPreset.isDefault);

    const darkPreset = res._json.presets.find((p) => p.id === "dark");
    assert.ok(!darkPreset.isDefault);
    assert.ok(darkPreset.hasScreenshot);
  });

  it("returns empty presets for theme without presets dir", async () => {
    const noPresetTheme = "no-presets-theme";
    await createThemeOnDisk(noPresetTheme);

    const res = await callController(getThemePresets, { params: { id: noPresetTheme } });
    assert.equal(res._status, 200);
    assert.equal(res._json.presets.length, 0);

    await fs.remove(getThemeDir(noPresetTheme));
  });

  it("returns 404 for nonexistent theme", async () => {
    const res = await callController(getThemePresets, { params: { id: "ghost-theme" } });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// copyThemeToProject excludes presets
// ============================================================================

describe("copyThemeToProject excludes presets", () => {
  const COPY_PRESET_THEME = "copy-preset-theme";

  before(async () => {
    await createThemeOnDisk(COPY_PRESET_THEME);
    const presetsDir = path.join(getThemeDir(COPY_PRESET_THEME), "presets");
    await fs.ensureDir(presetsDir);
    await fs.outputFile(path.join(presetsDir, "presets.json"), JSON.stringify({ presets: [] }));
  });

  after(async () => {
    await fs.remove(getThemeDir(COPY_PRESET_THEME));
  });

  it("does not copy presets/ to project directory", async () => {
    const targetDir = path.join(TEST_ROOT, "copy-no-presets-target");
    await fs.ensureDir(targetDir);

    await copyThemeToProject(COPY_PRESET_THEME, targetDir);
    assert.ok(!(await fs.pathExists(path.join(targetDir, "presets"))));

    await fs.remove(targetDir);
  });
});

// ============================================================================
// buildLatestSnapshot excludes presets
// ============================================================================

describe("buildLatestSnapshot excludes presets", () => {
  it("excludes presets/ directory from snapshot", async () => {
    const presetSnapTheme = "preset-snap-theme";
    await createThemeOnDisk(presetSnapTheme, { version: "1.0.0" });

    const presetsDir = path.join(getThemeDir(presetSnapTheme), "presets");
    await fs.ensureDir(presetsDir);
    await fs.outputFile(path.join(presetsDir, "presets.json"), "{}");

    const v110 = getThemeVersionDir(presetSnapTheme, "1.1.0");
    await fs.ensureDir(v110);
    await fs.writeFile(path.join(v110, "theme.json"), JSON.stringify({ name: presetSnapTheme, version: "1.1.0" }));

    await buildLatestSnapshot(presetSnapTheme);

    const latestDir = getThemeLatestDir(presetSnapTheme);
    assert.ok(!(await fs.pathExists(path.join(latestDir, "presets"))));

    await fs.remove(getThemeDir(presetSnapTheme));
  });
});
