/**
 * Theme Update System Tests
 *
 * Tests the complete theme update pipeline including:
 * - Version detection and ordering
 * - File additions and updates across versions
 * - File and folder deletions
 * - Settings layering (later versions overwrite earlier)
 * - Preservation of untouched base files
 * - Error handling (missing theme.json, version mismatches)
 *
 * Run with: node --test server/tests/themeUpdates.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// Isolated test environment
const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-updates-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Import the functions we're testing (after env setup)
const { buildLatestSnapshot, getThemeVersions, themeHasPendingUpdates } = await import(
  "../controllers/themeController.js"
);
const { getThemeDir } = await import("../config.js");

// ============================================================================
// Test constants
// ============================================================================

const TEST_THEME_ID = "__test_theme_updates__";
const testThemeDir = getThemeDir(TEST_THEME_ID);

// ============================================================================
// Cleanup
// ============================================================================

after(async () => {
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Test Fixture Setup
// ============================================================================

/**
 * Create the base theme (v1.0.0) with initial structure
 */
async function createBaseTheme() {
  await fs.writeJson(
    path.join(testThemeDir, "theme.json"),
    {
      name: "Test Theme",
      version: "1.0.0",
      author: "Test Author",
      description: "A test theme for automated testing",
      settings: {
        global: {
          colors: [
            { id: "primary", label: "Primary Color", default: "#000000" },
            { id: "secondary", label: "Secondary Color", default: "#ffffff" },
          ],
          layout: [{ id: "max_width", label: "Max Width", default: "1200px" }],
        },
      },
    },
    { spaces: 2 },
  );

  await fs.writeFile(
    path.join(testThemeDir, "layout.liquid"),
    "<!-- Base layout v1.0.0 -->\n<html><body>{{ content }}</body></html>",
  );
  await fs.writeFile(path.join(testThemeDir, "screenshot.png"), "PNG_PLACEHOLDER_V1");

  // assets/
  await fs.ensureDir(path.join(testThemeDir, "assets"));
  await fs.writeFile(path.join(testThemeDir, "assets", "base.css"), "/* Base CSS v1.0.0 */\nbody { margin: 0; }");
  await fs.writeFile(path.join(testThemeDir, "assets", "utils.js"), "// Utils v1.0.0\nfunction utils() {}");
  await fs.writeFile(path.join(testThemeDir, "assets", "deprecated.css"), "/* This will be deleted in v1.2.0 */");

  // widgets/
  await fs.ensureDir(path.join(testThemeDir, "widgets", "hero"));
  await fs.writeJson(path.join(testThemeDir, "widgets", "hero", "schema.json"), { name: "Hero", version: "1.0.0" });
  await fs.writeFile(path.join(testThemeDir, "widgets", "hero", "widget.liquid"), "<!-- Hero widget v1.0.0 -->");

  await fs.ensureDir(path.join(testThemeDir, "widgets", "deprecated-widget"));
  await fs.writeJson(path.join(testThemeDir, "widgets", "deprecated-widget", "schema.json"), {
    name: "Deprecated",
    version: "1.0.0",
  });
  await fs.writeFile(
    path.join(testThemeDir, "widgets", "deprecated-widget", "widget.liquid"),
    "<!-- Will be deleted -->",
  );

  await fs.ensureDir(path.join(testThemeDir, "widgets", "accordion"));
  await fs.writeJson(path.join(testThemeDir, "widgets", "accordion", "schema.json"), {
    name: "Accordion",
    version: "1.0.0",
  });
  await fs.writeFile(path.join(testThemeDir, "widgets", "accordion", "widget.liquid"), "<!-- Accordion v1.0.0 -->");

  // snippets/
  await fs.ensureDir(path.join(testThemeDir, "snippets"));
  await fs.writeFile(path.join(testThemeDir, "snippets", "header.liquid"), "<!-- Header snippet v1.0.0 -->");

  // templates/
  await fs.ensureDir(path.join(testThemeDir, "templates"));
  await fs.writeJson(path.join(testThemeDir, "templates", "home.json"), { title: "Home", slug: "home" });
  await fs.writeJson(path.join(testThemeDir, "templates", "about.json"), { title: "About", slug: "about" });

  // menus/
  await fs.ensureDir(path.join(testThemeDir, "menus"));
  await fs.writeJson(path.join(testThemeDir, "menus", "main.json"), { id: "main", items: [] });
}

