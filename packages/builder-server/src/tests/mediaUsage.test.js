/**
 * Media Usage Tracking Test Suite
 *
 * Tests the mediaUsageService which tracks which pages and global widgets
 * reference each media file via the `usedIn` array in media.json.
 *
 * Covers:
 *  - extractMediaPathsFromPage (via updatePageMediaUsage)
 *  - extractMediaPathsFromGlobalWidget (via updateGlobalWidgetMediaUsage)
 *  - updatePageMediaUsage
 *  - updateGlobalWidgetMediaUsage
 *  - removePageFromMediaUsage
 *  - getMediaUsage
 *  - refreshAllMediaUsage
 *
 * Uses an isolated DATA_DIR so tests never touch real data.
 *
 * Run with: node --test server/tests/mediaUsage.test.js
 */

import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-usage-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath } = await import("../config.js");

const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { readMediaFile } = await import("../services/mediaService.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");

const {
  updatePageMediaUsage,
  updateGlobalWidgetMediaUsage,
  updateThemeSettingsMediaUsage,
  updateSiteIdentityMediaUsage,
  removePageFromMediaUsage,
  getMediaUsage,
  refreshAllMediaUsage,
  refreshAllMediaUsageFromDir,
  ensureUsageSourceFormat,
} = await import("../services/mediaUsageService.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "media-usage-test-uuid";
const PROJECT_FOLDER = "media-usage-test-project";

const IMG1 = "img-1";
const IMG2 = "img-2";
const IMG3 = "img-3";

// ============================================================================
// Global teardown
// ============================================================================

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Test helpers
// ============================================================================

/** Seed media data with test files */
async function seedMediaJson(files) {
  await writeMediaFile(PROJECT_ID, { files });
}

/** Read current media data */
async function readMediaJson() {
  return readMediaFile(PROJECT_ID);
}

/** Default set of media files for most tests */
function defaultMediaFiles() {
  return [
    {
      id: IMG1,
      filename: "hero.jpg",
      path: "/uploads/images/hero.jpg",
      type: "image/jpeg",
      usedIn: [],
    },
    {
      id: IMG2,
      filename: "logo.png",
      path: "/uploads/images/logo.png",
      type: "image/png",
      usedIn: [],
    },
    {
      id: IMG3,
      filename: "banner.jpg",
      path: "/uploads/images/banner.jpg",
      type: "image/jpeg",
      usedIn: [],
    },
  ];
}

// ============================================================================
// Setup
// ============================================================================

before(async () => {
  // Seed projects in the test DB
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Media Usage Test Project",
        theme: "__test_theme__",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  // Create project directory structure
  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
});

// ============================================================================
// updatePageMediaUsage — extraction from page content
// ============================================================================

describe("updatePageMediaUsage", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  it("tracks image used in a widget setting", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: { image: "/uploads/images/hero.jpg" },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData);
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, ["/uploads/images/hero.jpg"]);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["page:home"]);
  });

  it("tracks image from block settings", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {},
          blocks: {
            block_1: {
              settings: { background: "/uploads/images/banner.jpg" },
            },
          },
        },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "about", pageData);

    const media = await readMediaJson();
    const banner = media.files.find((f) => f.id === IMG3);
    assert.deepEqual(banner.usedIn, ["page:about"]);
  });

  it("tracks SEO og_image", async () => {
    const pageData = {
      seo: { og_image: "/uploads/images/hero.jpg" },
      widgets: {},
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["page:home"]);
  });

  it("normalises og_image without leading slash", async () => {
    const pageData = {
      seo: { og_image: "uploads/images/hero.jpg" },
      widgets: {},
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["page:home"]);
  });

  it("tracks multiple media files from one page", async () => {
    const pageData = {
      seo: { og_image: "/uploads/images/hero.jpg" },
      widgets: {
        widget_1: {
          settings: { image: "/uploads/images/logo.png" },
          blocks: {
            block_1: {
              settings: { background: "/uploads/images/banner.jpg" },
            },
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData);
    assert.equal(result.mediaPaths.length, 3);

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["page:home"]);
    assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, ["page:home"]);
    assert.deepEqual(media.files.find((f) => f.id === IMG3).usedIn, ["page:home"]);
  });

  it("deduplicates — same file used twice on same page", async () => {
    const pageData = {
      widgets: {
        widget_1: { settings: { image: "/uploads/images/hero.jpg" } },
        widget_2: { settings: { background: "/uploads/images/hero.jpg" } },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    // Should appear once, not twice
    assert.deepEqual(hero.usedIn, ["page:home"]);
  });

  it("removes stale usage when media is no longer referenced", async () => {
    // First save — hero is used
    const pageData1 = {
      widgets: {
        widget_1: { settings: { image: "/uploads/images/hero.jpg" } },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData1);

    // Second save — hero removed, logo added
    const pageData2 = {
      widgets: {
        widget_1: { settings: { image: "/uploads/images/logo.png" } },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData2);

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, []);
    assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, ["page:home"]);
  });

  it("handles page with no widgets", async () => {
    const pageData = { name: "Empty page" };
    const result = await updatePageMediaUsage(PROJECT_ID, "empty", pageData);
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, []);
  });

  it("handles page with empty widgets object", async () => {
    const pageData = { widgets: {} };
    const result = await updatePageMediaUsage(PROJECT_ID, "empty", pageData);
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, []);
  });

  it("ignores non-media string values in settings", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {
            title: "Hello World",
            color: "#ff0000",
            link: "https://example.com",
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData);
    assert.deepEqual(result.mediaPaths, []);
  });

  it("ignores media paths not in media.json", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: { image: "/uploads/images/nonexistent.jpg" },
        },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "home", pageData);

    // All usedIn should still be empty
    const media = await readMediaJson();
    media.files.forEach((f) => {
      assert.deepEqual(f.usedIn, []);
    });
  });

  it("tracks usage across multiple pages independently", async () => {
    const page1 = {
      widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
    };
    const page2 = {
      widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
    };
    await updatePageMediaUsage(PROJECT_ID, "home", page1);
    await updatePageMediaUsage(PROJECT_ID, "about", page2);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.ok(hero.usedIn.includes("page:home"));
    assert.ok(hero.usedIn.includes("page:about"));
    assert.equal(hero.usedIn.length, 2);
  });
});

