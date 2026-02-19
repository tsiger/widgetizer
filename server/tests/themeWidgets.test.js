/**
 * Theme Widget Rendering Tests
 *
 * Tests that arch theme widgets render correctly in isolation using renderWidget().
 * Verifies: data attributes for the editor, schema defaults, richtext | raw output,
 * XSS sanitization, conditional elements, heading levels, and block ordering.
 *
 * Run with: node --test server/tests/themeWidgets.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-widgets-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.resolve("themes");
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir, getProjectMenusDir } = await import("../config.js");
const { writeProjectsFile } = await import("../controllers/projectController.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { renderWidget } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the class attribute from the root <section> element of widget HTML.
 * Useful for checking conditional CSS classes without false positives from
 * <style> or <script> blocks that also contain class name references.
 */
function getRootClasses(html) {
  const match = html.match(/<section[^>]*class="([^"]*)"/);
  return match ? match[1] : "";
}

/**
 * Strips <style> and <script> blocks from HTML so we can check rendered
 * markup without false positives from CSS selectors or JS string literals.
 */
function stripStyleAndScript(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
}

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "theme-widget-test-uuid";
const PROJECT_FOLDER = "theme-widget-test";

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
  await writeProjectsFile({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Theme Widget Test",
        theme: "arch",
        siteUrl: "https://example.com",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER, "local");
  await fs.ensureDir(projectDir);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER, "local"));
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER, "local"), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.ensureDir(path.join(projectDir, "widgets"));
  await fs.ensureDir(getProjectMenusDir(PROJECT_FOLDER, "local"));

  // Copy arch theme widgets into the test project so the renderer can find them
  const ARCH_WIDGETS_DIR = path.resolve("themes", "arch", "widgets");
  const targetWidgetsDir = path.join(projectDir, "widgets");
  for (const widgetName of ["slideshow", "accordion", "rich-text", "image-tabs"]) {
    await fs.copy(
      path.join(ARCH_WIDGETS_DIR, widgetName),
      path.join(targetWidgetsDir, widgetName),
    );
  }

  // Initialize empty media data
  await writeMediaFile(PROJECT_ID, { files: [] });

  const pagesDir = getProjectPagesDir(PROJECT_FOLDER, "local");
  await fs.writeFile(
    path.join(pagesDir, "home.json"),
    JSON.stringify({ name: "Home", slug: "home", uuid: "page-uuid-home", widgets: {} }),
  );
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Slideshow
// ============================================================================

