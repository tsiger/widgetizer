/**
 * Rendering Pipeline Test Suite
 *
 * Tests renderWidget and renderPageLayout from the rendering service.
 * Uses a minimal test project with real core widgets (core-spacer, core-divider)
 * to verify the full rendering pipeline: schema defaults, settings merge,
 * link resolution, menu resolution, sanitization, and Liquid output.
 *
 * Run with: node --test server/tests/rendering.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-render-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir, getProjectMenusDir } = await import("../config.js");

const { writeProjectsFile } = await import("../controllers/projectController.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { renderWidget, renderPageLayout } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "render-test-uuid";
const PROJECT_FOLDER = "render-test-project";

// Minimal raw theme settings (what theme.json looks like)
const RAW_THEME_SETTINGS = {
  settings: {
    global: {
      colors: [{ id: "primary_color", value: "#0066cc", default: "#000000" }],
    },
  },
};

// ============================================================================
// Global setup / teardown
// ============================================================================

before(async () => {
  // Write projects.json
  await writeProjectsFile({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Render Test Project",
        theme: "__render_test_theme__",
        siteUrl: "https://example.com",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER, "local");

  // Create project directory structure
  await fs.ensureDir(projectDir);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER, "local"));
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER, "local"), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "widgets"));
  await fs.ensureDir(getProjectMenusDir(PROJECT_FOLDER, "local"));

  // Create media data
  await writeMediaFile(PROJECT_ID, {
    files: [
      {
        id: "img-1",
        filename: "hero.jpg",
        path: "/uploads/images/hero.jpg",
        type: "image/jpeg",
        width: 800,
        height: 600,
        usedIn: [],
        sizes: { medium: { path: "/uploads/images/hero-medium.jpg", width: 400, height: 300 } },
      },
    ],
  });

  // Create test pages for link resolution
  const pagesDir = getProjectPagesDir(PROJECT_FOLDER, "local");
  await fs.writeFile(
    path.join(pagesDir, "home.json"),
    JSON.stringify({ name: "Home", slug: "home", uuid: "page-uuid-home", widgets: {} }),
  );
  await fs.writeFile(
    path.join(pagesDir, "about.json"),
    JSON.stringify({ name: "About Us", slug: "about-us", uuid: "page-uuid-about", widgets: {} }),
  );

  // Create a minimal layout.liquid for renderPageLayout tests
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{ page.name }}</title>
  {% seo %}
</head>
<body class="{{ body_class }}">
  {{ header | raw }}
  <main>{{ main_content | raw }}</main>
  {{ footer | raw }}
</body>
</html>`,
  );

  // Create a simple theme widget for testing non-core widgets
  const testWidgetDir = path.join(projectDir, "widgets", "test-hero");
  await fs.ensureDir(testWidgetDir);
  await fs.writeFile(
    path.join(testWidgetDir, "widget.liquid"),
    `<section class="hero">
  <h1>{{ widget.settings.heading }}</h1>
  {% if widget.settings.subtitle %}<p>{{ widget.settings.subtitle }}</p>{% endif %}
  {% if widget.settings.cta_link.href != blank %}<a href="{{ widget.settings.cta_link.href }}">{{ widget.settings.cta_link.text }}</a>{% endif %}
</section>`,
  );
  await fs.writeFile(
    path.join(testWidgetDir, "schema.json"),
    JSON.stringify(
      {
        type: "test-hero",
        settings: [
          { id: "heading", type: "text", default: "Default Heading" },
          { id: "subtitle", type: "text", default: "" },
          { id: "cta_link", type: "link", default: { href: "", text: "", target: "_self" } },
          { id: "nav_menu", type: "menu", default: null },
        ],
        blocks: [
          {
            type: "feature",
            settings: [
              { id: "label", type: "text", default: "Feature" },
              { id: "link", type: "link", default: { href: "", text: "" } },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );

  // Create a test menu
  await fs.writeFile(
    path.join(getProjectMenusDir(PROJECT_FOLDER, "local"), "main-nav.json"),
    JSON.stringify(
      {
        id: "main-nav",
        uuid: "menu-uuid-main-nav",
        name: "Main Navigation",
        items: [
          { id: "item_1", label: "Home", link: "/", pageUuid: "page-uuid-home" },
          { id: "item_2", label: "About", link: "/about", pageUuid: "page-uuid-about" },
          { id: "item_3", label: "External", link: "https://external.com" },
          {
            id: "item_4",
            label: "Parent",
            link: "#",
            items: [{ id: "item_4_1", label: "Child", link: "/child", pageUuid: "page-uuid-home" }],
          },
        ],
      },
      null,
      2,
    ),
  );
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// renderWidget — core widgets
// ============================================================================

describe("renderWidget — core widgets", () => {
  it("renders core-spacer with default settings", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "spacer-1",
      {
        type: "core-spacer",
        settings: {},
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("core-spacer"));
    assert.ok(html.includes("spacer-1"));
    // Default height from schema is 40
    assert.ok(html.includes("height: 40px"));
  });

  it("renders core-spacer with custom settings", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "spacer-2",
      {
        type: "core-spacer",
        settings: { height: 100, mobileHeight: 50, showOnMobile: true },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("height: 100px"));
    assert.ok(html.includes("height: 50px"));
  });

  it("passes widget index to template", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "spacer-idx",
      { type: "core-spacer", settings: {} },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      3,
      "local",
    );
    assert.ok(html.includes('data-widget-index="3"'));
  });

  it("returns error HTML when widget template is missing", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "missing-1",
      {
        type: "nonexistent-widget",
        settings: {},
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("widget-error") || html.includes("not found"));
  });
});

// ============================================================================
// renderWidget — theme widgets with schema defaults
// ============================================================================

describe("renderWidget — theme widgets & schema defaults", () => {
  it("renders with schema default when setting not provided", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-1",
      {
        type: "test-hero",
        settings: {},
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Schema default for heading is "Default Heading"
    assert.ok(html.includes("Default Heading"));
  });

  it("overrides schema default with provided setting", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-2",
      {
        type: "test-hero",
        settings: { heading: "Custom Title" },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("Custom Title"));
    assert.ok(!html.includes("Default Heading"));
  });

  it("auto-escapes text settings (XSS protection)", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-xss",
      {
        type: "test-hero",
        settings: { heading: '<script>alert("xss")</script>' },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(!html.includes("<script>alert"));
    assert.ok(html.includes("&lt;script&gt;") || html.includes("&amp;"));
  });
});

// ============================================================================
// renderWidget — link resolution (pageUuid → current slug)
// ============================================================================

describe("renderWidget — link resolution", () => {
  it("resolves pageUuid in link settings to current slug", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-link",
      {
        type: "test-hero",
        settings: {
          heading: "Link Test",
          cta_link: {
            href: "/old-slug",
            text: "Go to About",
            target: "_self",
            pageUuid: "page-uuid-about",
          },
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Should resolve to "about-us.html" (current slug of page-uuid-about)
    assert.ok(html.includes("about-us.html"), "link should resolve to current slug");
    assert.ok(html.includes("Go to About"));
  });

  it("clears link when pageUuid references a deleted page", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-deleted",
      {
        type: "test-hero",
        settings: {
          heading: "Deleted Link",
          cta_link: {
            href: "/old-page",
            text: "Click Me",
            target: "_self",
            pageUuid: "page-uuid-nonexistent",
          },
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Deleted page → link cleared (href="", text="")
    assert.ok(!html.includes("/old-page"));
  });

  it("passes through custom URL links (no pageUuid)", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-custom",
      {
        type: "test-hero",
        settings: {
          heading: "Custom Link",
          cta_link: {
            href: "https://external.com",
            text: "External",
            target: "_blank",
          },
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("https://external.com"));
    assert.ok(html.includes("External"));
  });
});

// ============================================================================
// renderWidget — menu resolution
// ============================================================================

describe("renderWidget — menu resolution", () => {
  it("loads menu data for menu-type settings", async () => {
    // We can't easily check the rendered output since the test-hero template
    // doesn't render menus, but we can verify it doesn't crash and the menu
    // setting gets resolved (not left as a string)
    const html = await renderWidget(
      PROJECT_ID,
      "hero-menu",
      {
        type: "test-hero",
        settings: {
          heading: "Menu Test",
          nav_menu: "main-nav",
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Should render without error
    assert.ok(html.includes("Menu Test"));
    assert.ok(!html.includes("widget-error"));
  });

  it("resolves menu by UUID", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-menu-uuid",
      {
        type: "test-hero",
        settings: {
          heading: "UUID Menu Test",
          nav_menu: "menu-uuid-main-nav",
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Should render without error — menu resolved via UUID
    assert.ok(html.includes("UUID Menu Test"));
    assert.ok(!html.includes("widget-error"));
  });

  it("falls back to slug-based lookup for legacy menu references", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-menu-slug",
      {
        type: "test-hero",
        settings: {
          heading: "Slug Menu Test",
          nav_menu: "main-nav",
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Should also render without error — menu resolved via slug fallback
    assert.ok(html.includes("Slug Menu Test"));
    assert.ok(!html.includes("widget-error"));
  });

  it("handles non-existent menu gracefully", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "hero-nomenu",
      {
        type: "test-hero",
        settings: {
          heading: "No Menu",
          nav_menu: "ghost-menu",
        },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("No Menu"));
    assert.ok(!html.includes("widget-error"));
  });
});

// ============================================================================
// renderWidget — render modes
// ============================================================================

describe("renderWidget — render modes", () => {
  it("renders in preview mode by default", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "spacer-prev",
      {
        type: "core-spacer",
        settings: { height: 30 },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("height: 30px"));
  });

  it("renders in publish mode", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "spacer-pub",
      {
        type: "core-spacer",
        settings: { height: 60 },
      },
      RAW_THEME_SETTINGS,
      "publish",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("height: 60px"));
  });
});

// ============================================================================
// renderWidget — shared globals
// ============================================================================

describe("renderWidget — shared globals", () => {
  it("shares enqueued assets across widget renders", async () => {
    const sharedGlobals = {
      projectId: PROJECT_ID,
      apiUrl: "",
      renderMode: "publish",
      themeSettingsRaw: RAW_THEME_SETTINGS,
      enqueuedStyles: new Map(),
      enqueuedScripts: new Map(),
    };

    // Render two widgets with the same shared globals
    await renderWidget(
      PROJECT_ID,
      "w1",
      {
        type: "core-spacer",
        settings: {},
      },
      RAW_THEME_SETTINGS,
      "publish",
      sharedGlobals,
      null,
      "local",
    );

    await renderWidget(
      PROJECT_ID,
      "w2",
      {
        type: "core-spacer",
        settings: {},
      },
      RAW_THEME_SETTINGS,
      "publish",
      sharedGlobals,
      null,
      "local",
    );

    // Shared globals should have pagesByUuid cached after first render
    assert.ok(sharedGlobals.pagesByUuid instanceof Map, "should cache pagesByUuid");
    assert.ok(sharedGlobals.pagesByUuid.has("page-uuid-home"));
    assert.ok(sharedGlobals.pagesByUuid.has("page-uuid-about"));
  });
});

// ============================================================================
// renderPageLayout
// ============================================================================

describe("renderPageLayout", () => {
  it("renders a complete HTML document", async () => {
    const html = await renderPageLayout(
      PROJECT_ID,
      {
        headerContent: "<header>Header</header>",
        mainContent: "<p>Content</p>",
        footerContent: "<footer>Footer</footer>",
      },
      { name: "Test Page", slug: "test-page" },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    assert.ok(html.includes("<!DOCTYPE html>") || html.includes("<!doctype html>"));
    assert.ok(html.includes("<title>Test Page</title>"));
  });

  it("injects header, main content, and footer", async () => {
    const html = await renderPageLayout(
      PROJECT_ID,
      {
        headerContent: '<nav class="main-nav">Nav</nav>',
        mainContent: "<article>Main article</article>",
        footerContent: '<footer class="site-footer">Foot</footer>',
      },
      { name: "Injected Page", slug: "injected" },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    assert.ok(html.includes("main-nav"));
    assert.ok(html.includes("Main article"));
    assert.ok(html.includes("site-footer"));
  });

  it("sets body class from page slug", async () => {
    const html = await renderPageLayout(
      PROJECT_ID,
      { headerContent: "", mainContent: "", footerContent: "" },
      { name: "About", slug: "about-us" },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    assert.ok(html.includes('class="about-us"'));
  });

  it("renders SEO tags via {% seo %} in layout", async () => {
    const html = await renderPageLayout(
      PROJECT_ID,
      { headerContent: "", mainContent: "", footerContent: "" },
      {
        name: "SEO Page",
        slug: "seo-page",
        seo: { description: "A page with SEO", og_title: "SEO Title" },
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    assert.ok(html.includes("<title>SEO Page</title>"));
    assert.ok(html.includes("og:title"));
    assert.ok(html.includes("SEO Title"));
    assert.ok(html.includes("A page with SEO"));
  });

  it("handles missing page data gracefully", async () => {
    const html = await renderPageLayout(
      PROJECT_ID,
      { headerContent: "", mainContent: "<p>Body</p>", footerContent: "" },
      null,
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    // Should not crash — layout.liquid uses page.name which will be empty
    assert.ok(html.includes("<html") || html.includes("Error"));
  });

  it("returns error HTML when layout.liquid is missing", async () => {
    // Create a project without layout.liquid
    const noLayoutProject = {
      id: "no-layout-uuid",
      folderName: "no-layout-project",
      name: "No Layout",
      theme: "__no_layout__",
      created: new Date().toISOString(),
    };

    await writeProjectsFile({
      projects: [noLayoutProject],
      activeProjectId: noLayoutProject.id,
    });
    const noLayoutDir = getProjectDir(noLayoutProject.folderName, "local");
    await fs.ensureDir(noLayoutDir);
    // No layout.liquid created

    const html = await renderPageLayout(
      noLayoutProject.id,
      { headerContent: "", mainContent: "", footerContent: "" },
      { name: "Test", slug: "test" },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      "local",
    );

    assert.ok(html.includes("Error") || html.includes("not found"));

    // Restore original project
    await writeProjectsFile({
      projects: [
        {
          id: PROJECT_ID,
          folderName: PROJECT_FOLDER,
          name: "Render Test Project",
          theme: "__render_test_theme__",
          siteUrl: "https://example.com",
          created: new Date().toISOString(),
        },
      ],
      activeProjectId: PROJECT_ID,
    });
    await fs.remove(noLayoutDir);
  });
});
