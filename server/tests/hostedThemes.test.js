/**
 * Hosted Theme Source Resolution Test Suite
 *
 * Tests that hosted mode resolves themes from HOSTED_THEMES_ROOT
 * (a shared read-only directory) instead of per-user theme libraries.
 *
 * Covers: getThemeSourceDir, copyThemeToProject, resolvePresetPaths,
 * deepLinkCreateProject, checkForUpdates, and applyThemeUpdate.
 *
 * Run with: node --test server/tests/hostedThemes.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-hosted-themes-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes"); // per-user seed dir (OSS)
const TEST_HOSTED_THEMES_DIR = path.join(TEST_ROOT, "hosted-themes"); // shared commercial themes

// Override env BEFORE importing any server modules
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.HOSTED_THEMES_ROOT = TEST_HOSTED_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence console noise
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

// Import after env setup
const {
  HOSTED_THEMES_ROOT,
  getThemeDir,
  getThemeJsonPath,
  getThemeLatestDir,
  getThemeVersionDir,
  getUserThemesDir,
  getProjectDir,
  getProjectThemeJsonPath,
  getProjectPagesDir,
  getUserDataDir,
} = await import("../config.js");

const {
  getThemeSourceDir,
  copyThemeToProject,
  resolvePresetPaths,
  buildLatestSnapshot,
} = await import("../controllers/themeController.js");

const {
  getAllProjects,
  deepLinkCreateProject,
  getThemeUpdateStatus,
  applyProjectThemeUpdate,
} = await import("../controllers/projectController.js");

const { checkForUpdates, applyThemeUpdate } = await import("../services/themeUpdateService.js");

const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Verify env override
// ============================================================================

assert.equal(HOSTED_THEMES_ROOT, TEST_HOSTED_THEMES_DIR, "HOSTED_THEMES_ROOT should use test override");

// ============================================================================
// Helpers
// ============================================================================

const TEST_USER_ID = "user_hosted_test";

/**
 * Create a theme in the HOSTED_THEMES_ROOT directory (shared commercial themes).
 */
async function createHostedTheme(themeId, opts = {}) {
  const { version = "1.0.0", settings = {}, includePresets = false, presets = [] } = opts;
  const themeDir = path.join(HOSTED_THEMES_ROOT, themeId);
  await fs.ensureDir(themeDir);

  // theme.json
  await fs.writeJson(path.join(themeDir, "theme.json"), {
    name: themeId,
    version,
    author: "Hosted Author",
    description: "A commercial theme",
    settings: {
      colors: [{ id: "primary_color", label: "Primary", type: "color", value: "#ff0000", default: "#ff0000" }],
      ...settings,
    },
  });

  // Required files
  await fs.writeFile(path.join(themeDir, "screenshot.png"), "fake-screenshot");
  await fs.writeFile(
    path.join(themeDir, "layout.liquid"),
    "<!DOCTYPE html><html><body>{{ main_content | raw }}</body></html>",
  );
  await fs.ensureDir(path.join(themeDir, "assets"));
  await fs.writeFile(path.join(themeDir, "assets", "base.css"), "body { margin: 0; }");
  await fs.ensureDir(path.join(themeDir, "widgets", "hero"));
  await fs.writeJson(path.join(themeDir, "widgets", "hero", "schema.json"), { type: "hero", displayName: "Hero" });
  await fs.writeFile(path.join(themeDir, "widgets", "hero", "widget.liquid"), "<div class='hero'>v1</div>");
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), {
    id: "index",
    name: "Home",
    slug: "index",
    widgets: {},
  });
  await fs.ensureDir(path.join(themeDir, "menus"));
  await fs.writeJson(path.join(themeDir, "menus", "main-menu.json"), {
    id: "main-menu",
    name: "Main Menu",
    items: [{ id: "item_1", label: "Home", link: "index.html" }],
  });

  // Templates global
  await fs.ensureDir(path.join(themeDir, "templates", "global"));
  await fs.writeJson(path.join(themeDir, "templates", "global", "header.json"), { type: "header", widgets: {} });
  await fs.writeJson(path.join(themeDir, "templates", "global", "footer.json"), { type: "footer", widgets: {} });

  // Presets
  if (includePresets || presets.length > 0) {
    const presetsDir = path.join(themeDir, "presets");
    await fs.ensureDir(presetsDir);

    const presetList = presets.length > 0 ? presets : [{ id: "default", name: "Default" }];
    await fs.writeJson(path.join(presetsDir, "presets.json"), {
      default: "default",
      presets: presetList.map((p) => ({ id: p.id, name: p.name })),
    });

    for (const preset of presetList) {
      if (preset.id === "default") continue; // default has no physical dir
      const presetDir = path.join(presetsDir, preset.id);
      await fs.ensureDir(presetDir);

      if (preset.templates) {
        await fs.ensureDir(path.join(presetDir, "templates"));
        for (const [file, data] of Object.entries(preset.templates)) {
          await fs.writeJson(path.join(presetDir, "templates", file), data);
        }
      }
      if (preset.menus) {
        await fs.ensureDir(path.join(presetDir, "menus"));
        for (const [file, data] of Object.entries(preset.menus)) {
          await fs.writeJson(path.join(presetDir, "menus", file), data);
        }
      }
      if (preset.settings) {
        await fs.writeJson(path.join(presetDir, "preset.json"), { settings: preset.settings });
      }
    }
  }

  return themeDir;
}