describe("slideshow widget", () => {
  it("renders all slides with data-block-id attributes", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-1",
      {
        type: "slideshow",
        settings: { height: "medium", autoplay: true, autoplay_speed: 5000 },
        blocks: {
          "slide-a": { type: "slide", settings: { heading_text: "First Slide", heading_size: "5xl" } },
          "slide-b": { type: "slide", settings: { heading_text: "Second Slide", heading_size: "3xl" } },
        },
        blocksOrder: ["slide-a", "slide-b"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.match(html, /data-block-id="slide-a"/);
    assert.match(html, /data-block-id="slide-b"/);
    assert.ok(html.includes("First Slide"));
    assert.ok(html.includes("Second Slide"));
  });

  it("marks only the first slide as active", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-2",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "s1": { type: "slide", settings: { heading_text: "Active" } },
          "s2": { type: "slide", settings: { heading_text: "Inactive" } },
        },
        blocksOrder: ["s1", "s2"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Extract slide divs using data-block-id to find each slide's classes
    const markup = stripStyleAndScript(html);
    assert.match(markup, /data-block-id="s1"/, "first slide should be in markup");

    // The first slide (s1) should have is-active in its class attribute
    const firstSlideMatch = markup.match(/class="slideshow-slide[^"]*"[^>]*data-block-id="s1"/);
    assert.ok(firstSlideMatch && firstSlideMatch[0].includes("is-active"), "first slide should be active");

    // The second slide (s2) should NOT have is-active
    const secondSlideMatch = markup.match(/class="slideshow-slide[^"]*"[^>]*data-block-id="s2"/);
    assert.ok(secondSlideMatch && !secondSlideMatch[0].includes("is-active"), "second slide should not be active");
  });

  it("renders navigation arrows and pagination for multiple slides", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-3",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "s1": { type: "slide", settings: { heading_text: "One" } },
          "s2": { type: "slide", settings: { heading_text: "Two" } },
        },
        blocksOrder: ["s1", "s2"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("slideshow-prev"), "should have prev button");
    assert.ok(html.includes("slideshow-next"), "should have next button");
    assert.ok(html.includes("slideshow-pagination"), "should have pagination");
    assert.ok(html.includes("slideshow-dot"), "should have pagination dots");
  });

  it("does not render navigation for a single slide", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-4",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "only": { type: "slide", settings: { heading_text: "Solo" } },
        },
        blocksOrder: ["only"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(!html.includes("slideshow-prev"), "no prev button for single slide");
    assert.ok(!html.includes("slideshow-next"), "no next button for single slide");
    assert.ok(!html.includes("slideshow-pagination"), "no pagination for single slide");
  });

  it("renders h1 when widget.index is 1", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-h1",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "s1": { type: "slide", settings: { heading_text: "Hero Title" } },
        },
        blocksOrder: ["s1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      1,
      "local",
    );

    assert.ok(html.includes("<h1"), "first widget on page should use h1");
  });

  it("renders h2 when widget.index is not 1", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-h2",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "s1": { type: "slide", settings: { heading_text: "Later Title" } },
        },
        blocksOrder: ["s1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      3,
      "local",
    );

    assert.ok(html.includes("<h2"), "non-first widget should use h2");
    assert.ok(!html.includes("<h1"), "non-first widget should not use h1");
  });

  it("auto-escapes text settings (XSS protection)", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "slideshow-xss",
      {
        type: "slideshow",
        settings: { height: "medium" },
        blocks: {
          "xss": {
            type: "slide",
            settings: {
              heading_text: '<img src=x onerror="alert(1)">',
              text_content: '<script>alert("xss")</script>',
            },
          },
        },
        blocksOrder: ["xss"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(!html.includes('<script>alert'), "script tags must be escaped");
    assert.ok(!html.includes('onerror="alert'), "event handlers must be escaped");
    // Verify they are HTML-escaped
    assert.ok(html.includes("&lt;script&gt;") || html.includes("&lt;img"), "XSS payloads should be HTML-encoded");
  });
});

// ============================================================================
// Accordion
// ============================================================================

