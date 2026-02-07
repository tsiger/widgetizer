/**
 * Theme Update Service Test Suite
 *
 * Tests checkForUpdates, applyThemeUpdate, toggleThemeUpdates,
 * and mergeThemeSettings from themeUpdateService.js.
 *
 * Sets up a full project+theme environment with versioned updates
 * to verify the end-to-end update flow: detecting available updates,
 * applying files (layout, assets, widgets), merging theme.json,
 * adding new menus/templates without overwriting, and updating
 * project metadata.
 *
 * Run with: node --test server/tests/themeUpdateService.test.js
 */

import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-update-svc-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence console output from production code
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const {
  getProjectDir,
  getProjectThemeJsonPath,
  getThemeDir,
} = await import("../config.js");

const { writeProjectsFile, readProjectsFile } = await import("../controllers/projectController.js");
const { buildLatestSnapshot } = await import("../controllers/themeController.js");
const {
  checkForUpdates,
  applyThemeUpdate,
  mergeThemeSettings,
  toggleThemeUpdates,
} = await import("../services/themeUpdateService.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "update-svc-uuid-1234";
const PROJECT_FOLDER = "update-svc-project";
const THEME_NAME = "test-update-theme";

// ============================================================================
// Fixture helpers
// ============================================================================

/**
 * Create a theme on disk with base version and optional updates.
 */
async function createTheme(version, opts = {}) {
  const { updates = [], extraSettings = {} } = opts;
  const themeDir = getThemeDir(THEME_NAME);
  await fs.ensureDir(themeDir);

  // Base theme.json
  await fs.writeJson(path.join(themeDir, "theme.json"), {
    name: "Test Update Theme",
    version,
    author: "Test",
    settings: {
      colors: [
        { id: "primary_color", label: "Primary", type: "color", value: "#ff0000", default: "#ff0000" },
      ],
      ...extraSettings,
    },
  }, { spaces: 2 });

  // Base files
  await fs.writeFile(path.join(themeDir, "layout.liquid"), `<!DOCTYPE html><html><body>{{ main_content | raw }}</body></html>`);
  await fs.writeFile(path.join(themeDir, "screenshot.png"), "fake-screenshot");
  await fs.ensureDir(path.join(themeDir, "assets"));
  await fs.writeFile(path.join(themeDir, "assets", "base.css"), "body { margin: 0; }");
  await fs.ensureDir(path.join(themeDir, "widgets", "hero"));
  await fs.writeFile(path.join(themeDir, "widgets", "hero", "widget.liquid"), "<div class='hero'>v1</div>");
  await fs.writeJson(path.join(themeDir, "widgets", "hero", "schema.json"), { type: "hero" });
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "templates", "home.json"), { slug: "index", name: "Home" });
  await fs.ensureDir(path.join(themeDir, "menus"));
  await fs.writeJson(path.join(themeDir, "menus", "main.json"), { name: "Main", items: [] });

  // Create update versions
  for (const update of updates) {
    const updateDir = path.join(themeDir, "updates", update.version);
    await fs.ensureDir(updateDir);
    await fs.writeJson(path.join(updateDir, "theme.json"), {
      name: "Test Update Theme",
      version: update.version,
      author: "Test",
      settings: update.settings || {
        colors: [
          { id: "primary_color", label: "Primary", type: "color", value: "#0000ff", default: "#0000ff" },
          { id: "accent_color", label: "Accent", type: "color", value: "#00ff00", default: "#00ff00" },
        ],
      },
    }, { spaces: 2 });

    // Optional updated files
    if (update.files) {
      for (const [filePath, content] of Object.entries(update.files)) {
        const fullPath = path.join(updateDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        if (typeof content === "object") {
          await fs.writeJson(fullPath, content, { spaces: 2 });
        } else {
          await fs.writeFile(fullPath, content);
        }
      }
    }
  }
}

/**
 * Create a project with a given theme version.
 */