/**
 * Create a versioned update in HOSTED_THEMES_ROOT and build latest/.
 */
async function addHostedThemeUpdate(themeId, version, opts = {}) {
  const { files = {}, settings = null } = opts;
  const themeDir = path.join(HOSTED_THEMES_ROOT, themeId);
  const updateDir = path.join(themeDir, "updates", version);
  await fs.ensureDir(updateDir);

  const themeJsonContent = {
    name: themeId,
    version,
    author: "Hosted Author",
    settings: settings || {
      colors: [
        { id: "primary_color", label: "Primary", type: "color", value: "#0000ff", default: "#0000ff" },
        { id: "accent_color", label: "Accent", type: "color", value: "#00ff00", default: "#00ff00" },
      ],
    },
  };
  await fs.writeJson(path.join(updateDir, "theme.json"), themeJsonContent, { spaces: 2 });

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(updateDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    if (typeof content === "object") {
      await fs.writeJson(fullPath, content, { spaces: 2 });
    } else {
      await fs.writeFile(fullPath, content);
    }
  }
}

/**
 * Build latest/ snapshot for a hosted theme.
 * Copies base files to a temp dir first (to avoid "copy to subdirectory of itself"),
 * then layers updates, then moves into latest/.
 */
async function buildHostedLatestSnapshot(themeId) {
  const themeDir = path.join(HOSTED_THEMES_ROOT, themeId);
  const latestDir = path.join(themeDir, "latest");

  // Get update directories
  const updatesDir = path.join(themeDir, "updates");
  let updateVersions = [];
  try {
    const entries = await fs.readdir(updatesDir);
    updateVersions = entries.filter((e) => /^\d+\.\d+\.\d+$/.test(e)).sort();
  } catch {
    return; // No updates
  }

  if (updateVersions.length === 0) return;

  // Use a temp dir to assemble latest/ (avoids "copy to subdirectory of itself")
  const tmpDir = path.join(TEST_ROOT, `build-latest-${themeId}-${Date.now()}`);

  // Copy base (excluding updates/ and latest/)
  const entries = await fs.readdir(themeDir);
  for (const entry of entries) {
    if (entry === "updates" || entry === "latest") continue;
    await fs.copy(path.join(themeDir, entry), path.join(tmpDir, entry));
  }

  // Layer updates in order
  for (const version of updateVersions) {
    const versionDir = path.join(updatesDir, version);
    await fs.copy(versionDir, tmpDir, { overwrite: true });
  }

  // Move assembled dir into latest/
  await fs.remove(latestDir);
  await fs.move(tmpDir, latestDir);
}

