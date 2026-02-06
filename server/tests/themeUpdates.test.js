/**
 * Theme Update System Tests
 *
 * Standalone test script (no framework required).
 * Tests the complete theme update pipeline including:
 * - File additions and updates
 * - File and folder deletions
 * - Settings merging
 * - Version layering
 *
 * Run with: node server/tests/themeUpdates.test.js
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

// Import the functions we're testing
const { buildLatestSnapshot, getThemeVersions } = await import("../controllers/themeController.js");
const { THEMES_DIR } = await import("../config.js");

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_THEME_ID = "__test_theme_updates__";
const testThemeDir = path.join(THEMES_DIR, TEST_THEME_ID);

// Colors for output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// ============================================================================
// Test Fixture Setup
// ============================================================================

/**
 * Create the base theme (v1.0.0) with initial structure
 */
async function createBaseTheme() {
  // Base theme.json
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

  // layout.liquid
  await fs.writeFile(
    path.join(testThemeDir, "layout.liquid"),
    "<!-- Base layout v1.0.0 -->\n<html><body>{{ content }}</body></html>",
  );

  // screenshot.png (just a placeholder)
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

  // Updated theme.json with new settings
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
            { id: "primary", label: "Primary Color", default: "#0000ff" }, // Changed default
            { id: "secondary", label: "Secondary Color", default: "#ffffff" },
            { id: "accent", label: "Accent Color", default: "#ff0000" }, // NEW setting
          ],
          layout: [
            { id: "max_width", label: "Max Width", default: "1400px" }, // Changed default
          ],
        },
      },
    },
    { spaces: 2 },
  );

  // Updated layout.liquid
  await fs.writeFile(
    path.join(updateDir, "layout.liquid"),
    "<!-- Updated layout v1.1.0 -->\n<html><head><meta charset='utf-8'></head><body>{{ content }}</body></html>",
  );

  // New asset file
  await fs.ensureDir(path.join(updateDir, "assets"));
  await fs.writeFile(path.join(updateDir, "assets", "new-feature.js"), "// New feature added in v1.1.0");

  // Updated existing asset
  await fs.writeFile(
    path.join(updateDir, "assets", "base.css"),
    "/* Base CSS v1.1.0 - Updated */\nbody { margin: 0; padding: 0; }",
  );

  // New widget
  await fs.ensureDir(path.join(updateDir, "widgets", "testimonials"));
  await fs.writeJson(path.join(updateDir, "widgets", "testimonials", "schema.json"), {
    name: "Testimonials",
    version: "1.1.0",
  });
  await fs.writeFile(
    path.join(updateDir, "widgets", "testimonials", "widget.liquid"),
    "<!-- Testimonials widget v1.1.0 -->",
  );

  // Updated existing widget
  await fs.ensureDir(path.join(updateDir, "widgets", "hero"));
  await fs.writeFile(
    path.join(updateDir, "widgets", "hero", "widget.liquid"),
    "<!-- Hero widget v1.1.0 - Enhanced -->",
  );

  // New snippet
  await fs.ensureDir(path.join(updateDir, "snippets"));
  await fs.writeFile(path.join(updateDir, "snippets", "footer.liquid"), "<!-- Footer snippet v1.1.0 -->");

  // New template
  await fs.ensureDir(path.join(updateDir, "templates"));
  await fs.writeJson(path.join(updateDir, "templates", "contact.json"), { title: "Contact", slug: "contact" });

  // New menu
  await fs.ensureDir(path.join(updateDir, "menus"));
  await fs.writeJson(path.join(updateDir, "menus", "footer.json"), { id: "footer", items: [] });
}

/**
 * Create version 1.2.0 update (deletions + more updates)
 */