describe("accordion widget", () => {
  it("renders all items with data-block-id attributes", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-1",
      {
        type: "accordion",
        settings: { title: "FAQ", style: "separated" },
        blocks: {
          "q1": { type: "item", settings: { question: "What is this?", answer: "<p>A test.</p>" } },
          "q2": { type: "item", settings: { question: "How does it work?", answer: "<p>Like this.</p>" } },
        },
        blocksOrder: ["q1", "q2"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.match(html, /data-block-id="q1"/);
    assert.match(html, /data-block-id="q2"/);
    assert.ok(html.includes("What is this?"));
    assert.ok(html.includes("How does it work?"));
  });

  it("renders richtext answers with | raw (HTML not escaped)", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-rte",
      {
        type: "accordion",
        settings: { title: "FAQ" },
        blocks: {
          "q1": { type: "item", settings: { question: "Q", answer: "<p>Rich <strong>text</strong> answer.</p>" } },
        },
        blocksOrder: ["q1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // The answer uses | raw so the HTML should render unescaped
    assert.ok(html.includes("<strong>text</strong>"), "richtext should not be escaped");
    assert.ok(!html.includes("&lt;strong&gt;"), "richtext should not be double-escaped");
  });

  it("renders connected style with accordion-bordered class", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-style",
      {
        type: "accordion",
        settings: { title: "FAQ", style: "connected" },
        blocks: {
          "q1": { type: "item", settings: { question: "Q", answer: "<p>A</p>" } },
        },
        blocksOrder: ["q1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("accordion-bordered"), "connected style should add bordered class");
  });

  it("does not render bordered class for separated style", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-sep",
      {
        type: "accordion",
        settings: { title: "FAQ", style: "separated" },
        blocks: {
          "q1": { type: "item", settings: { question: "Q", answer: "<p>A</p>" } },
        },
        blocksOrder: ["q1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Check the root <section> class attribute (not the <style> block which always has CSS)
    const rootClasses = getRootClasses(html);
    assert.ok(!rootClasses.includes("accordion-bordered"), "separated style should not add bordered class on root element");
  });

  it("renders widget header when title is provided", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-hdr",
      {
        type: "accordion",
        settings: { title: "My FAQ", eyebrow: "Help Center", description: "<p>Find answers</p>" },
        blocks: {
          "q1": { type: "item", settings: { question: "Q", answer: "<p>A</p>" } },
        },
        blocksOrder: ["q1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("widget-header"), "should render header section");
    assert.ok(html.includes("My FAQ"), "should contain title text");
    assert.ok(html.includes("Help Center"), "should contain eyebrow text");
    assert.ok(html.includes("Find answers"), "should contain description text");
  });

  it("sets data-multi-open when allow_multiple is true", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-multi",
      {
        type: "accordion",
        settings: { title: "FAQ", allow_multiple: true },
        blocks: {
          "q1": { type: "item", settings: { question: "Q", answer: "<p>A</p>" } },
        },
        blocksOrder: ["q1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes('data-multi-open="true"'), "should set multi-open data attribute");
  });

  it("all accordions start collapsed (aria-expanded=false, aria-hidden=true)", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "accordion-closed",
      {
        type: "accordion",
        settings: { title: "FAQ" },
        blocks: {
          "q1": { type: "item", settings: { question: "Q1", answer: "<p>A1</p>" } },
          "q2": { type: "item", settings: { question: "Q2", answer: "<p>A2</p>" } },
        },
        blocksOrder: ["q1", "q2"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Strip <script> blocks which contain aria attribute string literals in JS code
    const markup = stripStyleAndScript(html);
    // All triggers start with aria-expanded="false"
    assert.ok(markup.includes('aria-expanded="false"'), "triggers should start collapsed");
    // No item should be aria-expanded="true" in the HTML markup
    assert.ok(!markup.includes('aria-expanded="true"'), "no trigger should start expanded");
    // Content panels should be aria-hidden="true"
    assert.ok(markup.includes('aria-hidden="true"'), "panels should start hidden");
  });
});

// ============================================================================
// Rich Text
// ============================================================================

describe("rich-text widget", () => {
  it("renders heading and text blocks with data-block-id", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-1",
      {
        type: "rich-text",
        settings: { text_alignment: "start", content_width: "md" },
        blocks: {
          "h1": { type: "heading", settings: { text: "Welcome", size: "3xl" } },
          "t1": { type: "text", settings: { text: "<p>Hello world</p>", size: "lg" } },
        },
        blocksOrder: ["h1", "t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.match(html, /data-block-id="h1"/);
    assert.match(html, /data-block-id="t1"/);
    assert.ok(html.includes("Welcome"));
    assert.ok(html.includes("Hello world"));
  });

  it("renders richtext blocks unescaped via | raw", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-raw",
      {
        type: "rich-text",
        settings: {},
        blocks: {
          "t1": { type: "text", settings: { text: "<p>This is <em>italic</em> text.</p>" } },
        },
        blocksOrder: ["t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("<em>italic</em>"), "richtext should render HTML via | raw");
    assert.ok(!html.includes("&lt;em&gt;"), "richtext should not be escaped");
  });

  it("applies content width and alignment classes", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-align",
      {
        type: "rich-text",
        settings: { text_alignment: "center", content_width: "sm" },
        blocks: {
          "h1": { type: "heading", settings: { text: "Centered" } },
        },
        blocksOrder: ["h1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("widget-content-sm"), "should apply content width class");
    assert.ok(html.includes("widget-content-align-center"), "should apply alignment class");
  });

  it("renders button blocks with link text", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-btn",
      {
        type: "rich-text",
        settings: {},
        blocks: {
          "b1": {
            type: "button",
            settings: {
              link: { text: "Get Started", href: "/start", target: "_self" },
              style: "primary",
              size: "medium",
            },
          },
        },
        blocksOrder: ["b1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("Get Started"), "should render button text");
    assert.ok(html.includes('href="/start"'), "should render button href");
    assert.ok(html.includes("widget-button-primary"), "should apply primary style");
  });

  it("renders h1 for heading block when widget.index is 1", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-h1",
      {
        type: "rich-text",
        settings: {},
        blocks: {
          "h1": { type: "heading", settings: { text: "Page Title" } },
        },
        blocksOrder: ["h1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      1,
      "local",
    );

    assert.ok(html.includes("<h1"), "first widget on page should use h1");
  });

  it("renders h2 for heading block when widget.index is not 1", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "richtext-h2",
      {
        type: "rich-text",
        settings: {},
        blocks: {
          "h1": { type: "heading", settings: { text: "Section Title" } },
        },
        blocksOrder: ["h1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      2,
      "local",
    );

    assert.ok(html.includes("<h2"), "non-first widget should use h2");
    assert.ok(!html.includes("<h1"), "non-first widget should not use h1");
  });
});

// ============================================================================
// Image Tabs
// ============================================================================

describe("image-tabs widget", () => {
  it("renders all tabs with data-block-id attributes", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-1",
      {
        type: "image-tabs",
        settings: { title: "Features" },
        blocks: {
          "tab-a": { type: "tab", settings: { title: "Integration", description: "<p>Connect tools</p>" } },
          "tab-b": { type: "tab", settings: { title: "Analytics", description: "<p>Track data</p>" } },
        },
        blocksOrder: ["tab-a", "tab-b"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.match(html, /data-block-id="tab-a"/);
    assert.match(html, /data-block-id="tab-b"/);
    assert.ok(html.includes("Integration"));
    assert.ok(html.includes("Analytics"));
  });

  it("marks only the first tab as active", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-active",
      {
        type: "image-tabs",
        settings: { title: "Features" },
        blocks: {
          "t1": { type: "tab", settings: { title: "First" } },
          "t2": { type: "tab", settings: { title: "Second" } },
        },
        blocksOrder: ["t1", "t2"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // First tab list item should have is-active
    const tabListItems = html.split("image-tabs-tab ");
    // tabListItems[1] is the first tab <li>
    assert.ok(tabListItems[1].includes("is-active"), "first tab should be active");

    // First image frame should not be hidden
    assert.match(html, /image-tabs-image-frame is-active/, "first image frame should be active");
  });

  it("uses proper ARIA roles for tabs", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-aria",
      {
        type: "image-tabs",
        settings: { title: "Features" },
        blocks: {
          "t1": { type: "tab", settings: { title: "One" } },
        },
        blocksOrder: ["t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes('role="tablist"'), "should have tablist role");
    assert.ok(html.includes('role="tab"'), "should have tab role on buttons");
    assert.ok(html.includes('role="tabpanel"'), "should have tabpanel role on image area");
    assert.ok(html.includes('aria-selected="true"'), "first tab should be selected");
  });

  it("applies layout-image-right class when image_position is right", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-right",
      {
        type: "image-tabs",
        settings: { title: "Features", image_position: "right" },
        blocks: {
          "t1": { type: "tab", settings: { title: "One" } },
        },
        blocksOrder: ["t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("layout-image-right"), "should add image-right layout class");
  });

  it("does not apply layout-image-right class when position is left", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-left",
      {
        type: "image-tabs",
        settings: { title: "Features", image_position: "left" },
        blocks: {
          "t1": { type: "tab", settings: { title: "One" } },
        },
        blocksOrder: ["t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    // Check root <section> class (not the <style> block which always has CSS for layout-image-right)
    const rootClasses = getRootClasses(html);
    assert.ok(!rootClasses.includes("layout-image-right"), "left position should not have image-right class on root element");
  });

  it("renders richtext tab descriptions unescaped", async () => {
    const html = await renderWidget(
      PROJECT_ID,
      "imgtabs-rte",
      {
        type: "image-tabs",
        settings: { title: "Features" },
        blocks: {
          "t1": { type: "tab", settings: { title: "One", description: "<p>Rich <strong>content</strong></p>" } },
        },
        blocksOrder: ["t1"],
      },
      RAW_THEME_SETTINGS,
      "preview",
      null,
      null,
      "local",
    );

    assert.ok(html.includes("<strong>content</strong>"), "richtext description should not be escaped");
  });
});