/**
 * Create version 1.1.0 update (file additions and updates)
 */
async function createUpdate110() {
  const updateDir = path.join(testThemeDir, "updates", "1.1.0");
  await fs.ensureDir(updateDir);

  await fs.writeJson(
    path.join(updateDir, "theme.json"),
    {
      name: "Test Theme",
      version: "1.1.0",
      author: "Test Author",
      description: "A test theme for automated testing",
      settings: {
        global: {
          colors: [
            { id: "primary", label: "Primary Color", default: "#0000ff" },
            { id: "secondary", label: "Secondary Color", default: "#ffffff" },
            { id: "accent", label: "Accent Color", default: "#ff0000" },
          ],
          layout: [{ id: "max_width", label: "Max Width", default: "1400px" }],
        },
      },
    },
    { spaces: 2 },
  );

  await fs.writeFile(
    path.join(updateDir, "layout.liquid"),
    "<!-- Updated layout v1.1.0 -->\n<html><head><meta charset='utf-8'></head><body>{{ content }}</body></html>",
  );

  await fs.ensureDir(path.join(updateDir, "assets"));
  await fs.writeFile(path.join(updateDir, "assets", "new-feature.js"), "// New feature added in v1.1.0");
  await fs.writeFile(
    path.join(updateDir, "assets", "base.css"),
    "/* Base CSS v1.1.0 - Updated */\nbody { margin: 0; padding: 0; }",
  );

  await fs.ensureDir(path.join(updateDir, "widgets", "testimonials"));
  await fs.writeJson(path.join(updateDir, "widgets", "testimonials", "schema.json"), {
    name: "Testimonials",
    version: "1.1.0",
  });
  await fs.writeFile(
    path.join(updateDir, "widgets", "testimonials", "widget.liquid"),
    "<!-- Testimonials widget v1.1.0 -->",
  );

  await fs.ensureDir(path.join(updateDir, "widgets", "hero"));
  await fs.writeFile(
    path.join(updateDir, "widgets", "hero", "widget.liquid"),
    "<!-- Hero widget v1.1.0 - Enhanced -->",
  );

  await fs.ensureDir(path.join(updateDir, "snippets"));
  await fs.writeFile(path.join(updateDir, "snippets", "footer.liquid"), "<!-- Footer snippet v1.1.0 -->");

  await fs.ensureDir(path.join(updateDir, "templates"));
  await fs.writeJson(path.join(updateDir, "templates", "contact.json"), { title: "Contact", slug: "contact" });

  await fs.ensureDir(path.join(updateDir, "menus"));
  await fs.writeJson(path.join(updateDir, "menus", "footer.json"), { id: "footer", items: [] });
}

/**
 * Create version 1.2.0 update (deletions + more updates)
 */
async function createUpdate120() {
  const updateDir = path.join(testThemeDir, "updates", "1.2.0");
  await fs.ensureDir(updateDir);

  await fs.writeJson(
    path.join(updateDir, "theme.json"),
    {
      name: "Test Theme",
      version: "1.2.0",
      author: "Test Author",
      description: "A test theme for automated testing",
      settings: {
        global: {
          colors: [
            { id: "primary", label: "Primary Color", default: "#0000ff" },
            { id: "secondary", label: "Secondary Color", default: "#ffffff" },
            { id: "accent", label: "Accent Color", default: "#ff0000" },
            { id: "background", label: "Background Color", default: "#f5f5f5" },
          ],
          layout: [
            { id: "max_width", label: "Max Width", default: "1400px" },
            { id: "container_padding", label: "Container Padding", default: "20px" },
          ],
        },
      },
    },
    { spaces: 2 },
  );

  // Deleted: assets/deprecated.css (single file)
  await fs.ensureDir(path.join(updateDir, "deleted", "assets"));
  await fs.writeFile(path.join(updateDir, "deleted", "assets", "deprecated.css"), "");

  // Deleted: widgets/deprecated-widget/ (entire folder - empty dir)
  await fs.ensureDir(path.join(updateDir, "deleted", "widgets", "deprecated-widget"));

  // Updated accordion widget
  await fs.ensureDir(path.join(updateDir, "widgets", "accordion"));
  await fs.writeFile(
    path.join(updateDir, "widgets", "accordion", "widget.liquid"),
    "<!-- Accordion widget v1.2.0 - Rewritten -->",
  );
  await fs.writeJson(path.join(updateDir, "widgets", "accordion", "schema.json"), {
    name: "Accordion",
    version: "1.2.0",
    enhanced: true,
  });
}