// ============================================================================
// updateGlobalWidgetMediaUsage
// ============================================================================

describe("updateGlobalWidgetMediaUsage", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  it("tracks media used in header widget settings", async () => {
    const headerData = {
      settings: { logo: "/uploads/images/logo.png" },
    };
    const result = await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", headerData);
    assert.equal(result.success, true);

    const media = await readMediaJson();
    const logo = media.files.find((f) => f.id === IMG2);
    assert.deepEqual(logo.usedIn, ["global:root:header"]);
  });

  it("tracks media used in footer widget blocks", async () => {
    const footerData = {
      settings: {},
      blocks: {
        block_1: {
          settings: { background: "/uploads/images/banner.jpg" },
        },
      },
    };
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "footer", footerData);

    const media = await readMediaJson();
    const banner = media.files.find((f) => f.id === IMG3);
    assert.deepEqual(banner.usedIn, ["global:root:footer"]);
  });

  it("normalises globalId — does not double-prefix 'global:'", async () => {
    const headerData = {
      settings: { logo: "/uploads/images/logo.png" },
    };
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "global:header", headerData);

    const media = await readMediaJson();
    const logo = media.files.find((f) => f.id === IMG2);
    // Should be "global:header" not "global:global:header"
    assert.deepEqual(logo.usedIn, ["global:root:header"]);
  });

  it("removes stale global widget usage on re-save", async () => {
    // Header uses logo
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
      settings: { logo: "/uploads/images/logo.png" },
    });
    // Header updated — logo removed, hero added
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
      settings: { background: "/uploads/images/hero.jpg" },
    });

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, []);
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["global:root:header"]);
  });

  it("page and global widget usage are independent", async () => {
    // Page uses hero
    await updatePageMediaUsage(PROJECT_ID, "home", {
      widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
    });
    // Header also uses hero
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
      settings: { bg: "/uploads/images/hero.jpg" },
    });

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.ok(hero.usedIn.includes("page:home"));
    assert.ok(hero.usedIn.includes("global:root:header"));
    assert.equal(hero.usedIn.length, 2);
  });

  it("handles empty global widget data", async () => {
    const result = await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {});
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, []);
  });
});

// ============================================================================
// updateThemeSettingsMediaUsage
// ============================================================================

