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
 * All tests run for both userId="local" and userId="user_hosted_abc".
 *
 * Run with: node --test server/tests/mediaUsage.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
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
const { readMediaFile, writeMediaFile } = await import("../controllers/mediaController.js");

const {
  updatePageMediaUsage,
  updateGlobalWidgetMediaUsage,
  updateThemeSettingsMediaUsage,
  removePageFromMediaUsage,
  getMediaUsage,
  refreshAllMediaUsage,
} = await import("../services/mediaUsageService.js");
const { closeDb } = await import("../db/index.js");

const TEST_USER_IDS = ["local", "user_hosted_abc"];

// ============================================================================
// Global teardown (shared across all user ID iterations)
// ============================================================================

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Per-userId test suites
// ============================================================================

for (const TEST_USER_ID of TEST_USER_IDS) {
  describe(`[userId=${TEST_USER_ID}]`, () => {
    // ========================================================================
    // Test helpers (scoped to this userId)
    // ========================================================================

    const PROJECT_ID = `media-usage-test-uuid-${TEST_USER_ID}`;
    const PROJECT_FOLDER = `media-usage-test-project-${TEST_USER_ID}`;

    // Media file IDs must be unique per user because the media_files table
    // uses id as a global primary key (not scoped to project_id).
    const IMG1 = `img-1-${TEST_USER_ID}`;
    const IMG2 = `img-2-${TEST_USER_ID}`;
    const VID1 = `vid-1-${TEST_USER_ID}`;
    const AUD1 = `aud-1-${TEST_USER_ID}`;
    const IMG3 = `img-3-${TEST_USER_ID}`;

    /** Seed media data with test files */
    async function seedMediaJson(files) {
      await writeMediaFile(PROJECT_ID, { files }, TEST_USER_ID);
    }

    /** Read current media data */
    async function readMediaJson() {
      return readMediaFile(PROJECT_ID, TEST_USER_ID);
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
          id: VID1,
          filename: "intro.mp4",
          path: "/uploads/videos/intro.mp4",
          type: "video/mp4",
          usedIn: [],
        },
        {
          id: AUD1,
          filename: "podcast.mp3",
          path: "/uploads/audios/podcast.mp3",
          type: "audio/mpeg",
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

    // ========================================================================
    // Setup (scoped to this userId)
    // ========================================================================

    before(async () => {
      // Write projects.json
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
      }, TEST_USER_ID);

      // Create project directory structure
      const projectDir = getProjectDir(PROJECT_FOLDER, TEST_USER_ID);
      await fs.ensureDir(projectDir);
      await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER, TEST_USER_ID));
      await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER, TEST_USER_ID), "global"));
    });

    // ========================================================================
    // updatePageMediaUsage — extraction from page content
    // ========================================================================

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
        const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);
        assert.equal(result.success, true);
        assert.deepEqual(result.mediaPaths, ["/uploads/images/hero.jpg"]);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.deepEqual(hero.usedIn, ["home"]);
      });

      it("tracks video used in a widget setting", async () => {
        const pageData = {
          widgets: {
            widget_1: {
              settings: { video: "/uploads/videos/intro.mp4" },
            },
          },
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const video = media.files.find((f) => f.id === VID1);
        assert.deepEqual(video.usedIn, ["home"]);
      });

      it("tracks audio used in a widget setting", async () => {
        const pageData = {
          widgets: {
            widget_1: {
              settings: { audio: "/uploads/audios/podcast.mp3" },
            },
          },
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const audio = media.files.find((f) => f.id === AUD1);
        assert.deepEqual(audio.usedIn, ["home"]);
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
        await updatePageMediaUsage(PROJECT_ID, "about", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const banner = media.files.find((f) => f.id === IMG3);
        assert.deepEqual(banner.usedIn, ["about"]);
      });

      it("tracks SEO og_image", async () => {
        const pageData = {
          seo: { og_image: "/uploads/images/hero.jpg" },
          widgets: {},
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.deepEqual(hero.usedIn, ["home"]);
      });

      it("normalises og_image without leading slash", async () => {
        const pageData = {
          seo: { og_image: "uploads/images/hero.jpg" },
          widgets: {},
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.deepEqual(hero.usedIn, ["home"]);
      });

      it("tracks multiple media files from one page", async () => {
        const pageData = {
          seo: { og_image: "/uploads/images/hero.jpg" },
          widgets: {
            widget_1: {
              settings: { image: "/uploads/images/logo.png" },
              blocks: {
                block_1: {
                  settings: { video: "/uploads/videos/intro.mp4" },
                },
              },
            },
          },
        };
        const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);
        assert.equal(result.mediaPaths.length, 3);

        const media = await readMediaJson();
        assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["home"]);
        assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, ["home"]);
        assert.deepEqual(media.files.find((f) => f.id === VID1).usedIn, ["home"]);
      });

      it("deduplicates — same file used twice on same page", async () => {
        const pageData = {
          widgets: {
            widget_1: { settings: { image: "/uploads/images/hero.jpg" } },
            widget_2: { settings: { background: "/uploads/images/hero.jpg" } },
          },
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        // Should appear once, not twice
        assert.deepEqual(hero.usedIn, ["home"]);
      });

      it("removes stale usage when media is no longer referenced", async () => {
        // First save — hero is used
        const pageData1 = {
          widgets: {
            widget_1: { settings: { image: "/uploads/images/hero.jpg" } },
          },
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData1, TEST_USER_ID);

        // Second save — hero removed, logo added
        const pageData2 = {
          widgets: {
            widget_1: { settings: { image: "/uploads/images/logo.png" } },
          },
        };
        await updatePageMediaUsage(PROJECT_ID, "home", pageData2, TEST_USER_ID);

        const media = await readMediaJson();
        assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, []);
        assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, ["home"]);
      });

      it("handles page with no widgets", async () => {
        const pageData = { name: "Empty page" };
        const result = await updatePageMediaUsage(PROJECT_ID, "empty", pageData, TEST_USER_ID);
        assert.equal(result.success, true);
        assert.deepEqual(result.mediaPaths, []);
      });

      it("handles page with empty widgets object", async () => {
        const pageData = { widgets: {} };
        const result = await updatePageMediaUsage(PROJECT_ID, "empty", pageData, TEST_USER_ID);
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
        const result = await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);
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
        await updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID);

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
        await updatePageMediaUsage(PROJECT_ID, "home", page1, TEST_USER_ID);
        await updatePageMediaUsage(PROJECT_ID, "about", page2, TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.ok(hero.usedIn.includes("home"));
        assert.ok(hero.usedIn.includes("about"));
        assert.equal(hero.usedIn.length, 2);
      });
    });

    // ========================================================================
    // updateGlobalWidgetMediaUsage
    // ========================================================================

    describe("updateGlobalWidgetMediaUsage", () => {
      beforeEach(async () => {
        await seedMediaJson(defaultMediaFiles());
      });

      it("tracks media used in header widget settings", async () => {
        const headerData = {
          settings: { logo: "/uploads/images/logo.png" },
        };
        const result = await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", headerData, TEST_USER_ID);
        assert.equal(result.success, true);

        const media = await readMediaJson();
        const logo = media.files.find((f) => f.id === IMG2);
        assert.deepEqual(logo.usedIn, ["global:header"]);
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
        await updateGlobalWidgetMediaUsage(PROJECT_ID, "footer", footerData, TEST_USER_ID);

        const media = await readMediaJson();
        const banner = media.files.find((f) => f.id === IMG3);
        assert.deepEqual(banner.usedIn, ["global:footer"]);
      });

      it("normalises globalId — does not double-prefix 'global:'", async () => {
        const headerData = {
          settings: { logo: "/uploads/images/logo.png" },
        };
        await updateGlobalWidgetMediaUsage(PROJECT_ID, "global:header", headerData, TEST_USER_ID);

        const media = await readMediaJson();
        const logo = media.files.find((f) => f.id === IMG2);
        // Should be "global:header" not "global:global:header"
        assert.deepEqual(logo.usedIn, ["global:header"]);
      });

      it("removes stale global widget usage on re-save", async () => {
        // Header uses logo
        await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
          settings: { logo: "/uploads/images/logo.png" },
        }, TEST_USER_ID);
        // Header updated — logo removed, hero added
        await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
          settings: { background: "/uploads/images/hero.jpg" },
        }, TEST_USER_ID);

        const media = await readMediaJson();
        assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, []);
        assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["global:header"]);
      });

      it("page and global widget usage are independent", async () => {
        // Page uses hero
        await updatePageMediaUsage(PROJECT_ID, "home", {
          widgets: { w1: { settings: { image: "/uploads/images/hero.jpg" } } },
        }, TEST_USER_ID);
        // Header also uses hero
        await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
          settings: { bg: "/uploads/images/hero.jpg" },
        }, TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.ok(hero.usedIn.includes("home"));
        assert.ok(hero.usedIn.includes("global:header"));
        assert.equal(hero.usedIn.length, 2);
      });

      it("handles empty global widget data", async () => {
        const result = await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {}, TEST_USER_ID);
        assert.equal(result.success, true);
        assert.deepEqual(result.mediaPaths, []);
      });
    });

    // ========================================================================
    // updateThemeSettingsMediaUsage
    // ========================================================================

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
        const result = await updateThemeSettingsMediaUsage(PROJECT_ID, themeData, TEST_USER_ID);
        assert.equal(result.success, true);
        assert.deepEqual(result.mediaPaths, ["/uploads/images/hero.jpg"]);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.deepEqual(hero.usedIn, ["global:theme-settings"]);
      });

      it("removes stale theme settings usage on re-save", async () => {
        await updateThemeSettingsMediaUsage(PROJECT_ID, {
          settings: { global: { branding: [{ id: "favicon", value: "/uploads/images/logo.png" }] } },
        }, TEST_USER_ID);
        await updateThemeSettingsMediaUsage(PROJECT_ID, {
          settings: { global: { branding: [{ id: "favicon", value: "" }] } },
        }, TEST_USER_ID);

        const media = await readMediaJson();
        const logo = media.files.find((f) => f.id === IMG2);
        assert.ok(!logo.usedIn.includes("global:theme-settings"));
      });

      it("handles empty or missing theme data", async () => {
        const result = await updateThemeSettingsMediaUsage(PROJECT_ID, {}, TEST_USER_ID);
        assert.equal(result.success, true);
        assert.deepEqual(result.mediaPaths, []);
      });
    });

    // ========================================================================
    // removePageFromMediaUsage
    // ========================================================================

    describe("removePageFromMediaUsage", () => {
      beforeEach(async () => {
        // Seed with some pre-existing usage
        const files = defaultMediaFiles();
        files[0].usedIn = ["home", "about"]; // hero used on two pages
        files[1].usedIn = ["home"]; // logo used on home
        files[2].usedIn = ["about"]; // intro used on about
        await seedMediaJson(files);
      });

      it("removes a page from all usedIn arrays", async () => {
        const result = await removePageFromMediaUsage(PROJECT_ID, "home", TEST_USER_ID);
        assert.equal(result.success, true);

        const media = await readMediaJson();
        assert.deepEqual(media.files.find((f) => f.id === IMG1).usedIn, ["about"]);
        assert.deepEqual(media.files.find((f) => f.id === IMG2).usedIn, []);
        assert.deepEqual(media.files.find((f) => f.id === VID1).usedIn, ["about"]);
      });

      it("does not affect other pages' usage", async () => {
        await removePageFromMediaUsage(PROJECT_ID, "home", TEST_USER_ID);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.ok(hero.usedIn.includes("about"));
      });

      it("is a no-op if page has no usage", async () => {
        const result = await removePageFromMediaUsage(PROJECT_ID, "nonexistent-page", TEST_USER_ID);
        assert.equal(result.success, true);

        // Nothing should change
        const media = await readMediaJson();
        assert.deepEqual([...media.files.find((f) => f.id === IMG1).usedIn].sort(), ["about", "home"]);
      });
    });

    // ========================================================================
    // getMediaUsage
    // ========================================================================

    describe("getMediaUsage", () => {
      before(async () => {
        const files = defaultMediaFiles();
        files[0].usedIn = ["home", "about", "global:header"];
        files[1].usedIn = [];
        await seedMediaJson(files);
      });

      it("returns usage details for a media file in use", async () => {
        const usage = await getMediaUsage(PROJECT_ID, IMG1, TEST_USER_ID);
        assert.equal(usage.fileId, IMG1);
        assert.equal(usage.filename, "hero.jpg");
        assert.deepEqual([...usage.usedIn].sort(), ["about", "global:header", "home"]);
        assert.equal(usage.isInUse, true);
      });

      it("returns isInUse: false for unused media", async () => {
        const usage = await getMediaUsage(PROJECT_ID, IMG2, TEST_USER_ID);
        assert.equal(usage.isInUse, false);
        assert.deepEqual(usage.usedIn, []);
      });

      it("throws for non-existent file ID", async () => {
        await assert.rejects(
          () => getMediaUsage(PROJECT_ID, "no-such-file", TEST_USER_ID),
          (err) => {
            assert.match(err.message, /not found/i);
            return true;
          },
        );
      });
    });

    // ========================================================================
    // refreshAllMediaUsage
    // ========================================================================

    describe("refreshAllMediaUsage", () => {
      beforeEach(async () => {
        // Seed media.json with stale/wrong usage data
        const files = defaultMediaFiles();
        files[0].usedIn = ["deleted-page", "ghost"]; // stale
        files[1].usedIn = ["home"]; // will be verified
        await seedMediaJson(files);

        // Create actual page files on disk
        const pagesDir = getProjectPagesDir(PROJECT_FOLDER, TEST_USER_ID);
        await fs.ensureDir(pagesDir);

        // home.json — uses hero and logo
        await fs.writeFile(
          path.join(pagesDir, "home.json"),
          JSON.stringify({
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
        const themeJsonPath = getProjectThemeJsonPath(PROJECT_FOLDER, TEST_USER_ID);
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
        const result = await refreshAllMediaUsage(PROJECT_ID, TEST_USER_ID);
        assert.equal(result.success, true);

        const media = await readMediaJson();

        // hero: home (seo) + global:footer
        const hero = media.files.find((f) => f.id === IMG1);
        assert.ok(hero.usedIn.includes("home"), "hero should be used on home");
        assert.ok(hero.usedIn.includes("global:footer"), "hero should be used in footer");
        assert.ok(!hero.usedIn.includes("deleted-page"), "stale usage should be removed");
        assert.ok(!hero.usedIn.includes("ghost"), "stale usage should be removed");

        // logo: home (widget) + global:header + global:theme-settings (favicon)
        const logo = media.files.find((f) => f.id === IMG2);
        assert.ok(logo.usedIn.includes("home"));
        assert.ok(logo.usedIn.includes("global:header"));
        assert.ok(logo.usedIn.includes("global:theme-settings"), "favicon in theme settings should be tracked");

        // banner: about
        const banner = media.files.find((f) => f.id === IMG3);
        assert.deepEqual(banner.usedIn, ["about"]);

        // video and audio: not used anywhere
        assert.deepEqual(media.files.find((f) => f.id === VID1).usedIn, []);
        assert.deepEqual(media.files.find((f) => f.id === AUD1).usedIn, []);
      });

      it("clears stale usage from deleted pages", async () => {
        const result = await refreshAllMediaUsage(PROJECT_ID, TEST_USER_ID);
        assert.equal(result.success, true);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        assert.ok(!hero.usedIn.includes("deleted-page"));
        assert.ok(!hero.usedIn.includes("ghost"));
      });

      it("returns message with page count", async () => {
        const result = await refreshAllMediaUsage(PROJECT_ID, TEST_USER_ID);
        assert.match(result.message, /2 pages/); // home.json + about.json
      });

      it("handles project with no pages directory", async () => {
        // Temporarily move pages dir out of the way
        const pagesDir = getProjectPagesDir(PROJECT_FOLDER, TEST_USER_ID);
        const backupDir = pagesDir + ".backup";
        await fs.move(pagesDir, backupDir);

        try {
          const result = await refreshAllMediaUsage(PROJECT_ID, TEST_USER_ID);
          assert.equal(result.success, true);
          assert.match(result.message, /no pages directory/i);
        } finally {
          await fs.move(backupDir, pagesDir);
        }
      });
    });

    // ========================================================================
    // Concurrent / race-condition safety
    // ========================================================================

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
          updatePageMediaUsage(PROJECT_ID, "home", page1, TEST_USER_ID),
          updatePageMediaUsage(PROJECT_ID, "about", page2, TEST_USER_ID),
        ]);

        const media = await readMediaJson();
        const hero = media.files.find((f) => f.id === IMG1);
        // Both pages should be tracked — neither should be lost
        assert.ok(hero.usedIn.includes("home"), "home should be tracked");
        assert.ok(hero.usedIn.includes("about"), "about should be tracked");
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
          updatePageMediaUsage(PROJECT_ID, "home", pageData, TEST_USER_ID),
          updateGlobalWidgetMediaUsage(PROJECT_ID, "header", headerData, TEST_USER_ID),
        ]);

        const media = await readMediaJson();
        const logo = media.files.find((f) => f.id === IMG2);
        assert.ok(logo.usedIn.includes("home"), "page usage should be tracked");
        assert.ok(logo.usedIn.includes("global:header"), "global usage should be tracked");
        assert.equal(logo.usedIn.length, 2);
      });
    });
  });
}