async function createUpdate120() {
  const updateDir = path.join(testThemeDir, "updates", "1.2.0");
  await fs.ensureDir(updateDir);

  // theme.json v1.2.0
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
            { id: "background", label: "Background Color", default: "#f5f5f5" }, // NEW
          ],
          layout: [
            { id: "max_width", label: "Max Width", default: "1400px" },
            { id: "container_padding", label: "Container Padding", default: "20px" }, // NEW
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

/**
 * Setup all test fixtures
 */
async function setup() {
  await fs.remove(testThemeDir);
  await fs.ensureDir(testThemeDir);
  await createBaseTheme();
  await createUpdate110();
  await createUpdate120();
}

/**
 * Cleanup test fixtures
 */
async function cleanup() {
  await fs.remove(testThemeDir);
}

// ============================================================================
// Test Assertions / Helpers
// ============================================================================

async function fileExists(relativePath) {
  return fs.pathExists(path.join(testThemeDir, "latest", relativePath));
}

async function fileContains(relativePath, substring) {
  try {
    const content = await fs.readFile(path.join(testThemeDir, "latest", relativePath), "utf8");
    return content.includes(substring);
  } catch {
    return false;
  }
}

async function jsonHasProperty(relativePath, propPath) {
  try {
    const content = await fs.readJson(path.join(testThemeDir, "latest", relativePath));
    const parts = propPath.split(".");
    let current = content;
    for (const part of parts) {
      if (current === undefined) return false;
      current = current[part];
    }
    return current !== undefined;
  } catch {
    return false;
  }
}

async function jsonPropertyEquals(relativePath, propPath, expected) {
  try {
    const content = await fs.readJson(path.join(testThemeDir, "latest", relativePath));
    const parts = propPath.split(".");
    let current = content;
    for (const part of parts) {
      if (current === undefined) return false;
      current = current[part];
    }
    return JSON.stringify(current) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

// ============================================================================
// Test Cases
// ============================================================================

const tests = [
  // Version detection
  {
    name: "Detects all versions (base + updates)",
    test: async () => {
      const versions = await getThemeVersions(TEST_THEME_ID);
      return (
        versions.length === 3 && versions.includes("1.0.0") && versions.includes("1.1.0") && versions.includes("1.2.0")
      );
    },
  },

  // Basic structure
  {
    name: "Creates latest/ directory",
    test: async () => fs.pathExists(path.join(testThemeDir, "latest")),
  },
  {
    name: "latest/ contains theme.json",
    test: () => fileExists("theme.json"),
  },
  {
    name: "theme.json has version 1.2.0 (latest)",
    test: () => jsonPropertyEquals("theme.json", "version", "1.2.0"),
  },

  // File updates (v1.1.0)
  {
    name: "layout.liquid updated to v1.1.0",
    test: () => fileContains("layout.liquid", "v1.1.0"),
  },
  {
    name: "assets/base.css updated to v1.1.0",
    test: () => fileContains("assets/base.css", "v1.1.0"),
  },
  {
    name: "assets/new-feature.js added in v1.1.0",
    test: () => fileExists("assets/new-feature.js"),
  },
  {
    name: "snippets/footer.liquid added in v1.1.0",
    test: () => fileExists("snippets/footer.liquid"),
  },

  // Widget updates
  {
    name: "widgets/hero/widget.liquid updated to v1.1.0",
    test: () => fileContains("widgets/hero/widget.liquid", "v1.1.0"),
  },
  {
    name: "widgets/testimonials/ added in v1.1.0",
    test: () => fileExists("widgets/testimonials/schema.json"),
  },
  {
    name: "widgets/accordion/ updated to v1.2.0",
    test: () => fileContains("widgets/accordion/widget.liquid", "v1.2.0"),
  },

  // Templates and menus (v1.1.0)
  {
    name: "templates/contact.json added in v1.1.0",
    test: () => fileExists("templates/contact.json"),
  },
  {
    name: "menus/footer.json added in v1.1.0",
    test: () => fileExists("menus/footer.json"),
  },

  // Original files preserved
  {
    name: "assets/utils.js preserved from base",
    test: () => fileContains("assets/utils.js", "v1.0.0"),
  },
  {
    name: "snippets/header.liquid preserved from base",
    test: () => fileContains("snippets/header.liquid", "v1.0.0"),
  },
  {
    name: "templates/home.json preserved from base",
    test: () => fileExists("templates/home.json"),
  },
  {
    name: "templates/about.json preserved from base",
    test: () => fileExists("templates/about.json"),
  },
  {
    name: "menus/main.json preserved from base",
    test: () => fileExists("menus/main.json"),
  },

  // Settings updates
  {
    name: "theme.json has accent color (added v1.1.0)",
    test: async () => {
      const content = await fs.readJson(path.join(testThemeDir, "latest", "theme.json"));
      const colors = content.settings?.global?.colors || [];
      return colors.some((c) => c.id === "accent");
    },
  },
  {
    name: "theme.json has background color (added v1.2.0)",
    test: async () => {
      const content = await fs.readJson(path.join(testThemeDir, "latest", "theme.json"));
      const colors = content.settings?.global?.colors || [];
      return colors.some((c) => c.id === "background");
    },
  },
  {
    name: "theme.json has container_padding (added v1.2.0)",
    test: async () => {
      const content = await fs.readJson(path.join(testThemeDir, "latest", "theme.json"));
      const layout = content.settings?.global?.layout || [];
      return layout.some((l) => l.id === "container_padding");
    },
  },

  // DELETIONS (v1.2.0)
  {
    name: "assets/deprecated.css DELETED in v1.2.0",
    test: async () => !(await fileExists("assets/deprecated.css")),
  },
  {
    name: "widgets/deprecated-widget/ DELETED in v1.2.0",
    test: async () => !(await fileExists("widgets/deprecated-widget")),
  },
  {
    name: "assets/ folder still exists after file deletion",
    test: () => fileExists("assets"),
  },
  {
    name: "widgets/ folder still exists after widget deletion",
    test: () => fileExists("widgets"),
  },
];

// ============================================================================
// Test Runner
// ============================================================================

async function runTests() {
  console.log(`\n${BOLD}Theme Update System Tests${RESET}\n`);
  console.log(`Test theme: ${TEST_THEME_ID}`);
  console.log(`Theme dir: ${testThemeDir}\n`);

  let passed = 0;
  let failed = 0;

  try {
    // Setup
    console.log(`${YELLOW}Setting up test fixtures...${RESET}`);
    await setup();

    // Build snapshot
    console.log(`${YELLOW}Building latest/ snapshot...${RESET}\n`);
    await buildLatestSnapshot(TEST_THEME_ID);

    // Run tests
    console.log(`${BOLD}Running ${tests.length} tests:${RESET}\n`);

    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result) {
          console.log(`  ${GREEN}✓${RESET} ${name}`);
          passed++;
        } else {
          console.log(`  ${RED}✗${RESET} ${name}`);
          failed++;
        }
      } catch (error) {
        console.log(`  ${RED}✗${RESET} ${name} (Error: ${error.message})`);
        failed++;
      }
    }

    // Summary
    console.log(`\n${BOLD}Results:${RESET}`);
    console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
    if (failed > 0) {
      console.log(`  ${RED}Failed: ${failed}${RESET}`);
    }
    console.log();
  } catch (error) {
    console.error(`${RED}Setup failed: ${error.message}${RESET}`);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log(`${YELLOW}Cleaning up...${RESET}`);
    await cleanup();
    console.log(`${GREEN}Done!${RESET}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