/** Create a project record and directory for a hosted user. */
async function createHostedProject(projectId, folderName, themeId, themeVersion) {
  await projectRepo.writeProjectsData(
    {
      projects: [
        {
          id: projectId,
          folderName,
          name: "Hosted Test Project",
          theme: themeId,
          themeVersion,
          source: "theme",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ],
      activeProjectId: projectId,
    },
    TEST_USER_ID,
  );

  const projectDir = getProjectDir(folderName, TEST_USER_ID);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(path.join(projectDir, "pages"));
  await fs.ensureDir(path.join(projectDir, "menus"));

  // Copy base theme to project (simulating initial creation)
  const hostedThemeDir = path.join(HOSTED_THEMES_ROOT, themeId);
  await fs.copy(path.join(hostedThemeDir, "layout.liquid"), path.join(projectDir, "layout.liquid"));
  await fs.copy(path.join(hostedThemeDir, "assets"), path.join(projectDir, "assets"));
  await fs.copy(path.join(hostedThemeDir, "widgets"), path.join(projectDir, "widgets"));

  // Project theme.json
  const hostedThemeJson = await fs.readJson(path.join(hostedThemeDir, "theme.json"));
  await fs.writeJson(
    getProjectThemeJsonPath(folderName, TEST_USER_ID),
    {
      ...hostedThemeJson,
      version: themeVersion,
    },
    { spaces: 2 },
  );

  return projectDir;
}

/** Build a mock Express req object for hosted mode. */
function mockReq({ params = {}, body = {}, appLocals = {} } = {}) {
  return {
    params,
    body,
    userId: TEST_USER_ID,
    app: {
      locals: {
        hostedMode: true,
        adapters: {},
        ...appLocals,
      },
    },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

/** Build a mock Express res object. */
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

async function callController(fn, { params, body, appLocals } = {}) {
  const req = mockReq({ params, body, appLocals });
  const res = mockRes();
  await fn(req, res);
  return res;
}

// ============================================================================
// Global setup / teardown
// ============================================================================

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(TEST_THEMES_DIR);
  await fs.ensureDir(TEST_HOSTED_THEMES_DIR);
});

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// getThemeSourceDir — hosted mode
// ============================================================================

describe("getThemeSourceDir — hosted mode", () => {
  before(async () => {
    await createHostedTheme("hosted-basic", { version: "1.0.0" });
    await createHostedTheme("hosted-with-latest", { version: "1.0.0" });
    await addHostedThemeUpdate("hosted-with-latest", "1.1.0", {
      files: { "layout.liquid": "<html>v1.1</html>" },
    });
    await buildHostedLatestSnapshot("hosted-with-latest");
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, "hosted-basic"));
    await fs.remove(path.join(HOSTED_THEMES_ROOT, "hosted-with-latest"));
  });

  it("resolves from HOSTED_THEMES_ROOT when hostedMode is true", async () => {
    const sourceDir = await getThemeSourceDir("hosted-basic", TEST_USER_ID, { hostedMode: true });
    assert.equal(sourceDir, path.join(HOSTED_THEMES_ROOT, "hosted-basic"));
  });

  it("resolves from HOSTED_THEMES_ROOT/latest/ when it exists", async () => {
    const sourceDir = await getThemeSourceDir("hosted-with-latest", TEST_USER_ID, { hostedMode: true });
    assert.equal(sourceDir, path.join(HOSTED_THEMES_ROOT, "hosted-with-latest", "latest"));
  });

  it("ignores per-user library entirely in hosted mode", async () => {
    // Create same theme name in user's library with DIFFERENT content
    const userThemeDir = getThemeDir("hosted-basic", TEST_USER_ID);
    await fs.ensureDir(userThemeDir);
    await fs.writeJson(path.join(userThemeDir, "theme.json"), {
      name: "hosted-basic",
      version: "999.0.0", // Different version to prove we don't read this
    });

    const sourceDir = await getThemeSourceDir("hosted-basic", TEST_USER_ID, { hostedMode: true });
    // Should resolve from HOSTED_THEMES_ROOT, not the user library
    assert.equal(sourceDir, path.join(HOSTED_THEMES_ROOT, "hosted-basic"));

    // Verify: reading theme.json from source should give the hosted version
    const themeJson = await fs.readJson(path.join(sourceDir, "theme.json"));
    assert.equal(themeJson.version, "1.0.0", "Should read hosted theme, not user's 999.0.0");

    await fs.remove(userThemeDir);
  });

  it("falls back to OSS per-user library when hostedMode is false", async () => {
    // Create a theme in the user's library
    const userThemeDir = getThemeDir("oss-theme", TEST_USER_ID);
    await fs.ensureDir(userThemeDir);
    await fs.writeJson(path.join(userThemeDir, "theme.json"), { name: "oss-theme", version: "1.0.0" });

    const sourceDir = await getThemeSourceDir("oss-theme", TEST_USER_ID, { hostedMode: false });
    assert.equal(sourceDir, userThemeDir);

    await fs.remove(userThemeDir);
  });

  it("falls back to OSS path when hostedMode is omitted (backward compat)", async () => {
    const userThemeDir = getThemeDir("compat-theme", TEST_USER_ID);
    await fs.ensureDir(userThemeDir);
    await fs.writeJson(path.join(userThemeDir, "theme.json"), { name: "compat-theme", version: "1.0.0" });

    // No hostedMode arg — should default to falsy and use OSS path
    const sourceDir = await getThemeSourceDir("compat-theme", TEST_USER_ID);
    assert.equal(sourceDir, userThemeDir);

    await fs.remove(userThemeDir);
  });
});