describe("updateThemeSettingsMediaUsage", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  it("tracks media used in theme settings (e.g. favicon)", async () => {
    const themeData = {
      settings: {
        global: {
          branding: [
            { type: "header", id: "branding_header", label: "Branding" },
            { type: "image", id: "favicon", label: "Favicon", value: "/uploads/images/hero.jpg" },
          ],
        },
      },
    };
    const result = await updateThemeSettingsMediaUsage(PROJECT_ID, themeData);
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, ["/uploads/images/hero.jpg"]);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["global:theme-settings"]);
  });

  it("removes stale theme settings usage on re-save", async () => {
    await updateThemeSettingsMediaUsage(PROJECT_ID, {
      settings: { global: { branding: [{ id: "favicon", value: "/uploads/images/logo.png" }] } },
    });
    await updateThemeSettingsMediaUsage(PROJECT_ID, {
      settings: { global: { branding: [{ id: "favicon", value: "" }] } },
    });

    const media = await readMediaJson();
    const logo = media.files.find((f) => f.id === IMG2);
    assert.ok(!logo.usedIn.includes("global:theme-settings"));
  });

  it("handles empty or missing theme data", async () => {
    const result = await updateThemeSettingsMediaUsage(PROJECT_ID, {});
    assert.equal(result.success, true);
    assert.deepEqual(result.mediaPaths, []);
  });
});

// ============================================================================
// updateSiteIdentityMediaUsage
// ============================================================================

describe("business details media usage", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  afterEach(() => {
    projectRepo.updateProject(PROJECT_ID, { siteIdentity: {} });
  });

  it("tracks the identity logo and clears it when the logo is removed", async () => {
    const result = await updateSiteIdentityMediaUsage(PROJECT_ID, { logo: "/uploads/images/logo.png" });
    assert.deepEqual(result.mediaPaths, ["/uploads/images/logo.png"]);
    assert.deepEqual((await readMediaJson()).files.find((f) => f.id === IMG2).usedIn, ["global:site-identity"]);

    await updateSiteIdentityMediaUsage(PROJECT_ID, {});
    assert.deepEqual((await readMediaJson()).files.find((f) => f.id === IMG2).usedIn, []);
  });

  it("is rebuilt from the project row by a full refresh", async () => {
    projectRepo.updateProject(PROJECT_ID, { siteIdentity: { logo: "/uploads/images/banner.jpg" } });
    await refreshAllMediaUsage(PROJECT_ID);
    assert.ok((await readMediaJson()).files.find((f) => f.id === IMG3).usedIn.includes("global:site-identity"));
  });
});

// ============================================================================
// ensureUsageSourceFormat — the one-time rebuild of old rows
// ============================================================================

describe("ensureUsageSourceFormat", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  // These tests write their own page files; later suites count the pages dir.
  afterEach(async () => {
    const pagesDir = path.join(getProjectDir(PROJECT_FOLDER), "pages");
    await Promise.all(["about.json", "legacy.json"].map((name) => fs.remove(path.join(pagesDir, name))));
  });

  it("rebuilds rows written with the old slug ids, reading the directory it is given", async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);
    await fs.outputJSON(path.join(projectDir, "pages", "about.json"), {
      uuid: "page-uuid-1",
      slug: "about",
      widgets: { w1: { type: "image", settings: { image: "/uploads/images/hero.jpg" } } },
    });
    // An old row: keyed by slug, and pointing at a file that IS still referenced.
    mediaRepo.updateMediaUsageForSource(PROJECT_ID, "about", [IMG1]);

    await ensureUsageSourceFormat({ projectId: PROJECT_ID, projectDir });

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["page:page-uuid-1"]);
  });

  it("stamps a uuid on a page that has none, and keeps the row across its next save", async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);
    const pagePath = path.join(projectDir, "pages", "legacy.json");
    await fs.outputJSON(pagePath, {
      slug: "legacy",
      widgets: { w1: { type: "image", settings: { image: "/uploads/images/hero.jpg" } } },
    });
    mediaRepo.updateMediaUsageForSource(PROJECT_ID, "legacy", [IMG1]);

    await refreshAllMediaUsageFromDir({ projectId: PROJECT_ID, projectDir });

    const stamped = await fs.readJSON(pagePath);
    assert.ok(stamped.uuid, "the rebuild stamps a uuid on the page file");
    assert.deepEqual((await readMediaJson()).files.find((f) => f.id === IMG1).usedIn, [`page:${stamped.uuid}`]);

    // Saving that page again must not add a second row.
    await updatePageMediaUsage(PROJECT_ID, stamped.uuid, stamped);
    assert.deepEqual((await readMediaJson()).files.find((f) => f.id === IMG1).usedIn, [`page:${stamped.uuid}`]);

  });

  it("retires a pending page row when the page is later saved with a uuid", async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);
    const pagePath = path.join(projectDir, "pages", "legacy.json");
    const pageData = {
      slug: "legacy",
      widgets: { w1: { type: "image", settings: { image: "/uploads/images/hero.jpg" } } },
    };
    await fs.outputJSON(pagePath, pageData);
    mediaRepo.updateMediaUsageForSource(PROJECT_ID, "legacy", [IMG1]);

    // The working dir is read-only, so the rebuild can only record a pending id.
    const realWriteFile = fs.writeFile;
    fs.writeFile = async () => {
      throw new Error("EROFS: read-only file system");
    };
    try {
      await refreshAllMediaUsageFromDir({ projectId: PROJECT_ID, projectDir });
    } finally {
      fs.writeFile = realWriteFile;
    }
    assert.deepEqual((await readMediaJson()).files.find((f) => f.id === IMG1).usedIn, ["page:slug:legacy"]);

    // The editor saves the page; it now carries a uuid, so the pending row goes.
    await updatePageMediaUsage(PROJECT_ID, "page-uuid-legacy", { ...pageData, uuid: "page-uuid-legacy" });
    assert.deepEqual(
      (await readMediaJson()).files.find((f) => f.id === IMG1).usedIn,
      ["page:page-uuid-legacy"],
      "no stale slug row left behind",
    );

  });

  it("does nothing without a working dir, rather than wiping usage", async () => {
    mediaRepo.updateMediaUsageForSource(PROJECT_ID, "about", [IMG1]);

    await ensureUsageSourceFormat({ projectId: PROJECT_ID, projectDir: undefined });

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["about"], "rows are left alone");
  });
});

