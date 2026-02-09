/**
 * Liquid Tags Test Suite
 *
 * Tests all custom Liquid tags in src/core/tags/ to ensure they render
 * correctly in various contexts (preview mode, publish mode, edge cases).
 *
 * Run with: node --test server/tests/tags.test.js
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Liquid } from "liquidjs";

// Import all tags
import { SeoTag } from "../../src/core/tags/SeoTag.js";
import { FontsTag } from "../../src/core/tags/FontsTag.js";
import { AssetTag } from "../../src/core/tags/assetTag.js";
import { ImageTag } from "../../src/core/tags/imageTag.js";
import { VideoTag } from "../../src/core/tags/videoTag.js";
import { AudioTag } from "../../src/core/tags/audioTag.js";
import { YouTubeTag } from "../../src/core/tags/youtubeTag.js";
import { EnqueueStyleTag } from "../../src/core/tags/enqueueStyle.js";
import { EnqueueScriptTag } from "../../src/core/tags/enqueueScript.js";
import { RenderHeaderAssetsTag } from "../../src/core/tags/renderHeaderAssets.js";
import { RenderFooterAssetsTag } from "../../src/core/tags/renderFooterAssets.js";
import { CustomCssTag } from "../../src/core/tags/customCssTag.js";
import { CustomHeadScriptsTag } from "../../src/core/tags/customHeadScriptsTag.js";
import { CustomFooterScriptsTag } from "../../src/core/tags/customFooterScriptsTag.js";
import { ThemeSettingsTag } from "../../src/core/tags/themeSettings.js";
import { PlaceholderImageTag } from "../../src/core/tags/placeholderImageTag.js";
import { EnqueuePreloadTag } from "../../src/core/tags/enqueuePreload.js";

// ============================================================================
// Engine Setup
// ============================================================================

let engine;

function setupEngine() {
  engine = new Liquid({
    extname: ".liquid",
    cache: false,
  });

  engine.registerTag("seo", SeoTag);
  engine.registerTag("fonts", FontsTag);
  engine.registerTag("asset", AssetTag);
  engine.registerTag("image", ImageTag);
  engine.registerTag("video", VideoTag);
  engine.registerTag("audio", AudioTag);
  engine.registerTag("youtube", YouTubeTag);
  engine.registerTag("enqueue_style", EnqueueStyleTag);
  engine.registerTag("enqueue_script", EnqueueScriptTag);
  engine.registerTag("header_assets", RenderHeaderAssetsTag);
  engine.registerTag("footer_assets", RenderFooterAssetsTag);
  engine.registerTag("custom_css", CustomCssTag);
  engine.registerTag("custom_head_scripts", CustomHeadScriptsTag);
  engine.registerTag("custom_footer_scripts", CustomFooterScriptsTag);
  engine.registerTag("theme_settings", ThemeSettingsTag);
  engine.registerTag("placeholder_image", PlaceholderImageTag);
  engine.registerTag("enqueue_preload", EnqueuePreloadTag);
}

// ============================================================================
// Test Fixtures (Mock Data)
// ============================================================================

const fixtures = {
  basicPage: {
    name: "Test Page",
    slug: "test-page",
    seo: {
      description: "A test page description",
      og_title: "Test OG Title",
      og_image: "/uploads/images/hero.jpg",
      robots: "index,follow",
    },
  },

  minimalPage: {
    name: "Minimal Page",
  },

  xssPage: {
    name: '<script>alert("xss")</script>',
    seo: {
      description: 'Test "quotes" & <special> chars',
    },
  },

  project: {
    siteUrl: "https://example.com",
  },

  themeWithGoogleFonts: {
    settings: {
      global: {
        typography: [
          {
            id: "body_font",
            type: "font_picker",
            value: { stack: '"Inter", sans-serif', weight: 400 },
          },
          {
            id: "heading_font",
            type: "font_picker",
            value: { stack: '"Playfair Display", serif', weight: 700 },
          },
        ],
      },
    },
  },

  themeWithBunnyFonts: {
    settings: {
      global: {
        typography: [
          {
            id: "body_font",
            type: "font_picker",
            value: { stack: '"Inter", sans-serif', weight: 400 },
          },
        ],
        privacy: [{ id: "use_bunny_fonts", value: true }],
      },
    },
  },

  emptyTheme: {
    settings: { global: {} },
  },

  themeWithCustomCss: {
    settings: {
      global: {
        advanced: [{ id: "custom_css", value: "body { background: red; }" }],
      },
    },
  },

  themeWithCustomScripts: {
    settings: {
      global: {
        advanced: [
          { id: "custom_head_scripts", value: '<script>console.log("head");</script>' },
          { id: "custom_footer_scripts", value: '<script>console.log("footer");</script>' },
        ],
      },
    },
  },
};

// ============================================================================
// Helper to render with globals
// ============================================================================

async function render(template, context = {}, globals = {}) {
  if (!context.mediaFiles) {
    context.mediaFiles = {
      "hero.jpg": {
        filename: "hero.jpg",
        path: "hero.jpg",
        type: "image/jpeg",
        width: 800,
        height: 600,
        sizes: {
          medium: { path: "hero-medium.jpg", width: 400, height: 300 },
        },
      },
      "logo.svg": {
        filename: "logo.svg",
        path: "logo.svg",
        type: "image/svg+xml",
        width: 200,
        height: 50,
      },
      "intro.mp4": {
        filename: "intro.mp4",
        path: "intro.mp4",
        type: "video/mp4",
      },
      "podcast.mp3": {
        filename: "podcast.mp3",
        path: "podcast.mp3",
        type: "audio/mp3",
      },
    };
  }

  if (!context.imagePath) context.imagePath = "/uploads/images";
  if (!context.videoPath) context.videoPath = "/uploads/videos";
  if (!context.audioPath) context.audioPath = "/uploads/audios";

  return engine.parseAndRender(template, context, { globals });
}

// ============================================================================
// Tests
// ============================================================================

before(() => {
  setupEngine();
});

// ---------------------------------------------------------------------------
// SEO Tag
// ---------------------------------------------------------------------------

describe("SeoTag", () => {
  it("generates title from page name", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /<title>Test Page<\/title>/);
  });

  it("generates meta description", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /<meta name="description" content="A test page description">/);
  });

  it("generates og:title", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /<meta property="og:title" content="Test OG Title">/);
  });

  it("generates og:image with absolute URL from stored /uploads/ path", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    // og_image is stored as "/uploads/images/hero.jpg" — SeoTag extracts filename
    // and combines with imagePath ("/uploads/images" in preview mode)
    assert.match(result, /og:image" content="https:\/\/example\.com\/uploads\/images\/hero\.jpg"/);
    assert.doesNotMatch(result, /\/\/uploads/, "should not produce double slashes in path");
  });

  it("generates twitter:card as summary_large_image when image present", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /<meta name="twitter:card" content="summary_large_image">/);
  });

  it("generates twitter:card as summary when no image", async () => {
    const result = await render("{% seo %}", { page: fixtures.minimalPage, project: fixtures.project });
    assert.match(result, /<meta name="twitter:card" content="summary">/);
  });

  it("handles missing page data gracefully", async () => {
    const result = await render("{% seo %}", {});
    assert.match(result, /<!-- SEO Tag: No page data found -->/);
  });

  it("escapes HTML entities in page name (XSS protection)", async () => {
    const result = await render("{% seo %}", { page: fixtures.xssPage, project: fixtures.project });
    assert.match(result, /&lt;script&gt;/, "should escape < and > in script tags");
    assert.doesNotMatch(result, /<script>alert/, "raw script tag must not appear in output");
  });

  it("escapes quotes and ampersands in description", async () => {
    const result = await render("{% seo %}", { page: fixtures.xssPage, project: fixtures.project });
    assert.match(result, /&amp;/, "should escape & to &amp;");
    assert.match(result, /&quot;/, "should escape double quotes");
  });

  it("uses page name as og:title fallback when og_title is missing", async () => {
    const result = await render("{% seo %}", { page: fixtures.minimalPage, project: fixtures.project });
    assert.match(result, /<meta property="og:title" content="Minimal Page">/);
  });

  it("generates twitter:image matching og:image", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /twitter:image" content="https:\/\/example\.com\/uploads\/images\/hero\.jpg"/);
  });

  it("handles og:image that is already an absolute URL", async () => {
    const page = {
      name: "External Image",
      seo: { og_image: "https://cdn.example.com/photo.jpg" },
    };
    const result = await render("{% seo %}", { page, project: fixtures.project });
    assert.match(result, /og:image" content="https:\/\/cdn\.example\.com\/photo\.jpg"/);
  });

  it("generates robots meta tag", async () => {
    const result = await render("{% seo %}", { page: fixtures.basicPage, project: fixtures.project });
    assert.match(result, /<meta name="robots" content="index,follow">/);
  });

  // --- Publish mode (assets/images) path rewriting ---

  it("rewrites og:image to assets/images in publish mode", async () => {
    const page = {
      name: "Published Page",
      seo: { og_image: "/uploads/images/social-banner.jpg" },
    };
    const result = await render("{% seo %}", {
      page,
      project: fixtures.project,
      imagePath: "assets/images",
    });
    assert.match(result, /og:image" content="https:\/\/example\.com\/assets\/images\/social-banner\.jpg"/);
    assert.doesNotMatch(result, /\/uploads\//, "must not contain /uploads/ in publish mode");
  });

  it("rewrites twitter:image to assets/images in publish mode", async () => {
    const page = {
      name: "Published Page",
      seo: { og_image: "/uploads/images/social-banner.jpg" },
    };
    const result = await render("{% seo %}", {
      page,
      project: fixtures.project,
      imagePath: "assets/images",
    });
    assert.match(result, /twitter:image" content="https:\/\/example\.com\/assets\/images\/social-banner\.jpg"/);
  });

  it("uses relative path in publish mode when no siteUrl", async () => {
    const page = {
      name: "No Domain Page",
      seo: { og_image: "/uploads/images/photo.png" },
    };
    const result = await render("{% seo %}", {
      page,
      project: {},
      imagePath: "assets/images",
    });
    assert.match(result, /og:image" content="\/assets\/images\/photo\.png"/);
  });

  it("handles bare filename og_image (no path prefix)", async () => {
    const page = {
      name: "Bare Filename",
      seo: { og_image: "banner.jpg" },
    };
    const result = await render("{% seo %}", {
      page,
      project: fixtures.project,
      imagePath: "assets/images",
    });
    assert.match(result, /og:image" content="https:\/\/example\.com\/assets\/images\/banner\.jpg"/);
  });
});

// ---------------------------------------------------------------------------
// Fonts Tag
// ---------------------------------------------------------------------------

describe("FontsTag", () => {
  it("returns empty string when no typography settings", async () => {
    const result = await render("{% fonts %}", {}, { themeSettingsRaw: fixtures.emptyTheme });
    assert.equal(result.trim(), "");
  });

  it("generates Google Fonts preconnect links", async () => {
    const result = await render("{% fonts %}", {}, { themeSettingsRaw: fixtures.themeWithGoogleFonts });
    assert.match(result, /href="https:\/\/fonts\.googleapis\.com"/);
    assert.match(result, /href="https:\/\/fonts\.gstatic\.com"/);
  });

  it("generates Bunny Fonts preconnect when privacy enabled", async () => {
    const result = await render("{% fonts %}", {}, { themeSettingsRaw: fixtures.themeWithBunnyFonts });
    assert.match(result, /href="https:\/\/fonts\.bunny\.net"/);
    assert.doesNotMatch(result, /googleapis/, "should not use Google Fonts when Bunny is enabled");
  });

  it("includes display=swap for font loading", async () => {
    const result = await render("{% fonts %}", {}, { themeSettingsRaw: fixtures.themeWithGoogleFonts });
    assert.match(result, /display=swap/);
  });
});

// ---------------------------------------------------------------------------
// Asset Tag
// ---------------------------------------------------------------------------

describe("AssetTag", () => {
  const previewGlobals = { renderMode: "preview", apiUrl: "http://localhost:3001", projectId: "test-project" };

  it("generates CSS link tag", async () => {
    const result = await render('{% asset src: "base.css" %}', {}, previewGlobals);
    assert.match(result, /rel="stylesheet"/);
    assert.match(result, /href=".*base\.css"/);
  });

  it("generates JS script tag", async () => {
    const result = await render('{% asset src: "main.js" %}', {}, previewGlobals);
    assert.match(result, /<script.*src=".*main\.js".*><\/script>/);
  });

  it("adds defer attribute when specified", async () => {
    const result = await render('{% asset src: "main.js", defer: true %}', {}, previewGlobals);
    assert.match(result, /\sdefer/);
  });

  it("adds async attribute when specified", async () => {
    const result = await render('{% asset src: "analytics.js", async: true %}', {}, previewGlobals);
    assert.match(result, /\sasync/);
  });

  it("uses relative path in publish mode", async () => {
    const result = await render(
      '{% asset src: "base.css" %}',
      {},
      { renderMode: "publish", projectId: "test-project" },
    );
    assert.match(result, /href="assets\/base\.css"/);
  });

  it("returns empty string when no src provided", async () => {
    const result = await render("{% asset %}", {}, { renderMode: "preview" });
    assert.equal(result.trim(), "");
  });
});

// ---------------------------------------------------------------------------
// Custom CSS Tag
// ---------------------------------------------------------------------------

describe("CustomCssTag", () => {
  it("outputs custom CSS in style tag", async () => {
    const result = await render("{% custom_css %}", {}, { themeSettingsRaw: fixtures.themeWithCustomCss });
    assert.match(result, /<style/);
    assert.match(result, /body \{ background: red; \}/);
    assert.match(result, /<\/style>/);
  });

  it("returns empty when no custom CSS defined", async () => {
    const result = await render("{% custom_css %}", {}, { themeSettingsRaw: fixtures.emptyTheme });
    assert.equal(result.trim(), "");
  });
});

// ---------------------------------------------------------------------------
// Custom Scripts Tags
// ---------------------------------------------------------------------------

describe("CustomHeadScriptsTag", () => {
  it("outputs head scripts", async () => {
    const result = await render("{% custom_head_scripts %}", {}, { themeSettingsRaw: fixtures.themeWithCustomScripts });
    assert.match(result, /console\.log\("head"\)/);
  });

  it("returns empty when no head scripts defined", async () => {
    const result = await render("{% custom_head_scripts %}", {}, { themeSettingsRaw: fixtures.emptyTheme });
    assert.equal(result.trim(), "");
  });
});

describe("CustomFooterScriptsTag", () => {
  it("outputs footer scripts", async () => {
    const result = await render(
      "{% custom_footer_scripts %}",
      {},
      { themeSettingsRaw: fixtures.themeWithCustomScripts },
    );
    assert.match(result, /console\.log\("footer"\)/);
  });

  it("returns empty when no footer scripts defined", async () => {
    const result = await render("{% custom_footer_scripts %}", {}, { themeSettingsRaw: fixtures.emptyTheme });
    assert.equal(result.trim(), "");
  });
});

// ---------------------------------------------------------------------------
// Enqueue Style/Script + Header/Footer Assets pipeline
// ---------------------------------------------------------------------------

describe("Enqueue + Render Assets pipeline", () => {
  it("enqueued style appears in header_assets output", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    await render('{% enqueue_style src: "widget.css" %}', {}, globals);
    const result = await render("{% header_assets %}", {}, globals);
    assert.match(result, /widget\.css/);
  });

  it("enqueued script appears in footer_assets output", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    await render('{% enqueue_script src: "widget.js" %}', {}, globals);
    const result = await render("{% footer_assets %}", {}, globals);
    assert.match(result, /widget\.js/);
  });

  it("deduplicates same style enqueued multiple times", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    await render('{% enqueue_style src: "shared.css" %}', {}, globals);
    await render('{% enqueue_style src: "shared.css" %}', {}, globals);
    await render('{% enqueue_style src: "shared.css" %}', {}, globals);
    const result = await render("{% header_assets %}", {}, globals);
    const matches = result.match(/shared\.css/g);
    assert.equal(matches.length, 1, "shared.css should appear exactly once");
  });

  it("deduplicates same script enqueued multiple times", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    await render('{% enqueue_script src: "shared.js" %}', {}, globals);
    await render('{% enqueue_script src: "shared.js" %}', {}, globals);
    const result = await render("{% footer_assets %}", {}, globals);
    const matches = result.match(/shared\.js/g);
    assert.equal(matches.length, 1, "shared.js should appear exactly once");
  });

  it("respects priority ordering (lower numbers first)", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    await render('{% enqueue_style src: "low-priority.css", priority: 90 %}', {}, globals);
    await render('{% enqueue_style src: "high-priority.css", priority: 10 %}', {}, globals);
    const result = await render("{% header_assets %}", {}, globals);
    const highIdx = result.indexOf("high-priority.css");
    const lowIdx = result.indexOf("low-priority.css");
    assert.ok(highIdx < lowIdx, "high priority (10) should render before low priority (90)");
  });

  it("renders enqueued preloads in header_assets", async () => {
    const globals = {
      enqueuedStyles: new Map(),
      enqueuedScripts: new Map(),
      enqueuedPreloads: new Map(),
    };
    await render('{% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}', {}, globals);
    const result = await render("{% header_assets %}", {}, globals);
    assert.match(result, /rel="preload"/);
    assert.match(result, /href="hero\.jpg"/);
    assert.match(result, /as="image"/);
    assert.match(result, /fetchpriority="high"/);
  });

  it("enqueue_style returns empty string (no visible output)", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    const result = await render('{% enqueue_style src: "widget.css" %}', {}, globals);
    assert.equal(result, "");
  });

  it("enqueue_script returns empty string (no visible output)", async () => {
    const globals = { enqueuedStyles: new Map(), enqueuedScripts: new Map() };
    const result = await render('{% enqueue_script src: "widget.js" %}', {}, globals);
    assert.equal(result, "");
  });
});

// ---------------------------------------------------------------------------
// Image Tag
// ---------------------------------------------------------------------------

describe("ImageTag", () => {
  it("generates img tag with medium size by default", async () => {
    const result = await render('{% image src: "hero.jpg" %}', {}, { renderMode: "preview" });
    assert.match(result, /<img /);
    assert.match(result, /src="\/uploads\/images\/hero-medium\.jpg"/, "default size should be medium");
    assert.match(result, /width="400"/);
    assert.match(result, /height="300"/);
  });

  it("includes alt attribute when provided", async () => {
    const result = await render('{% image src: "hero.jpg", alt: "Hero image" %}', {}, { renderMode: "preview" });
    assert.match(result, /alt="Hero image"/);
  });

  it("defaults to lazy loading", async () => {
    const result = await render('{% image src: "hero.jpg" %}', {}, { renderMode: "preview" });
    assert.match(result, /loading="lazy"/);
  });

  it("returns empty string when no src provided", async () => {
    const result = await render("{% image %}", {}, { renderMode: "preview" });
    assert.equal(result, "");
  });

  it("returns error comment when media file not found", async () => {
    const result = await render('{% image src: "missing.jpg" %}', {}, { renderMode: "preview" });
    assert.match(result, /<!-- Image tag error:.*not found -->/);
  });

  it("handles SVG images without sizes lookup", async () => {
    const result = await render('{% image src: "logo.svg" %}', {}, { renderMode: "preview" });
    assert.match(result, /<img /);
    assert.match(result, /src="\/uploads\/images\/logo\.svg"/);
    assert.doesNotMatch(result, /width="/, "SVGs should not have width attribute");
  });

  it("returns only URL when output is 'url'", async () => {
    const result = await render('{% image src: "hero.jpg", output: "url" %}', {}, { renderMode: "preview" });
    assert.equal(result, "/uploads/images/hero-medium.jpg");
    assert.doesNotMatch(result, /<img/, "should not produce an img tag in url mode");
  });
});

// ---------------------------------------------------------------------------
// Video Tag
// ---------------------------------------------------------------------------

describe("VideoTag", () => {
  it("generates video tag with src", async () => {
    const result = await render('{% video src: "intro.mp4" %}', {}, { renderMode: "preview" });
    assert.match(result, /<video /);
    assert.match(result, /src="\/uploads\/videos\/intro\.mp4"/);
  });

  it("includes controls attribute by default", async () => {
    const result = await render('{% video src: "intro.mp4" %}', {}, { renderMode: "preview" });
    assert.match(result, /\scontrols/);
  });

  it("includes preload=metadata", async () => {
    const result = await render('{% video src: "intro.mp4" %}', {}, { renderMode: "preview" });
    assert.match(result, /preload="metadata"/);
  });

  it("returns empty string when no src provided", async () => {
    const result = await render("{% video %}", {}, { renderMode: "preview" });
    assert.equal(result, "");
  });

  it("returns error comment when media file not found", async () => {
    const result = await render('{% video src: "missing.mp4" %}', {}, { renderMode: "preview" });
    assert.match(result, /<!-- Video tag error:.*not found -->/);
  });

  it("returns error comment when file is not a video", async () => {
    const result = await render('{% video src: "hero.jpg" %}', {}, { renderMode: "preview" });
    assert.match(result, /<!-- Video tag error:.*not a video file -->/);
  });

  it("returns URL only when output is 'url'", async () => {
    const result = await render('{% video src: "intro.mp4", output: "url" %}', {}, { renderMode: "preview" });
    assert.equal(result, "/uploads/videos/intro.mp4");
  });
});

// ---------------------------------------------------------------------------
// Audio Tag
// ---------------------------------------------------------------------------

describe("AudioTag", () => {
  it("generates audio URL", async () => {
    const result = await render('{% audio src: "podcast.mp3" %}', {}, { renderMode: "preview" });
    assert.equal(result.trim(), "/uploads/audios/podcast.mp3");
  });

  it("returns empty string when no src provided", async () => {
    const result = await render("{% audio %}", {}, { renderMode: "preview" });
    assert.equal(result, "");
  });

  it("returns error comment when media file not found", async () => {
    const result = await render('{% audio src: "missing.mp3" %}', {}, { renderMode: "preview" });
    assert.match(result, /<!-- Audio tag error:.*not found -->/);
  });

  it("returns error comment when file is not audio", async () => {
    const result = await render('{% audio src: "hero.jpg" %}', {}, { renderMode: "preview" });
    assert.match(result, /<!-- Audio tag error:.*not an audio file -->/);
  });
});

// ---------------------------------------------------------------------------
// YouTube Tag
// ---------------------------------------------------------------------------

describe("YouTubeTag", () => {
  it("generates iframe for YouTube video", async () => {
    const result = await render('{% youtube src: "dQw4w9WgXcQ" %}', {});
    assert.match(result, /<iframe/);
    assert.match(result, /youtube\.com/);
    assert.match(result, /dQw4w9WgXcQ/);
  });

  it("returns empty string when no src provided", async () => {
    const result = await render("{% youtube %}", {});
    assert.equal(result, "");
  });

  it("returns thumbnail URL when output is 'thumbnail'", async () => {
    const result = await render('{% youtube src: "dQw4w9WgXcQ", output: "thumbnail" %}', {});
    assert.match(result, /img\.youtube\.com\/vi\/dQw4w9WgXcQ/);
  });
});

// ---------------------------------------------------------------------------
// Placeholder Image Tag
// ---------------------------------------------------------------------------

describe("PlaceholderImageTag", () => {
  it("generates img tag with landscape placeholder by default", async () => {
    const result = await render(
      "{% placeholder_image %}",
      {},
      { renderMode: "preview", apiUrl: "http://localhost:3001" },
    );
    assert.match(result, /<img /);
    assert.match(result, /placeholder\.svg/);
    assert.match(result, /alt="Placeholder"/);
  });

  it("uses portrait placeholder when specified", async () => {
    const result = await render(
      '{% placeholder_image aspect: "portrait" %}',
      {},
      { renderMode: "preview", apiUrl: "http://localhost:3001" },
    );
    assert.match(result, /placeholder-portrait\.svg/);
  });

  it("uses square placeholder when specified", async () => {
    const result = await render(
      '{% placeholder_image aspect: "square" %}',
      {},
      { renderMode: "preview", apiUrl: "http://localhost:3001" },
    );
    assert.match(result, /placeholder-square\.svg/);
  });

  it("falls back to landscape for invalid aspect ratio", async () => {
    const result = await render(
      '{% placeholder_image aspect: "invalid" %}',
      {},
      { renderMode: "preview", apiUrl: "http://localhost:3001" },
    );
    assert.match(result, /placeholder\.svg/, "should fall back to landscape placeholder");
  });

  it("returns URL only when output is 'url'", async () => {
    const result = await render(
      '{% placeholder_image output: "url" %}',
      {},
      { renderMode: "preview", apiUrl: "http://localhost:3001" },
    );
    assert.doesNotMatch(result, /<img/, "should not produce img tag in url mode");
    assert.match(result, /placeholder\.svg/);
  });

  it("uses relative path in publish mode", async () => {
    const result = await render("{% placeholder_image %}", {}, { renderMode: "publish" });
    assert.match(result, /src="assets\/placeholder\.svg"/);
  });
});

// ---------------------------------------------------------------------------
// Theme Settings Tag
// ---------------------------------------------------------------------------

describe("ThemeSettingsTag", () => {
  it("returns empty when no settings", async () => {
    const result = await render("{% theme_settings %}", {}, { themeSettingsRaw: fixtures.emptyTheme });
    assert.equal(result, "");
  });

  it("generates CSS variables for font_picker settings", async () => {
    const result = await render("{% theme_settings %}", {}, { themeSettingsRaw: fixtures.themeWithGoogleFonts });
    assert.match(result, /<style id="theme-settings-styles">/);
    assert.match(result, /:root \{/);
    assert.match(result, /--typography-body_font-family:/);
    assert.match(result, /--typography-heading_font-family:/);
  });

  it("returns empty when no theme settings raw data", async () => {
    const result = await render("{% theme_settings %}", {}, {});
    assert.equal(result, "");
  });
});