// ============================================================================
// copyThemeToProject — hosted mode
// ============================================================================

describe("copyThemeToProject — hosted mode", () => {
  const HOSTED_THEME = "hosted-copy-theme";

  before(async () => {
    await createHostedTheme(HOSTED_THEME, { version: "2.0.0" });
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, HOSTED_THEME));
  });

  it("copies theme files from HOSTED_THEMES_ROOT to project", async () => {
    const targetDir = path.join(TEST_ROOT, "copy-target-hosted");
    await fs.ensureDir(targetDir);

    const version = await copyThemeToProject(HOSTED_THEME, targetDir, [], TEST_USER_ID, { hostedMode: true });
    assert.equal(version, "2.0.0");
    assert.ok(await fs.pathExists(path.join(targetDir, "theme.json")));
    assert.ok(await fs.pathExists(path.join(targetDir, "layout.liquid")));
    assert.ok(await fs.pathExists(path.join(targetDir, "widgets", "hero", "schema.json")));
    assert.ok(await fs.pathExists(path.join(targetDir, "assets", "base.css")));

    await fs.remove(targetDir);
  });

  it("copies from latest/ when hosted theme has updates", async () => {
    await addHostedThemeUpdate(HOSTED_THEME, "2.1.0", {
      files: { "layout.liquid": "<html>UPDATED v2.1</html>" },
    });
    await buildHostedLatestSnapshot(HOSTED_THEME);

    const targetDir = path.join(TEST_ROOT, "copy-target-hosted-latest");
    await fs.ensureDir(targetDir);

    const version = await copyThemeToProject(HOSTED_THEME, targetDir, [], TEST_USER_ID, { hostedMode: true });
    assert.equal(version, "2.1.0");

    const layout = await fs.readFile(path.join(targetDir, "layout.liquid"), "utf8");
    assert.ok(layout.includes("UPDATED v2.1"), "Should copy updated layout from latest/");

    await fs.remove(targetDir);
  });

  it("excludes templates when requested", async () => {
    const targetDir = path.join(TEST_ROOT, "copy-target-hosted-excl");
    await fs.ensureDir(targetDir);

    await copyThemeToProject(HOSTED_THEME, targetDir, ["templates"], TEST_USER_ID, { hostedMode: true });
    assert.ok(!(await fs.pathExists(path.join(targetDir, "templates"))), "templates/ should be excluded");
    assert.ok(await fs.pathExists(path.join(targetDir, "widgets")), "widgets/ should still be present");

    await fs.remove(targetDir);
  });

  it("does not touch per-user themes directory", async () => {
    const userThemesDir = getUserThemesDir(TEST_USER_ID);
    const existedBefore = await fs.pathExists(userThemesDir);

    const targetDir = path.join(TEST_ROOT, "copy-no-user-dir");
    await fs.ensureDir(targetDir);
    await copyThemeToProject(HOSTED_THEME, targetDir, [], TEST_USER_ID, { hostedMode: true });

    const existsAfter = await fs.pathExists(userThemesDir);
    assert.equal(existsAfter, existedBefore, "Per-user themes directory should not be created by hosted copy");

    await fs.remove(targetDir);
  });
});

// ============================================================================
// resolvePresetPaths — hosted mode
// ============================================================================