async function setup() {
  await fs.remove(testThemeDir);
  await fs.ensureDir(testThemeDir);
  await createBaseTheme();
  await createUpdate110();
  await createUpdate120();
}

// ============================================================================
// Assertion Helpers (operate on the latest/ directory)
// ============================================================================

async function fileExists(relativePath) {
  return fs.pathExists(path.join(testThemeDir, "latest", relativePath));
}

async function readFileContent(relativePath) {
  return fs.readFile(path.join(testThemeDir, "latest", relativePath), "utf8");
}

async function readJsonFile(relativePath) {
  return fs.readJson(path.join(testThemeDir, "latest", relativePath));
}

// ============================================================================
// Build the snapshot once before all tests
// ============================================================================

before(async () => {
  await setup();
  await buildLatestSnapshot(TEST_THEME_ID);
});

// -----------------------------------------------------------------------
// Version detection
// -----------------------------------------------------------------------

describe("Version detection", () => {
  it("detects all versions (base + updates)", async () => {
    const versions = await getThemeVersions(TEST_THEME_ID);
    assert.deepEqual(versions, ["1.0.0", "1.1.0", "1.2.0"]);
  });

  it("returns versions in ascending semver order", async () => {
    const versions = await getThemeVersions(TEST_THEME_ID);
    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1].split(".").map(Number);
      const curr = versions[i].split(".").map(Number);
      const isAscending =
        prev[0] < curr[0] ||
        (prev[0] === curr[0] && prev[1] < curr[1]) ||
        (prev[0] === curr[0] && prev[1] === curr[1] && prev[2] < curr[2]);
      assert.ok(isAscending, `${versions[i - 1]} should come before ${versions[i]}`);
    }
  });
});

// -----------------------------------------------------------------------
// Snapshot structure
// -----------------------------------------------------------------------

describe("Snapshot structure", () => {
  it("creates latest/ directory", async () => {
    const exists = await fs.pathExists(path.join(testThemeDir, "latest"));
    assert.ok(exists, "latest/ directory should exist");
  });

  it("latest/ contains theme.json", async () => {
    assert.ok(await fileExists("theme.json"));
  });

  it("theme.json has the latest version (1.2.0)", async () => {
    const theme = await readJsonFile("theme.json");
    assert.equal(theme.version, "1.2.0");
  });

  it("latest/ does NOT contain an updates/ folder", async () => {
    const exists = await fileExists("updates");
    assert.ok(!exists, "updates/ should not be copied into latest/");
  });
});

// -----------------------------------------------------------------------
// File updates (v1.1.0 additions/overwrites)
// -----------------------------------------------------------------------

describe("File updates from v1.1.0", () => {
  it("layout.liquid updated to v1.1.0 content", async () => {
    const content = await readFileContent("layout.liquid");
    assert.match(content, /v1\.1\.0/);
  });

  it("assets/base.css updated to v1.1.0 content", async () => {
    const content = await readFileContent("assets/base.css");
    assert.match(content, /v1\.1\.0/);
  });

  it("assets/new-feature.js added in v1.1.0", async () => {
    assert.ok(await fileExists("assets/new-feature.js"));
    const content = await readFileContent("assets/new-feature.js");
    assert.match(content, /v1\.1\.0/);
  });

  it("snippets/footer.liquid added in v1.1.0", async () => {
    assert.ok(await fileExists("snippets/footer.liquid"));
  });

  it("widgets/hero/widget.liquid updated to v1.1.0", async () => {
    const content = await readFileContent("widgets/hero/widget.liquid");
    assert.match(content, /v1\.1\.0/);
  });

  it("widgets/testimonials/ added in v1.1.0", async () => {
    assert.ok(await fileExists("widgets/testimonials/schema.json"));
    assert.ok(await fileExists("widgets/testimonials/widget.liquid"));
  });

  it("templates/contact.json added in v1.1.0", async () => {
    assert.ok(await fileExists("templates/contact.json"));
  });

  it("menus/footer.json added in v1.1.0", async () => {
    assert.ok(await fileExists("menus/footer.json"));
  });
});