// ============================================================================
// Identity, not slug — what multilang needs from usage rows
// ============================================================================

describe("usage identity", () => {
  const PAGE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const PAGE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const syncPageWrite = (projectId, pageData) => updatePageMediaUsage(projectId, pageData.uuid, pageData);
  const pageWith = (image) => ({ widgets: { w1: { type: "image", settings: { image } } } });

  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  // Two pages will share a slug once they live in different language folders.
  it("keeps two same-slug pages independent, and deleting one leaves the other's media in use", async () => {
    await updatePageMediaUsage(PROJECT_ID, PAGE_A, pageWith("/uploads/images/hero.jpg"));
    await updatePageMediaUsage(PROJECT_ID, PAGE_B, pageWith("/uploads/images/hero.jpg"));

    const both = await readMediaJson();
    assert.deepEqual(
      [...both.files.find((f) => f.id === IMG1).usedIn].sort(),
      [`page:${PAGE_A}`, `page:${PAGE_B}`],
    );

    await removePageFromMediaUsage(PROJECT_ID, PAGE_A);

    const after = await readMediaJson();
    assert.deepEqual(after.files.find((f) => f.id === IMG1).usedIn, [`page:${PAGE_B}`], "the sibling still uses it");
  });

  it("keeps one source across a rename (the uuid does not change)", async () => {
    await syncPageWrite(PROJECT_ID, { uuid: PAGE_A, slug: "about", ...pageWith("/uploads/images/hero.jpg") });
    await syncPageWrite(PROJECT_ID, { uuid: PAGE_A, slug: "about-us", ...pageWith("/uploads/images/hero.jpg") });

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, [`page:${PAGE_A}`]);
  });

  it("namespaces a global so it cannot collide with a page of the same name", async () => {
    await updatePageMediaUsage(PROJECT_ID, "header", pageWith("/uploads/images/hero.jpg"));
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
      settings: { logo: "/uploads/images/logo.png" },
    });

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["page:header"]);
    assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, ["global:root:header"]);
  });
});

// ============================================================================
// removePageFromMediaUsage
// ============================================================================

describe("removePageFromMediaUsage", () => {
  beforeEach(async () => {
    // Seed with some pre-existing usage
    const files = defaultMediaFiles();
    files[0].usedIn = ["page:home", "page:about"]; // hero used on two pages
    files[1].usedIn = ["page:home"]; // logo used on home
    files[2].usedIn = ["page:about"]; // banner used on about
    await seedMediaJson(files);
  });

  it("removes a page from all usedIn arrays", async () => {
    const result = await removePageFromMediaUsage(PROJECT_ID, "home");
    assert.equal(result.success, true);

    const media = await readMediaJson();
    assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["page:about"]);
    assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, []);
    assert.deepEqual(media.files.find((f) => f.id === IMG3).usedIn, ["page:about"]);
  });

  it("does not affect other pages' usage", async () => {
    await removePageFromMediaUsage(PROJECT_ID, "home");

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.ok(hero.usedIn.includes("page:about"));
  });

  it("is a no-op if page has no usage", async () => {
    const result = await removePageFromMediaUsage(PROJECT_ID, "nonexistent-page");
    assert.equal(result.success, true);

    // Nothing should change
    const media = await readMediaJson();
    assert.deepEqual([...media.files.find((f) => f.id === IMG1).usedIn].sort(), ["page:about", "page:home"]);
  });
});