async function createProject(themeVersion) {
  await writeProjectsFile({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Update Service Test",
        theme: THEME_NAME,
        themeVersion,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(path.join(projectDir, "pages"));
  await fs.ensureDir(path.join(projectDir, "menus"));

  // Copy base theme to project (simulating initial project creation)
  const themeDir = getThemeDir(THEME_NAME);
  await fs.copy(path.join(themeDir, "layout.liquid"), path.join(projectDir, "layout.liquid"));
  await fs.copy(path.join(themeDir, "assets"), path.join(projectDir, "assets"));
  await fs.copy(path.join(themeDir, "widgets"), path.join(projectDir, "widgets"));

  // Project theme.json
  await fs.writeJson(getProjectThemeJsonPath(PROJECT_FOLDER), {
    name: "Test Update Theme",
    version: themeVersion,
    author: "Test",
    settings: {
      colors: [
        { id: "primary_color", label: "Primary", type: "color", value: "#ff0000", default: "#ff0000" },
      ],
    },
  }, { spaces: 2 });

  // Create a user menu (should NOT be overwritten by update)
  await fs.writeJson(path.join(projectDir, "menus", "main.json"), {
    name: "Main (customized)",
    items: [{ label: "My Custom Link", link: "/custom" }],
  }, { spaces: 2 });

  // Create a user page (should NOT be overwritten by templates from update)
  await fs.ensureDir(path.join(projectDir, "pages"));
  await fs.writeJson(path.join(projectDir, "pages", "index.json"), {
    slug: "index",
    name: "Home (customized)",
    widgets: {},
  }, { spaces: 2 });
}

// ============================================================================
// Global setup / teardown
// ============================================================================

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// checkForUpdates
// ============================================================================

describe("checkForUpdates", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DATA_DIR);
    await fs.remove(TEST_THEMES_DIR);
  });

  it("detects when update is available", async () => {
    // Theme at v1.0.0, has update v1.1.0, latest/ built at v1.1.0
    await createTheme("1.0.0", {
      updates: [{ version: "1.1.0", files: { "layout.liquid": "<html>v1.1</html>" } }],
    });
    // Build latest/ so getThemeSourceDir returns latest/ with v1.1.0
    await buildLatestSnapshot(THEME_NAME);

    // Project still at v1.0.0
    await createProject("1.0.0");

    const result = await checkForUpdates(PROJECT_ID);
    assert.equal(result.hasUpdate, true);
    assert.equal(result.currentVersion, "1.0.0");
    assert.equal(result.latestVersion, "1.1.0");
  });

  it("returns false when project is up-to-date", async () => {
    await createTheme("1.0.0");
    await createProject("1.0.0");

    const result = await checkForUpdates(PROJECT_ID);
    assert.equal(result.hasUpdate, false);
    assert.equal(result.currentVersion, "1.0.0");
    assert.equal(result.latestVersion, "1.0.0");
  });

  it("handles missing theme gracefully", async () => {
    // Create project referencing a theme that doesn't exist on disk
    await writeProjectsFile({
      projects: [{
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Test",
        theme: "nonexistent-theme",
        themeVersion: "1.0.0",
        created: new Date().toISOString(),
      }],
      activeProjectId: PROJECT_ID,
    });

    const result = await checkForUpdates(PROJECT_ID);
    assert.equal(result.hasUpdate, false);
    assert.equal(result.latestVersion, "unknown");
  });

  it("throws for nonexistent project", async () => {
    // Create valid projects.json but without the target project
    await writeProjectsFile({ projects: [], activeProjectId: null });

    await assert.rejects(
      () => checkForUpdates("nonexistent-uuid"),
      (err) => {
        assert.ok(err.message.includes("not found"));
        return true;
      },
    );
  });
});

// ============================================================================
// applyThemeUpdate
// ============================================================================