// -----------------------------------------------------------------------
// File updates (v1.2.0 overwrites)
// -----------------------------------------------------------------------

describe("File updates from v1.2.0", () => {
  it("widgets/accordion/ updated to v1.2.0", async () => {
    const content = await readFileContent("widgets/accordion/widget.liquid");
    assert.match(content, /v1\.2\.0/);
  });

  it("accordion schema.json has enhanced property from v1.2.0", async () => {
    const schema = await readJsonFile("widgets/accordion/schema.json");
    assert.equal(schema.enhanced, true);
    assert.equal(schema.version, "1.2.0");
  });
});

// -----------------------------------------------------------------------
// Base files preserved (untouched by updates)
// -----------------------------------------------------------------------

describe("Base files preserved", () => {
  it("assets/utils.js preserved from base (still has v1.0.0 content)", async () => {
    const content = await readFileContent("assets/utils.js");
    assert.match(content, /v1\.0\.0/);
  });

  it("snippets/header.liquid preserved from base", async () => {
    const content = await readFileContent("snippets/header.liquid");
    assert.match(content, /v1\.0\.0/);
  });

  it("templates/home.json preserved from base", async () => {
    assert.ok(await fileExists("templates/home.json"));
  });

  it("templates/about.json preserved from base", async () => {
    assert.ok(await fileExists("templates/about.json"));
  });

  it("menus/main.json preserved from base", async () => {
    assert.ok(await fileExists("menus/main.json"));
  });

  it("screenshot.png preserved from base", async () => {
    assert.ok(await fileExists("screenshot.png"));
  });
});

// -----------------------------------------------------------------------
// Settings accumulation across versions
// -----------------------------------------------------------------------

describe("Settings accumulation", () => {
  it("has accent color added in v1.1.0", async () => {
    const theme = await readJsonFile("theme.json");
    const colors = theme.settings.global.colors;
    assert.ok(
      colors.some((c) => c.id === "accent"),
      "accent color should exist",
    );
  });

  it("has background color added in v1.2.0", async () => {
    const theme = await readJsonFile("theme.json");
    const colors = theme.settings.global.colors;
    assert.ok(
      colors.some((c) => c.id === "background"),
      "background color should exist",
    );
  });

  it("has container_padding added in v1.2.0", async () => {
    const theme = await readJsonFile("theme.json");
    const layout = theme.settings.global.layout;
    assert.ok(
      layout.some((l) => l.id === "container_padding"),
      "container_padding should exist",
    );
  });

  it("primary color default was updated to #0000ff by v1.1.0", async () => {
    const theme = await readJsonFile("theme.json");
    const primary = theme.settings.global.colors.find((c) => c.id === "primary");
    assert.equal(primary.default, "#0000ff", "primary should have v1.1.0 default, not base #000000");
  });

  it("max_width default was updated to 1400px by v1.1.0", async () => {
    const theme = await readJsonFile("theme.json");
    const maxWidth = theme.settings.global.layout.find((l) => l.id === "max_width");
    assert.equal(maxWidth.default, "1400px", "max_width should have v1.1.0 default, not base 1200px");
  });
});

// -----------------------------------------------------------------------
// Deletions (v1.2.0)
// -----------------------------------------------------------------------

describe("Deletions from v1.2.0", () => {
  it("assets/deprecated.css was deleted", async () => {
    const exists = await fileExists("assets/deprecated.css");
    assert.ok(!exists, "deprecated.css should be deleted");
  });

  it("widgets/deprecated-widget/ folder was deleted entirely", async () => {
    const exists = await fileExists("widgets/deprecated-widget");
    assert.ok(!exists, "deprecated-widget/ folder should be deleted");
  });

  it("assets/ folder still exists after file deletion", async () => {
    assert.ok(await fileExists("assets"), "assets/ parent folder must survive");
  });

  it("widgets/ folder still exists after widget deletion", async () => {
    assert.ok(await fileExists("widgets"), "widgets/ parent folder must survive");
  });
});

// -----------------------------------------------------------------------
// Error handling (separate setup per test)
// -----------------------------------------------------------------------