// ============================================================================
// getMediaUsage
// ============================================================================

describe("getMediaUsage", () => {
  before(async () => {
    const files = defaultMediaFiles();
    files[0].usedIn = ["page:home", "page:about", "global:root:header"];
    files[1].usedIn = [];
    await seedMediaJson(files);
  });

  it("returns usage details for a media file in use", async () => {
    const usage = await getMediaUsage(PROJECT_ID, IMG1);
    assert.equal(usage.fileId, IMG1);
    assert.equal(usage.filename, "hero.jpg");
    assert.deepEqual([...usage.usedIn].sort(), ["global:root:header", "page:about", "page:home"]);
    assert.equal(usage.isInUse, true);
  });

  it("returns isInUse: false for unused media", async () => {
    const usage = await getMediaUsage(PROJECT_ID, IMG2);
    assert.equal(usage.isInUse, false);
    assert.deepEqual(usage.usedIn, []);
  });

  it("throws for non-existent file ID", async () => {
    await assert.rejects(
      () => getMediaUsage(PROJECT_ID, "no-such-file"),
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      },
    );
  });
});

// ============================================================================
// refreshAllMediaUsage
// ============================================================================

describe("refreshAllMediaUsage", () => {
  beforeEach(async () => {
    // Seed media.json with stale/wrong usage data
    const files = defaultMediaFiles();
    files[0].usedIn = ["page:deleted-page", "page:ghost"]; // stale
    files[1].usedIn = ["page:home"]; // will be verified
    await seedMediaJson(files);

    // Create actual page files on disk
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    await fs.ensureDir(pagesDir);

    // home.json — uses hero and logo
    await fs.writeFile(
      path.join(pagesDir, "home.json"),
      JSON.stringify({
        uuid: "uuid-home",
        seo: { og_image: "/uploads/images/hero.jpg" },
        widgets: {
          w1: { settings: { image: "/uploads/images/logo.png" } },
        },
      }),
    );

    // about.json — uses banner
    await fs.writeFile(
      path.join(pagesDir, "about.json"),
      JSON.stringify({
        uuid: "uuid-about",
        widgets: {
          w1: { settings: { bg: "/uploads/images/banner.jpg" } },
        },
      }),
    );

    // global/header.json — uses logo
    const globalDir = path.join(pagesDir, "global");
    await fs.ensureDir(globalDir);
    await fs.writeFile(
      path.join(globalDir, "header.json"),
      JSON.stringify({
        settings: { logo: "/uploads/images/logo.png" },
      }),
    );

    // global/footer.json — uses hero
    await fs.writeFile(
      path.join(globalDir, "footer.json"),
      JSON.stringify({
        settings: { background: "/uploads/images/hero.jpg" },
      }),
    );

    // theme.json — favicon (logo) so theme settings media is tracked
    const themeJsonPath = getProjectThemeJsonPath(PROJECT_FOLDER);
    await fs.writeFile(
      themeJsonPath,
      JSON.stringify({
        settings: {
          global: {
            branding: [
              { type: "header", id: "branding_header", label: "Branding" },
              { type: "image", id: "favicon", label: "Favicon", value: "/uploads/images/logo.png" },
            ],
          },
        },
      }),
    );
  });

  it("rebuilds all usedIn arrays from disk", async () => {
    const result = await refreshAllMediaUsage(PROJECT_ID);
    assert.equal(result.success, true);

    const media = await readMediaJson();

    // hero: home (seo) + global:footer
    const hero = media.files.find((f) => f.id === IMG1);
    assert.ok(hero.usedIn.includes("page:uuid-home"), "hero should be used on home");
    assert.ok(hero.usedIn.includes("global:root:footer"), "hero should be used in footer");
    assert.ok(!hero.usedIn.includes("page:deleted-page"), "stale usage should be removed");
    assert.ok(!hero.usedIn.includes("page:ghost"), "stale usage should be removed");

    // logo: home (widget) + global:header + global:theme-settings (favicon)
    const logo = media.files.find((f) => f.id === IMG2);
    assert.ok(logo.usedIn.includes("page:uuid-home"));
    assert.ok(logo.usedIn.includes("global:root:header"));
    assert.ok(logo.usedIn.includes("global:theme-settings"), "favicon in theme settings should be tracked");

    // banner: about
    const banner = media.files.find((f) => f.id === IMG3);
    assert.deepEqual(banner.usedIn, ["page:uuid-about"]);

  });

  it("clears stale usage from deleted pages", async () => {
    const result = await refreshAllMediaUsage(PROJECT_ID);
    assert.equal(result.success, true);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.ok(!hero.usedIn.includes("page:deleted-page"));
    assert.ok(!hero.usedIn.includes("page:ghost"));
  });

  it("returns message with page count", async () => {
    const result = await refreshAllMediaUsage(PROJECT_ID);
    assert.match(result.message, /2 pages/); // home.json + about.json
  });

  it("still scans theme settings when the pages directory is absent", async () => {
    // Temporarily move pages dir out of the way (collections-only / fresh-import shape).
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    const backupDir = pagesDir + ".backup";
    await fs.move(pagesDir, backupDir);

    try {
      const result = await refreshAllMediaUsage(PROJECT_ID);
      assert.equal(result.success, true);
      // The scan should continue through theme settings even without page files,
      // so the favicon remains tracked.
      assert.doesNotMatch(result.message, /no pages directory/i);
      assert.match(result.message, /0 pages/);

      const media = await readMediaJson();
      // theme.json (seeded in beforeEach) sets the favicon to logo (IMG2).
      assert.ok(
        media.files.find((f) => f.id === IMG2).usedIn.includes("global:theme-settings"),
        "favicon should be tracked even with no pages dir",
      );
    } finally {
      await fs.move(backupDir, pagesDir);
    }
  });
});