describe("resolvePresetPaths — hosted mode", () => {
  const PRESET_THEME = "hosted-preset-theme";

  before(async () => {
    await createHostedTheme(PRESET_THEME, {
      version: "1.0.0",
      includePresets: true,
      presets: [
        { id: "default", name: "Default" },
        {
          id: "restaurant",
          name: "Restaurant",
          templates: {
            "index.json": { id: "index", name: "Restaurant Home", slug: "index", widgets: {} },
          },
          menus: {
            "main-menu.json": { id: "main-menu", name: "Restaurant Menu", items: [] },
          },
          settings: { standard_bg_primary: "#fefbf6" },
        },
        {
          id: "minimal",
          name: "Minimal",
          settings: { standard_accent: "#000000" },
        },
      ],
    });
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, PRESET_THEME));
  });

  it("resolves root templates from HOSTED_THEMES_ROOT when no presetId", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, null, TEST_USER_ID, { hostedMode: true });
    const expectedTemplates = path.join(HOSTED_THEMES_ROOT, PRESET_THEME, "templates");
    assert.equal(result.templatesDir, expectedTemplates);
    assert.equal(result.menusDir, null);
    assert.equal(result.settingsOverrides, null);
  });

  it("resolves preset templates/menus/settings from HOSTED_THEMES_ROOT", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "restaurant", TEST_USER_ID, { hostedMode: true });
    const expectedTemplates = path.join(HOSTED_THEMES_ROOT, PRESET_THEME, "presets", "restaurant", "templates");
    const expectedMenus = path.join(HOSTED_THEMES_ROOT, PRESET_THEME, "presets", "restaurant", "menus");
    assert.equal(result.templatesDir, expectedTemplates);
    assert.equal(result.menusDir, expectedMenus);
    assert.deepEqual(result.settingsOverrides, { standard_bg_primary: "#fefbf6" });
  });

  it("resolves settings-only preset from HOSTED_THEMES_ROOT", async () => {
    const result = await resolvePresetPaths(PRESET_THEME, "minimal", TEST_USER_ID, { hostedMode: true });
    // Should fall back to root templates since minimal has none
    const expectedTemplates = path.join(HOSTED_THEMES_ROOT, PRESET_THEME, "templates");
    assert.equal(result.templatesDir, expectedTemplates);
    assert.equal(result.menusDir, null);
    assert.deepEqual(result.settingsOverrides, { standard_accent: "#000000" });
  });

  it("resolves from latest/ when hosted theme has updates with presets", async () => {
    const themeId = "hosted-preset-updated";
    await createHostedTheme(themeId, { version: "1.0.0" });

    // Add update with presets
    await addHostedThemeUpdate(themeId, "1.1.0", {
      files: {
        "presets/presets.json": JSON.stringify({
          default: "default",
          presets: [{ id: "default", name: "Default" }, { id: "fancy", name: "Fancy" }],
        }),
        "presets/fancy/preset.json": JSON.stringify({ settings: { accent: "#ff0000" } }),
      },
    });
    // Also need templates in update for fancy
    const updateDir = path.join(HOSTED_THEMES_ROOT, themeId, "updates", "1.1.0");
    await fs.ensureDir(path.join(updateDir, "presets", "fancy", "templates"));
    await fs.writeJson(path.join(updateDir, "presets", "fancy", "templates", "index.json"), {
      id: "index",
      name: "Fancy Home",
      slug: "index",
    });
    await buildHostedLatestSnapshot(themeId);

    const result = await resolvePresetPaths(themeId, "fancy", TEST_USER_ID, { hostedMode: true });
    const latestDir = path.join(HOSTED_THEMES_ROOT, themeId, "latest");
    assert.equal(result.templatesDir, path.join(latestDir, "presets", "fancy", "templates"));
    assert.deepEqual(result.settingsOverrides, { accent: "#ff0000" });

    await fs.remove(path.join(HOSTED_THEMES_ROOT, themeId));
  });
});

// ============================================================================
// deepLinkCreateProject — hosted mode with HOSTED_THEMES_ROOT
// ============================================================================