describe("Error handling", () => {
  it("throws when update folder is missing theme.json", async () => {
    const errorThemeId = "__test_theme_error_missing__";
    const errorThemeDir = getThemeDir(errorThemeId);

    try {
      // Create a base theme
      await fs.ensureDir(errorThemeDir);
      await fs.writeJson(path.join(errorThemeDir, "theme.json"), { name: "Error Theme", version: "1.0.0" });

      // Create an update folder WITHOUT theme.json
      await fs.ensureDir(path.join(errorThemeDir, "updates", "1.1.0"));
      await fs.writeFile(path.join(errorThemeDir, "updates", "1.1.0", "layout.liquid"), "test");

      await assert.rejects(
        () => buildLatestSnapshot(errorThemeId),
        (err) => {
          assert.match(err.message, /missing theme\.json/);
          return true;
        },
      );
    } finally {
      await fs.remove(errorThemeDir);
    }
  });

  it("throws when theme.json version doesn't match folder name", async () => {
    const errorThemeId = "__test_theme_error_mismatch__";
    const errorThemeDir = getThemeDir(errorThemeId);

    try {
      await fs.ensureDir(errorThemeDir);
      await fs.writeJson(path.join(errorThemeDir, "theme.json"), { name: "Error Theme", version: "1.0.0" });

      // Create update folder "1.1.0" but theme.json says "2.0.0"
      await fs.ensureDir(path.join(errorThemeDir, "updates", "1.1.0"));
      await fs.writeJson(path.join(errorThemeDir, "updates", "1.1.0", "theme.json"), {
        name: "Error Theme",
        version: "2.0.0",
      });

      await assert.rejects(
        () => buildLatestSnapshot(errorThemeId),
        (err) => {
          assert.match(err.message, /version mismatch/);
          return true;
        },
      );
    } finally {
      await fs.remove(errorThemeDir);
    }
  });

  it("does not create latest/ when no updates exist", async () => {
    const baseOnlyId = "__test_theme_base_only__";
    const baseOnlyDir = getThemeDir(baseOnlyId);

    try {
      await fs.ensureDir(baseOnlyDir);
      await fs.writeJson(path.join(baseOnlyDir, "theme.json"), { name: "Base Only", version: "1.0.0" });

      await buildLatestSnapshot(baseOnlyId);

      const latestExists = await fs.pathExists(path.join(baseOnlyDir, "latest"));
      assert.ok(!latestExists, "latest/ should not be created when there are no updates");
    } finally {
      await fs.remove(baseOnlyDir);
    }
  });
});

// -----------------------------------------------------------------------
// Versions at or below the base are history, not pending work
// -----------------------------------------------------------------------

// A theme keeps every version folder it has ever shipped. Once its base is
// bumped, the folders up to that version describe changes the base already
// contains, so layering them would copy older files back over the base, let an
// old theme.json decide what version latest/ claims, and re-run deleted/
// removals against content the base has since restored.
describe("Stale version folders (at or below the base)", () => {
  const staleThemeId = "__test_theme_stale_versions__";
  const staleThemeDir = getThemeDir(staleThemeId);
  const latest = (...p) => path.join(staleThemeDir, "latest", ...p);

  async function writeVersion(dir, version, files) {
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, "theme.json"), { name: "Stale Theme", version });
    for (const [rel, content] of Object.entries(files)) {
      await fs.outputFile(path.join(dir, rel), content);
    }
  }

  // Base 1.2.0 ships the current files. 1.0.0 and 1.1.0 are shipped history;
  // 1.3.0 is a genuine pending update.
  async function seed({ withNewer }) {
    await fs.remove(staleThemeDir);
    await writeVersion(staleThemeDir, "1.2.0", {
      "layout.liquid": "base 1.2.0",
      "assets/keep.css": "base keep",
      "widgets/restored/widget.liquid": "restored by base",
    });
    await writeVersion(path.join(staleThemeDir, "updates", "1.0.0"), "1.0.0", { "layout.liquid": "old 1.0.0" });
    await writeVersion(path.join(staleThemeDir, "updates", "1.1.0"), "1.1.0", {
      "layout.liquid": "old 1.1.0",
      "assets/keep.css": "old keep",
      // 1.1.0 deleted the widget the base now ships again. A placeholder inside
      // deleted/ must name the real path it removes.
      "deleted/widgets/restored/widget.liquid": "",
    });
    await writeVersion(path.join(staleThemeDir, "updates", "1.2.0"), "1.2.0", { "layout.liquid": "equal-to-base" });
    if (withNewer) {
      await writeVersion(path.join(staleThemeDir, "updates", "1.3.0"), "1.3.0", { "layout.liquid": "new 1.3.0" });
    }
  }

  after(async () => {
    await fs.remove(staleThemeDir);
  });

  it("builds no latest/ when every folder is at or below the base", async () => {
    await seed({ withNewer: false });
    await buildLatestSnapshot(staleThemeId);
    // Without latest/, readers fall back to the base — which is already correct.
    assert.equal(await fs.pathExists(path.join(staleThemeDir, "latest")), false);
  });

  it("layers only the newer version, leaving base files from older folders alone", async () => {
    await seed({ withNewer: true });
    await buildLatestSnapshot(staleThemeId);

    assert.equal(await fs.readFile(latest("layout.liquid"), "utf8"), "new 1.3.0");
    assert.equal(await fs.readFile(latest("assets", "keep.css"), "utf8"), "base keep");
    assert.equal((await fs.readJson(latest("theme.json"))).version, "1.3.0");
  });

  it("does not re-run a stale folder's deletion against content the base restored", async () => {
    await seed({ withNewer: true });
    await buildLatestSnapshot(staleThemeId);

    assert.equal(await fs.pathExists(latest("widgets", "restored", "widget.liquid")), true);
  });

  it("still rejects a malformed folder that IS newer than the base", async () => {
    await seed({ withNewer: false });
    // Newer than base, but its theme.json disagrees with the folder name.
    const dir = path.join(staleThemeDir, "updates", "1.4.0");
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, "theme.json"), { name: "Stale Theme", version: "9.9.9" });

    await assert.rejects(
      () => buildLatestSnapshot(staleThemeId),
      (err) => {
        assert.match(err.message, /version mismatch/);
        return true;
      },
    );
  });
});