// ============================================================================
// refreshAllMediaUsage — collections-only project (no pages dir)
// ============================================================================

describe("refreshAllMediaUsage — collections-only project", () => {
  const COLL_IMG = "coll-img-16";

  beforeEach(async () => {
    await seedMediaJson([
      { id: COLL_IMG, filename: "cover.jpg", path: "/uploads/images/cover.jpg", type: "image/jpeg", usedIn: [] },
    ]);

    // No pages/ dir at all — only a collection item referencing the media file.
    await fs.remove(getProjectPagesDir(PROJECT_FOLDER));
    const itemPath = path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "hello.json");
    await fs.ensureDir(path.dirname(itemPath));
    await fs.writeFile(itemPath, JSON.stringify({ uuid: "uuid-hello", settings: { cover: "/uploads/images/cover.jpg" } }));
  });

  afterEach(async () => {
    // Restore project structure for subsequent suites.
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  });

  it("tracks a collection item's media when pages/ is absent", async () => {
    const result = await refreshAllMediaUsage(PROJECT_ID);
    assert.equal(result.success, true);

    const media = await readMediaJson();
    // Collections are still scanned even when the project has no pages dir.
    assert.deepEqual(media.files.find((f) => f.id === COLL_IMG).usedIn, ["collection:uuid-hello"]);
    assert.match(result.message, /1 collection items/);
  });
});

// ============================================================================
// Richtext-embedded media
//
// An image inserted *only* into a richtext field embeds a SIZE-VARIANT path
// (e.g. the `-large` variant) inside an HTML `<img src>` string. Tracking must
//   (a) extract upload paths embedded *anywhere* in a string (not just a value
//       that *is* a bare upload path), and
//   (b) match a media record by ANY of its size-variant paths, not only the
//       original `file.path`.
// Both halves are load-bearing: the embedded path is a variant, so extraction
// without variant-matching (or vice-versa) still leaves usedIn empty → export
// prunes the image → broken <img> on the published page.
// ============================================================================

const RICH = "rich-img";