describe("deepLinkCreateProject — hosted theme resolution", () => {
  const DEEP_LINK_THEME = "hosted-deeplink-theme";

  before(async () => {
    await createHostedTheme(DEEP_LINK_THEME, {
      version: "1.0.0",
      includePresets: true,
      presets: [
        { id: "default", name: "Default" },
        {
          id: "business",
          name: "Business",
          templates: {
            "index.json": { id: "index", name: "Business Home", slug: "index", widgets: {} },
            "about.json": { id: "about", name: "About Us", slug: "about", widgets: {} },
          },
          menus: {
            "main-menu.json": {
              id: "main-menu",
              name: "Business Menu",
              items: [
                { id: "item_1", label: "Home", link: "index.html" },
                { id: "item_2", label: "About", link: "about.html" },
              ],
            },
          },
          settings: { standard_bg_primary: "#ffffff" },
        },
      ],
    });
  });

  beforeEach(async () => {
    closeDb();
    await fs.remove(TEST_DATA_DIR);
    await fs.ensureDir(TEST_DATA_DIR);
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, DEEP_LINK_THEME));
  });

  it("creates project from HOSTED_THEMES_ROOT, not per-user library", async () => {
    const res = await callController(deepLinkCreateProject, {
      body: {
        name: "Hosted Theme Project",
        theme: DEEP_LINK_THEME,
        preset: "default",
        source: "theme",
      },
    });
    assert.equal(res._status, 201, `Expected 201, got ${res._status}: ${JSON.stringify(res._json)}`);
    assert.equal(res._json.theme, DEEP_LINK_THEME);
    assert.equal(res._json.source, "theme");

    // Verify: project directory should have theme files
    const folderName = res._json.folderName;
    const projectDir = getProjectDir(folderName, TEST_USER_ID);
    assert.ok(await fs.pathExists(path.join(projectDir, "layout.liquid")));
    assert.ok(await fs.pathExists(path.join(projectDir, "widgets", "hero")));

    // Verify: NO per-user themes directory should exist
    const userThemesDir = getUserThemesDir(TEST_USER_ID);
    assert.ok(
      !(await fs.pathExists(userThemesDir)),
      "Per-user themes directory should NOT be created in hosted mode",
    );
  });

  it("applies preset from HOSTED_THEMES_ROOT", async () => {
    const res = await callController(deepLinkCreateProject, {
      body: {
        name: "Hosted Preset Project",
        theme: DEEP_LINK_THEME,
        preset: "business",
        source: "theme",
      },
    });
    assert.equal(res._status, 201);

    const folderName = res._json.folderName;
    const projectDir = getProjectDir(folderName, TEST_USER_ID);

    // Verify preset templates were applied as pages
    const pagesDir = path.join(projectDir, "pages");
    assert.ok(await fs.pathExists(pagesDir));

    const pageFiles = await fs.readdir(pagesDir);
    // Should have at least index.json from the business preset
    const pageNames = pageFiles.filter((f) => f.endsWith(".json") && !f.startsWith("."));
    assert.ok(pageNames.length > 0, "Should have pages created from preset templates");

    // Verify preset menus were applied
    const menusDir = path.join(projectDir, "menus");
    assert.ok(await fs.pathExists(menusDir));
  });

  it("skips ensureThemesDirectory in hosted mode", async () => {
    const res = await callController(deepLinkCreateProject, {
      body: {
        name: "Hosted No Seed",
        theme: DEEP_LINK_THEME,
        source: "theme",
      },
    });
    assert.equal(res._status, 201);

    // ensureThemesDirectory would create getUserThemesDir and copy seed themes
    // In hosted mode, that should NOT happen
    const userThemesDir = getUserThemesDir(TEST_USER_ID);
    assert.ok(
      !(await fs.pathExists(userThemesDir)),
      "ensureThemesDirectory should be skipped in hosted mode",
    );
  });
});

// ============================================================================
// checkForUpdates — hosted mode
// ============================================================================

describe("checkForUpdates — hosted mode", () => {
  const UPDATE_THEME = "hosted-update-theme";
  const PROJECT_ID = "hosted-update-project-uuid";
  const PROJECT_FOLDER = "hosted-update-project";

  beforeEach(async () => {
    closeDb();
    await fs.remove(TEST_DATA_DIR);
    await fs.remove(path.join(HOSTED_THEMES_ROOT, UPDATE_THEME));
    await fs.ensureDir(TEST_DATA_DIR);
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, UPDATE_THEME));
  });

  it("detects update from HOSTED_THEMES_ROOT", async () => {
    // Create hosted theme at v1.0.0 then add update to v1.1.0
    await createHostedTheme(UPDATE_THEME, { version: "1.0.0" });
    await addHostedThemeUpdate(UPDATE_THEME, "1.1.0", {
      files: { "layout.liquid": "<html>v1.1</html>" },
    });
    await buildHostedLatestSnapshot(UPDATE_THEME);

    // Project still at v1.0.0
    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, UPDATE_THEME, "1.0.0");

    const result = await checkForUpdates(PROJECT_ID, TEST_USER_ID, { hostedMode: true });
    assert.equal(result.hasUpdate, true);
    assert.equal(result.currentVersion, "1.0.0");
    assert.equal(result.latestVersion, "1.1.0");
  });

  it("returns false when project matches hosted theme version", async () => {
    await createHostedTheme(UPDATE_THEME, { version: "1.0.0" });
    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, UPDATE_THEME, "1.0.0");

    const result = await checkForUpdates(PROJECT_ID, TEST_USER_ID, { hostedMode: true });
    assert.equal(result.hasUpdate, false);
    assert.equal(result.currentVersion, "1.0.0");
    assert.equal(result.latestVersion, "1.0.0");
  });

  it("does not check per-user library for updates", async () => {
    // Hosted theme at v1.0.0 (no updates)
    await createHostedTheme(UPDATE_THEME, { version: "1.0.0" });

    // Put a "newer" version in user's library — should be ignored
    const userThemeDir = getThemeDir(UPDATE_THEME, TEST_USER_ID);
    await fs.ensureDir(userThemeDir);
    await fs.writeJson(path.join(userThemeDir, "theme.json"), {
      name: UPDATE_THEME,
      version: "5.0.0",
    });

    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, UPDATE_THEME, "1.0.0");

    const result = await checkForUpdates(PROJECT_ID, TEST_USER_ID, { hostedMode: true });
    // Should NOT see 5.0.0 from user library
    assert.equal(result.hasUpdate, false, "Should not detect update from per-user library");
    assert.equal(result.latestVersion, "1.0.0");

    await fs.remove(userThemeDir);
  });
});