// -----------------------------------------------------------------------
// The upgrade path: an installed base that is older than the shipped one
// -----------------------------------------------------------------------

// data/themes/<id> is provisioned once and never refreshed, so a user who
// upgrades the app keeps the base they first installed. The release's update
// folder is what carries the new files to them: it is newer than THEIR base, so
// it layers — while for a fresh install, whose base already equals it, the same
// folder is correctly ignored. Both halves are exercised here.
describe("Upgrade path (installed base older than the shipped version)", () => {
  const upgradeThemeId = "__test_theme_upgrade_path__";
  const upgradeThemeDir = getThemeDir(upgradeThemeId);
  const latest = (...p) => path.join(upgradeThemeDir, "latest", ...p);

  async function writeVersion(dir, version, files) {
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, "theme.json"), { name: "Upgrade Theme", version });
    for (const [rel, content] of Object.entries(files)) {
      await fs.outputFile(path.join(dir, rel), content);
    }
  }

  // installedBase is what the user's data dir holds; both release folders are
  // present either way, exactly as they ship.
  async function seed(installedBase) {
    await fs.remove(upgradeThemeDir);
    await writeVersion(upgradeThemeDir, installedBase, {
      "widgets/card/widget.liquid": `base ${installedBase}`,
    });
    await writeVersion(path.join(upgradeThemeDir, "updates", "1.0.0"), "1.0.0", {
      "widgets/card/widget.liquid": "v1.0.0 card",
    });
    await writeVersion(path.join(upgradeThemeDir, "updates", "1.1.0"), "1.1.0", {
      "widgets/card/widget.liquid": "v1.1.0 card",
    });
  }

  after(async () => {
    await fs.remove(upgradeThemeDir);
  });

  it("upgrading user: the release folder layers over their older base", async () => {
    await seed("1.0.0");
    assert.equal(await themeHasPendingUpdates(upgradeThemeId), true);

    await buildLatestSnapshot(upgradeThemeId);
    assert.equal(await fs.readFile(latest("widgets", "card", "widget.liquid"), "utf8"), "v1.1.0 card");
    assert.equal((await fs.readJson(latest("theme.json"))).version, "1.1.0");
  });

  it("fresh install: the same folders are inert and the base is served as-is", async () => {
    await seed("1.1.0");
    assert.equal(await themeHasPendingUpdates(upgradeThemeId), false);

    await buildLatestSnapshot(upgradeThemeId);
    assert.equal(await fs.pathExists(path.join(upgradeThemeDir, "latest")), false);
  });
});