describe("richtext-embedded media", () => {
  /** A media record whose richtext-embedded reference is a `-large` variant path. */
  function mediaFilesWithVariants() {
    return [
      {
        id: RICH,
        filename: "hero.jpg",
        path: "/uploads/images/hero.jpg",
        type: "image/jpeg",
        sizes: {
          medium: { path: "/uploads/images/hero-medium.jpg", width: 1024, height: 576 },
          large: { path: "/uploads/images/hero-large.jpg", width: 1920, height: 1080 },
        },
        usedIn: [],
      },
    ];
  }

  beforeEach(async () => {
    await seedMediaJson(mediaFilesWithVariants());
  });

  it("updatePageMediaUsage tracks an image embedded only in a richtext <img src> (variant path)", async () => {
    const pageData = {
      widgets: {
        w1: {
          settings: {
            body: '<p>Intro text <img src="/uploads/images/hero-large.jpg" alt="hero"> trailing text.</p>',
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "article", pageData);
    assert.ok(
      result.mediaPaths.includes("/uploads/images/hero-large.jpg"),
      "the embedded variant path should be extracted from the richtext HTML string",
    );

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === RICH);
    assert.deepEqual(hero.usedIn, ["page:article"], "the variant path should match the record via recordMediaPaths");
  });

  it("refreshAllMediaUsage tracks a richtext-only image (variant path) from a page on disk", async () => {
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    await fs.ensureDir(pagesDir);
    await fs.writeFile(
      path.join(pagesDir, "news.json"),
      JSON.stringify({
        uuid: "uuid-news",
        widgets: {
          w1: { settings: { body: '<p><img src="/uploads/images/hero-large.jpg"></p>' } },
        },
      }),
    );

    try {
      const result = await refreshAllMediaUsage(PROJECT_ID);
      assert.equal(result.success, true);

      const media = await readMediaJson();
      const hero = media.files.find((f) => f.id === RICH);
      assert.ok(hero.usedIn.includes("page:uuid-news"), "refresh should mark the richtext-only image as used");
    } finally {
      await fs.remove(path.join(pagesDir, "news.json"));
    }
  });

  it("extracts multiple embedded paths from one richtext string and handles a trailing period safely", async () => {
    const pageData = {
      widgets: {
        w1: {
          settings: {
            // Two embedded refs; the second sits at the end of a sentence. If the
            // regex absorbs the trailing period, over-matching only ever marks an
            // asset "used", which is the safe direction.
            body:
              '<p>First <img src="/uploads/images/hero-large.jpg">. Then see /uploads/images/hero-medium.jpg.</p>',
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "multi", pageData);
    assert.ok(result.mediaPaths.includes("/uploads/images/hero-large.jpg"), "first embedded path found");
    assert.ok(
      result.mediaPaths.includes("/uploads/images/hero-medium.jpg."),
      "second match absorbs the trailing period (parity over-match)",
    );

    // Despite the over-matched period, the bare medium variant still matches the
    // record (hero-large does too), so the image is tracked.
    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === RICH);
    assert.deepEqual(hero.usedIn, ["page:multi"]);
  });
});

// ============================================================================
// Concurrent / race-condition safety
// ============================================================================

describe("Concurrent updates (race-condition safety)", () => {
  beforeEach(async () => {
    await seedMediaJson(defaultMediaFiles());
  });

  it("parallel page updates don't lose data", async () => {
    // Two different pages saving at the same time, both referencing hero
    const page1 = {
      widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
    };
    const page2 = {
      widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
    };

    // Fire both in parallel
    await Promise.all([
      updatePageMediaUsage(PROJECT_ID, "home", page1),
      updatePageMediaUsage(PROJECT_ID, "about", page2),
    ]);

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    // Both pages should be tracked — neither should be lost
    assert.ok(hero.usedIn.includes("page:home"), "home should be tracked");
    assert.ok(hero.usedIn.includes("page:about"), "about should be tracked");
    assert.equal(hero.usedIn.length, 2);
  });

  it("parallel page + global widget updates don't lose data", async () => {
    const pageData = {
      widgets: { w1: { settings: { image: "/uploads/images/logo.png" } } },
    };
    const headerData = {
      settings: { logo: "/uploads/images/logo.png" },
    };

    await Promise.all([
      updatePageMediaUsage(PROJECT_ID, "home", pageData),
      updateGlobalWidgetMediaUsage(PROJECT_ID, "header", headerData),
    ]);

    const media = await readMediaJson();
    const logo = media.files.find((f) => f.id === IMG2);
    assert.ok(logo.usedIn.includes("page:home"), "page usage should be tracked");
    assert.ok(logo.usedIn.includes("global:root:header"), "global usage should be tracked");
    assert.equal(logo.usedIn.length, 2);
  });
});

// ============================================================================
// File asset usage tracking (images + files, including link objects)
// ============================================================================

const FILE1 = "file-1";

describe("File asset usage tracking", () => {
  function mediaFilesWithPdf() {
    return [
      ...defaultMediaFiles(),
      {
        id: FILE1,
        filename: "brochure.pdf",
        path: "/uploads/files/brochure.pdf",
        type: "application/pdf",
        usedIn: [],
      },
    ];
  }

  beforeEach(async () => {
    await seedMediaJson(mediaFilesWithPdf());
  });

  it("tracks file asset used in a widget setting", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: { download: "/uploads/files/brochure.pdf" },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData);
    assert.ok(result.mediaPaths.includes("/uploads/files/brochure.pdf"));

    const media = await readMediaJson();
    const pdf = media.files.find((f) => f.id === FILE1);
    assert.deepEqual(pdf.usedIn, ["page:home"]);
  });

  it("tracks file asset inside a link object (copy-URL-to-link workflow)", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {
            link: {
              text: "Download Brochure",
              href: "/uploads/files/brochure.pdf",
              target: "_blank",
            },
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "resources", pageData);
    assert.ok(result.mediaPaths.includes("/uploads/files/brochure.pdf"));

    const media = await readMediaJson();
    const pdf = media.files.find((f) => f.id === FILE1);
    assert.deepEqual(pdf.usedIn, ["page:resources"]);
  });

  it("tracks image inside a link object href", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {
            link: {
              text: "View Photo",
              href: "/uploads/images/hero.jpg",
              target: "_self",
            },
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "gallery", pageData);
    assert.ok(result.mediaPaths.includes("/uploads/images/hero.jpg"));

    const media = await readMediaJson();
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["page:gallery"]);
  });

  it("tracks file asset inside a block-level link object", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {},
          blocks: {
            block_1: {
              settings: {
                button: {
                  text: "Get PDF",
                  href: "/uploads/files/brochure.pdf",
                  target: "_blank",
                },
              },
            },
          },
        },
      },
    };
    await updatePageMediaUsage(PROJECT_ID, "docs", pageData);

    const media = await readMediaJson();
    const pdf = media.files.find((f) => f.id === FILE1);
    assert.deepEqual(pdf.usedIn, ["page:docs"]);
  });

  it("tracks file asset in global widget link object", async () => {
    const headerData = {
      settings: {
        cta_link: {
          text: "Download",
          href: "/uploads/files/brochure.pdf",
          target: "_blank",
        },
      },
    };
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", headerData);

    const media = await readMediaJson();
    const pdf = media.files.find((f) => f.id === FILE1);
    assert.deepEqual(pdf.usedIn, ["global:root:header"]);
  });

  it("ignores non-media strings inside link objects", async () => {
    const pageData = {
      widgets: {
        widget_1: {
          settings: {
            link: {
              text: "External Link",
              href: "https://example.com",
              target: "_blank",
            },
          },
        },
      },
    };
    const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData);
    assert.deepEqual(result.mediaPaths, []);
  });

  it("removes stale file usage when link is updated", async () => {
    // First save — links to PDF
    await updatePageMediaUsage(PROJECT_ID, "home", {
      widgets: {
        w1: {
          settings: {
            link: { href: "/uploads/files/brochure.pdf", text: "Download" },
          },
        },
      },
    });

    const media1 = await readMediaJson();
    assert.deepEqual(media1.files.find((f) => f.id === FILE1).usedIn, ["page:home"]);

    // Second save — link changed to external URL
    await updatePageMediaUsage(PROJECT_ID, "home", {
      widgets: {
        w1: {
          settings: {
            link: { href: "https://example.com", text: "Visit" },
          },
        },
      },
    });

    const media2 = await readMediaJson();
    assert.deepEqual(media2.files.find((f) => f.id === FILE1).usedIn, []);
  });
});