// ============================================================================
// applyThemeUpdate — hosted mode
// ============================================================================

describe("applyThemeUpdate — hosted mode", () => {
  const APPLY_THEME = "hosted-apply-theme";
  const PROJECT_ID = "hosted-apply-project-uuid";
  const PROJECT_FOLDER = "hosted-apply-project";

  beforeEach(async () => {
    closeDb();
    await fs.remove(TEST_DATA_DIR);
    await fs.remove(path.join(HOSTED_THEMES_ROOT, APPLY_THEME));
    await fs.ensureDir(TEST_DATA_DIR);
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, APPLY_THEME));
  });

  it("applies update from HOSTED_THEMES_ROOT to project", async () => {
    await createHostedTheme(APPLY_THEME, { version: "1.0.0" });
    await addHostedThemeUpdate(APPLY_THEME, "1.1.0", {
      files: {
        "layout.liquid": "<html>UPDATED HOSTED v1.1</html>",
        "assets/new-feature.css": ".new { display: block; }",
        "widgets/hero/widget.liquid": "<div class='hero'>HOSTED v1.1</div>",
      },
    });
    await buildHostedLatestSnapshot(APPLY_THEME);

    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, APPLY_THEME, "1.0.0");

    const result = await applyThemeUpdate(PROJECT_ID, TEST_USER_ID, { hostedMode: true });
    assert.ok(result.success);
    assert.equal(result.previousVersion, "1.0.0");
    assert.equal(result.newVersion, "1.1.0");

    // Verify updated files in project
    const projectDir = getProjectDir(PROJECT_FOLDER, TEST_USER_ID);
    const layout = await fs.readFile(path.join(projectDir, "layout.liquid"), "utf8");
    assert.ok(layout.includes("UPDATED HOSTED v1.1"), "Layout should be updated from hosted source");

    const heroWidget = await fs.readFile(path.join(projectDir, "widgets", "hero", "widget.liquid"), "utf8");
    assert.ok(heroWidget.includes("HOSTED v1.1"), "Hero widget should be updated from hosted source");

    const newCss = await fs.readFile(path.join(projectDir, "assets", "new-feature.css"), "utf8");
    assert.ok(newCss.includes(".new"), "New asset file should be added from hosted source");
  });

  it("merges theme.json settings preserving user values", async () => {
    await createHostedTheme(APPLY_THEME, { version: "1.0.0" });
    await addHostedThemeUpdate(APPLY_THEME, "1.1.0", {
      settings: {
        colors: [
          { id: "primary_color", label: "Primary", type: "color", value: "#0000ff", default: "#0000ff" },
          { id: "accent_color", label: "Accent", type: "color", value: "#00ff00", default: "#00ff00" },
        ],
      },
    });
    await buildHostedLatestSnapshot(APPLY_THEME);

    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, APPLY_THEME, "1.0.0");

    await applyThemeUpdate(PROJECT_ID, TEST_USER_ID, { hostedMode: true });

    const projectTheme = await fs.readJson(getProjectThemeJsonPath(PROJECT_FOLDER, TEST_USER_ID));
    assert.equal(projectTheme.version, "1.1.0");

    // User's primary_color (#ff0000) should be preserved
    const primary = projectTheme.settings.colors.find((s) => s.id === "primary_color");
    assert.equal(primary.value, "#ff0000", "User's customized primary color should be preserved");

    // New accent_color should use the new default
    const accent = projectTheme.settings.colors.find((s) => s.id === "accent_color");
    assert.ok(accent, "New accent_color setting should be added");
    assert.equal(accent.value, "#00ff00");
  });

  it("returns no-op when already up-to-date", async () => {
    await createHostedTheme(APPLY_THEME, { version: "1.0.0" });
    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, APPLY_THEME, "1.0.0");

    const result = await applyThemeUpdate(PROJECT_ID, TEST_USER_ID, { hostedMode: true });
    assert.equal(result.success, false);
    assert.ok(result.message.includes("No update"));
  });

  it("updates project metadata", async () => {
    await createHostedTheme(APPLY_THEME, { version: "1.0.0" });
    await addHostedThemeUpdate(APPLY_THEME, "1.1.0", {
      files: { "layout.liquid": "updated" },
    });
    await buildHostedLatestSnapshot(APPLY_THEME);

    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, APPLY_THEME, "1.0.0");

    await applyThemeUpdate(PROJECT_ID, TEST_USER_ID, { hostedMode: true });

    const projectsData = await projectRepo.readProjectsData(TEST_USER_ID);
    const project = projectsData.projects.find((p) => p.id === PROJECT_ID);
    assert.equal(project.themeVersion, "1.1.0");
    assert.ok(project.lastThemeUpdateAt, "Should record update timestamp");
  });
});