describe("applyThemeUpdate", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DATA_DIR);
    await fs.remove(TEST_THEMES_DIR);
  });

  it("copies updatable paths from theme to project", async () => {
    await createTheme("1.0.0", {
      updates: [{
        version: "1.1.0",
        files: {
          "layout.liquid": "<html>UPDATED v1.1</html>",
          "assets/new-feature.css": ".new { display: block; }",
          "widgets/hero/widget.liquid": "<div class='hero'>v1.1</div>",
        },
      }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    const result = await applyThemeUpdate(PROJECT_ID);
    assert.ok(result.success);
    assert.equal(result.previousVersion, "1.0.0");
    assert.equal(result.newVersion, "1.1.0");

    // Verify updated files in project
    const projectDir = getProjectDir(PROJECT_FOLDER);
    const layout = await fs.readFile(path.join(projectDir, "layout.liquid"), "utf8");
    assert.ok(layout.includes("UPDATED v1.1"), "Layout should be updated to v1.1");

    const heroWidget = await fs.readFile(path.join(projectDir, "widgets", "hero", "widget.liquid"), "utf8");
    assert.ok(heroWidget.includes("v1.1"), "Hero widget should be updated");

    const newCss = await fs.readFile(path.join(projectDir, "assets", "new-feature.css"), "utf8");
    assert.ok(newCss.includes(".new"), "New asset file should be added");
  });

  it("adds new menus without overwriting existing user menus", async () => {
    await createTheme("1.0.0", {
      updates: [{
        version: "1.1.0",
        files: {
          // The update's theme source will include a new menu
          "menus/footer.json": { name: "Footer", items: [{ label: "About", link: "/about" }] },
        },
      }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    await applyThemeUpdate(PROJECT_ID);

    const projectDir = getProjectDir(PROJECT_FOLDER);

    // User's main.json should be PRESERVED (not overwritten)
    const mainMenu = await fs.readJson(path.join(projectDir, "menus", "main.json"));
    assert.ok(mainMenu.name.includes("customized"), "User's main menu should be preserved");
    assert.ok(mainMenu.items[0].label === "My Custom Link", "User's menu items should be preserved");

    // New footer.json should be ADDED
    const footerMenu = await fs.readJson(path.join(projectDir, "menus", "footer.json"));
    assert.equal(footerMenu.name, "Footer");
  });

  it("adds new templates as pages without overwriting existing", async () => {
    await createTheme("1.0.0", {
      updates: [{
        version: "1.1.0",
        files: {
          "templates/contact.json": { slug: "contact", name: "Contact Page" },
        },
      }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    await applyThemeUpdate(PROJECT_ID);

    const projectDir = getProjectDir(PROJECT_FOLDER);

    // index.json (mapped from home template) should be PRESERVED
    const homePage = await fs.readJson(path.join(projectDir, "pages", "index.json"));
    assert.ok(homePage.name.includes("customized"), "User's home page should be preserved");

    // contact.json should be ADDED
    const contactPage = await fs.readJson(path.join(projectDir, "pages", "contact.json"));
    assert.equal(contactPage.name, "Contact Page");
  });

  it("merges theme.json settings preserving user values", async () => {
    await createTheme("1.0.0", {
      updates: [{
        version: "1.1.0",
        settings: {
          colors: [
            // primary_color exists in user's settings — user value should be preserved
            { id: "primary_color", label: "Primary", type: "color", value: "#0000ff", default: "#0000ff" },
            // accent_color is NEW — should use the new default value
            { id: "accent_color", label: "Accent", type: "color", value: "#00ff00", default: "#00ff00" },
          ],
        },
      }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    await applyThemeUpdate(PROJECT_ID);

    const projectTheme = await fs.readJson(getProjectThemeJsonPath(PROJECT_FOLDER));

    // Version should be updated
    assert.equal(projectTheme.version, "1.1.0");

    // User's primary_color value (#ff0000) should be preserved, not overwritten with #0000ff
    const primary = projectTheme.settings.colors.find((s) => s.id === "primary_color");
    assert.equal(primary.value, "#ff0000", "User's customized primary color should be preserved");

    // New accent_color should use the new default
    const accent = projectTheme.settings.colors.find((s) => s.id === "accent_color");
    assert.ok(accent, "New accent_color setting should be added");
    assert.equal(accent.value, "#00ff00");
  });

  it("updates project metadata in projects.json", async () => {
    await createTheme("1.0.0", {
      updates: [{ version: "1.1.0", files: { "layout.liquid": "updated" } }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    await applyThemeUpdate(PROJECT_ID);

    const projectsData = await readProjectsFile();
    const project = projectsData.projects.find((p) => p.id === PROJECT_ID);
    assert.equal(project.themeVersion, "1.1.0");
    assert.ok(project.lastThemeUpdateAt, "Should record update timestamp");
    assert.equal(project.lastThemeUpdateVersion, "1.1.0");
  });

  it("returns no-op when already up-to-date", async () => {
    await createTheme("1.0.0"); // No updates
    await createProject("1.0.0");

    const result = await applyThemeUpdate(PROJECT_ID);
    assert.equal(result.success, false);
    assert.ok(result.message.includes("No update"));
    assert.equal(result.previousVersion, "1.0.0");
  });

  it("handles missing updatable paths gracefully", async () => {
    // Create an update that only touches layout — no snippets dir exists
    await createTheme("1.0.0", {
      updates: [{
        version: "1.1.0",
        files: { "layout.liquid": "updated layout" },
      }],
    });
    await buildLatestSnapshot(THEME_NAME);
    await createProject("1.0.0");

    // Should not throw even though snippets/ doesn't exist in theme
    const result = await applyThemeUpdate(PROJECT_ID);
    assert.ok(result.success);
    assert.equal(result.newVersion, "1.1.0");
  });
});

// ============================================================================
// mergeThemeSettings
// ============================================================================

describe("mergeThemeSettings", () => {
  it("preserves user values for existing settings", () => {
    const userTheme = {
      name: "My Theme",
      version: "1.0.0",
      settings: {
        colors: [
          { id: "primary", value: "#custom-red" },
        ],
      },
    };
    const newTheme = {
      name: "My Theme",
      version: "1.1.0",
      settings: {
        colors: [
          { id: "primary", value: "#new-default", default: "#new-default" },
          { id: "accent", value: "#green", default: "#green" },
        ],
      },
    };

    const merged = mergeThemeSettings(userTheme, newTheme);
    assert.equal(merged.version, "1.1.0");

    const primary = merged.settings.colors.find((s) => s.id === "primary");
    assert.equal(primary.value, "#custom-red", "User value should be preserved");

    const accent = merged.settings.colors.find((s) => s.id === "accent");
    assert.equal(accent.value, "#green", "New setting should use default");
  });

  it("drops settings removed by theme author", () => {
    const userTheme = {
      version: "1.0.0",
      settings: {
        colors: [
          { id: "primary", value: "#red" },
          { id: "deprecated", value: "#old" },
        ],
      },
    };
    const newTheme = {
      version: "1.1.0",
      settings: {
        colors: [
          { id: "primary", value: "#red", default: "#red" },
          // 'deprecated' is intentionally removed
        ],
      },
    };

    const merged = mergeThemeSettings(userTheme, newTheme);
    const deprecated = merged.settings.colors.find((s) => s.id === "deprecated");
    assert.equal(deprecated, undefined, "Removed settings should not appear");
  });

  it("handles nested settings objects", () => {
    const userTheme = {
      version: "1.0.0",
      settings: {
        typography: {
          heading: [{ id: "font_family", value: "Georgia" }],
        },
      },
    };
    const newTheme = {
      version: "1.1.0",
      settings: {
        typography: {
          heading: [
            { id: "font_family", value: "Arial", default: "Arial" },
            { id: "font_size", value: "2rem", default: "2rem" },
          ],
        },
      },
    };

    const merged = mergeThemeSettings(userTheme, newTheme);
    const fontFamily = merged.settings.typography.heading.find((s) => s.id === "font_family");
    assert.equal(fontFamily.value, "Georgia", "User's font choice should be preserved");

    const fontSize = merged.settings.typography.heading.find((s) => s.id === "font_size");
    assert.equal(fontSize.value, "2rem", "New setting should use default");
  });
});

// ============================================================================
// toggleThemeUpdates
// ============================================================================

describe("toggleThemeUpdates", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DATA_DIR);
    await fs.remove(TEST_THEMES_DIR);
    await createTheme("1.0.0");
    await createProject("1.0.0");
  });

  it("enables theme update notifications", async () => {
    const result = await toggleThemeUpdates(PROJECT_ID, true);
    assert.ok(result.success);
    assert.equal(result.receiveThemeUpdates, true);

    const data = await readProjectsFile();
    const project = data.projects.find((p) => p.id === PROJECT_ID);
    assert.equal(project.receiveThemeUpdates, true);
  });

  it("disables theme update notifications", async () => {
    const result = await toggleThemeUpdates(PROJECT_ID, false);
    assert.ok(result.success);
    assert.equal(result.receiveThemeUpdates, false);

    const data = await readProjectsFile();
    const project = data.projects.find((p) => p.id === PROJECT_ID);
    assert.equal(project.receiveThemeUpdates, false);
  });

  it("throws for nonexistent project", async () => {
    await assert.rejects(
      () => toggleThemeUpdates("fake-project-uuid", true),
      (err) => {
        assert.ok(err.message.includes("not found"));
        return true;
      },
    );
  });
});