// ============================================================================
// refreshAllMediaUsageFromDir — dir-explicit core
// ============================================================================

describe("refreshAllMediaUsageFromDir (dir-explicit core)", () => {
  it("scans content from the explicit projectDir, not the folderName path", async () => {
    // Reset the project's media rows (usedIn cleared).
    await seedMediaJson(defaultMediaFiles());

    // Write a page into a scratch dir that is deliberately NOT
    // getProjectDir(PROJECT_FOLDER) — proving the core reads the dir it is handed,
    // which is what lets hosted point it at the per-user working dir.
    const explicitProjectDir = path.join(TEST_ROOT, "explicit-dir-project");
    const explicitPagesDir = path.join(explicitProjectDir, "pages");
    await fs.ensureDir(explicitPagesDir);
    await fs.writeFile(
      path.join(explicitPagesDir, "scratch-page.json"),
      JSON.stringify({ uuid: "uuid-scratch", widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } } }),
    );

    const result = await refreshAllMediaUsageFromDir({
      projectId: PROJECT_ID,
      projectDir: explicitProjectDir,
    });
    assert.equal(result.success, true);

    const media = await readMediaJson();
    // scratch-page lives ONLY under the explicit dir, so this exact match fails if the
    // core ignored projectDir and read the folderName path (getProjectDir) instead.
    const hero = media.files.find((f) => f.id === IMG1);
    assert.deepEqual(hero.usedIn, ["page:uuid-scratch"]);
    const logo = media.files.find((f) => f.id === IMG2);
    assert.deepEqual(logo.usedIn, []);
  });
});