// ============================================================================
// Route handlers — hosted mode threading
// ============================================================================

describe("route handlers thread hostedMode", () => {
  const ROUTE_THEME = "hosted-route-theme";
  const PROJECT_ID = "hosted-route-project-uuid";
  const PROJECT_FOLDER = "hosted-route-project";

  before(async () => {
    await createHostedTheme(ROUTE_THEME, { version: "1.0.0" });
    await addHostedThemeUpdate(ROUTE_THEME, "1.1.0", {
      files: { "layout.liquid": "<html>v1.1 route test</html>" },
    });
    await buildHostedLatestSnapshot(ROUTE_THEME);
    await createHostedProject(PROJECT_ID, PROJECT_FOLDER, ROUTE_THEME, "1.0.0");
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, ROUTE_THEME));
  });

  it("getThemeUpdateStatus detects update from HOSTED_THEMES_ROOT", async () => {
    const res = await callController(getThemeUpdateStatus, {
      params: { id: PROJECT_ID },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.hasUpdate, true);
    assert.equal(res._json.latestVersion, "1.1.0");
  });

  it("applyProjectThemeUpdate applies from HOSTED_THEMES_ROOT", async () => {
    const res = await callController(applyProjectThemeUpdate, {
      params: { id: PROJECT_ID },
    });
    assert.equal(res._status, 200);
    assert.ok(res._json.success);
    assert.equal(res._json.newVersion, "1.1.0");

    // Verify file was actually updated from hosted source
    const projectDir = getProjectDir(PROJECT_FOLDER, TEST_USER_ID);
    const layout = await fs.readFile(path.join(projectDir, "layout.liquid"), "utf8");
    assert.ok(layout.includes("v1.1 route test"), "Layout should come from hosted theme update");
  });
});

// ============================================================================
// getAllProjects — hostedMode threading for theme metadata
// ============================================================================

describe("getAllProjects — hosted theme metadata", () => {
  const META_THEME = "hosted-meta-theme";

  before(async () => {
    await createHostedTheme(META_THEME, { version: "1.0.0" });
    await createHostedProject("hosted-meta-project-uuid", "hosted-meta-project", META_THEME, "1.0.0");
  });

  after(async () => {
    await fs.remove(path.join(HOSTED_THEMES_ROOT, META_THEME));
  });

  it("enriches project metadata using HOSTED_THEMES_ROOT", async () => {
    const res = await callController(getAllProjects);
    assert.equal(res._status, 200);
    assert.ok(Array.isArray(res._json));

    const project = res._json.find((p) => p.id === "hosted-meta-project-uuid");
    assert.ok(project, "Should find the hosted project");
    // The project should have the theme version from HOSTED_THEMES_ROOT
    assert.equal(project.theme, META_THEME);
  });
});
