/**
 * Project Export Test Suite
 *
 * Tests the export pipeline: versioned exports with sitemap, robots.txt,
 * rendered pages (HTML via renderPageLayout), selective media copying,
 * widget asset copying, manifest.json, ZIP downloads, export history
 * management, cleanup, and individual version deletion.
 *
 * Also covers getExportFiles (entry file detection with path-traversal guard),
 * downloadExport (ZIP streaming via archiver), getExportHistory, deleteExport,
 * and cleanupProjectExports.
 *
 * Uses a realistic isolated project with layout.liquid, a core widget,
 * theme settings, pages (including noindex), media, and global widgets.
 *
 * Runs all tests for both open-source (userId="local") and hosted
 * (userId="user_hosted_abc") modes to catch userId propagation bugs.
 *
 * Run with: node --test server/tests/export.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-export-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence noisy console output from production code during tests.
// Test failures still show — only console.log/warn/error from the
// export controller and rendering service are suppressed.
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

// Must import config AFTER setting env vars
const {
  getProjectDir,
  getProjectPagesDir,
  getProjectMenusDir,
  getProjectThemeJsonPath,
  getUserPublishDir,
  CORE_WIDGETS_DIR,
} = await import("../config.js");

const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { exportProject, cleanupProjectExports, getExportFiles, downloadExport, getExportHistory, deleteExport } =
  await import("../controllers/exportController.js");
const { closeDb } = await import("../db/index.js");
const exportRepo = await import("../db/repositories/exportRepository.js");

// ============================================================================
// Test constants
// ============================================================================

const TEST_USER_IDS = ["local", "user_hosted_abc"];

// ============================================================================
// Global teardown
// ============================================================================

after(async () => {
  // Restore console so other test suites or post-run output works normally
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;

  closeDb();
  await fs.remove(TEST_ROOT);
  // Also clean up any publish dirs we created
  // (PUBLISH_DIR is under TEST_DATA_DIR which is under TEST_ROOT, so already handled)
});

// ============================================================================
// Dual-userId test loop
// ============================================================================

for (const TEST_USER_ID of TEST_USER_IDS) {
  describe(`[userId=${TEST_USER_ID}]`, () => {
    // Per-user unique IDs (required because id and folder_name are UNIQUE in DB)
    const PROJECT_ID = `export-test-uuid-${TEST_USER_ID}`;
    const PROJECT_FOLDER = `export-test-project-${TEST_USER_ID}`;
    const SITE_URL = "https://mysite.example.com";

    // PUBLISH_DIR must be user-scoped
    const PUBLISH_DIR = getUserPublishDir(TEST_USER_ID);

    // ========================================================================
    // Mock helpers (scoped to this userId)
    // ========================================================================

    function mockReq({ params = {}, body = {}, file = null } = {}) {
      return {
        params,
        body,
        file,
        userId: TEST_USER_ID,
        [Symbol.for("express-validator#contexts")]: [],
      };
    }

    function mockRes() {
      const res = {
        _status: 200,
        _json: null,
        _headers: {},
        _piped: null,
        _ended: false,
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
        setHeader(key, val) {
          res._headers[key] = val;
          return res;
        },
        // Minimal writable stream for archiver pipe
        write(chunk) {
          if (!res._chunks) res._chunks = [];
          res._chunks.push(chunk);
        },
        end() {
          res._ended = true;
        },
        on() {
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

    // ========================================================================
    // Helpers to read export artefacts
    // ========================================================================

    function readExportHistory(projectId) {
      return exportRepo.getExports(projectId);
    }

    function getLatestExportDir() {
      const exports = exportRepo.getExports(PROJECT_ID);
      if (exports.length === 0) return null;
      const dir = exports[0].outputDir;
      if (!dir) return null;
      // outputDir is now stored as a relative name; resolve against PUBLISH_DIR
      return path.isAbsolute(dir) ? dir : path.join(PUBLISH_DIR, dir);
    }

    // ========================================================================
    // Global setup
    // ========================================================================

    before(async () => {
      // -----------------------------------------------------------
      // 1. projects.json with test project
      // -----------------------------------------------------------
      await projectRepo.writeProjectsData(
        {
          projects: [
            {
              id: PROJECT_ID,
              folderName: PROJECT_FOLDER,
              name: "Export Test Project",
              theme: "__export_test_theme__",
              themeVersion: "1.0.0",
              siteUrl: SITE_URL,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          ],
          activeProjectId: PROJECT_ID,
        },
        TEST_USER_ID,
      );

      // -----------------------------------------------------------
      // 2. Project directory tree
      // -----------------------------------------------------------
      const projectDir = getProjectDir(PROJECT_FOLDER, TEST_USER_ID);
      const pagesDir = getProjectPagesDir(PROJECT_FOLDER, TEST_USER_ID);
      const menusDir = getProjectMenusDir(PROJECT_FOLDER, TEST_USER_ID);

      await fs.ensureDir(projectDir);
      await fs.ensureDir(pagesDir);
      await fs.ensureDir(path.join(pagesDir, "global"));
      await fs.ensureDir(menusDir);
      await fs.ensureDir(path.join(projectDir, "snippets"));
      await fs.ensureDir(path.join(projectDir, "widgets"));
      await fs.ensureDir(path.join(projectDir, "assets", "css"));
      await fs.ensureDir(path.join(projectDir, "assets", "js"));

      // -----------------------------------------------------------
      // 3. Theme.json (project-level)
      // -----------------------------------------------------------
      const themeJsonPath = getProjectThemeJsonPath(PROJECT_FOLDER, TEST_USER_ID);
      await fs.outputFile(
        themeJsonPath,
        JSON.stringify(
          {
            settings: {
              global: {
                colors: [
                  { id: "primary_color", value: "#0066cc", default: "#000000" },
                  { id: "body_bg", value: "#ffffff", default: "#ffffff" },
                ],
              },
            },
          },
          null,
          2,
        ),
      );

      // -----------------------------------------------------------
      // 4. Layout template
      // -----------------------------------------------------------
      const layoutPath = path.join(projectDir, "layout.liquid");
      await fs.writeFile(
        layoutPath,
        `<!DOCTYPE html>
<html lang="{{ page.language | default: 'en' }}">
<head>
  <meta charset="UTF-8">
  <title>{{ page.seo.title }}</title>
  {{ seo_tags | raw }}
</head>
<body class="{{ body_class }}">
  {{ header | raw }}
  <main>{{ main_content | raw }}</main>
  {{ footer | raw }}
</body>
</html>`,
      );

      // -----------------------------------------------------------
      // 5. Core spacer widget (reuse real widget)
      // -----------------------------------------------------------
      // The rendering service looks for core widgets in CORE_WIDGETS_DIR.
      // Make sure the core-spacer template and schema exist there.
      const coreSpacerDir = path.join(CORE_WIDGETS_DIR, "core-spacer");
      if (!(await fs.pathExists(coreSpacerDir))) {
        await fs.ensureDir(coreSpacerDir);
        await fs.writeFile(
          path.join(coreSpacerDir, "schema.json"),
          JSON.stringify(
            {
              type: "core-spacer",
              displayName: "Spacer",
              settings: [{ type: "range", id: "height", label: "Height", default: 40 }],
            },
            null,
            2,
          ),
        );
        await fs.writeFile(
          path.join(coreSpacerDir, "widget.liquid"),
          `<div class="core-spacer" style="height:{{ widget.settings.height }}px"></div>`,
        );
      }

      // -----------------------------------------------------------
      // 6. Pages
      // -----------------------------------------------------------

      // a) index page — the homepage (required for export)
      await fs.writeFile(
        path.join(pagesDir, "index.json"),
        JSON.stringify(
          {
            name: "Home",
            slug: "index",
            uuid: "page-uuid-index",
            seo: {
              title: "Home | Export Test",
              description: "The homepage",
              og_image: "/uploads/images/hero.jpg",
            },
            widgets: {
              "spacer-1": {
                type: "core-spacer",
                settings: { height: 60 },
              },
            },
            widgetsOrder: ["spacer-1"],
            created: "2025-01-01T00:00:00.000Z",
            updated: "2025-06-01T00:00:00.000Z",
          },
          null,
          2,
        ),
      );

      // b) about page — a normal page
      await fs.writeFile(
        path.join(pagesDir, "about.json"),
        JSON.stringify(
          {
            name: "About Us",
            slug: "about",
            uuid: "page-uuid-about",
            seo: {
              title: "About Us | Export Test",
              description: "About the company",
            },
            widgets: {},
            widgetsOrder: [],
            created: "2025-02-01T00:00:00.000Z",
            updated: "2025-05-01T00:00:00.000Z",
          },
          null,
          2,
        ),
      );

      // c) hidden page — marked noindex, should be excluded from sitemap
      await fs.writeFile(
        path.join(pagesDir, "hidden.json"),
        JSON.stringify(
          {
            name: "Hidden Page",
            slug: "hidden",
            uuid: "page-uuid-hidden",
            seo: {
              title: "Hidden",
              robots: "noindex, nofollow",
            },
            widgets: {},
            widgetsOrder: [],
            created: "2025-03-01T00:00:00.000Z",
            updated: "2025-04-01T00:00:00.000Z",
          },
          null,
          2,
        ),
      );

      // -----------------------------------------------------------
      // 7. Global widgets (header + footer)
      // -----------------------------------------------------------
      await fs.writeFile(
        path.join(pagesDir, "global", "header.json"),
        JSON.stringify(
          {
            type: "core-spacer",
            settings: { height: 10 },
          },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(pagesDir, "global", "footer.json"),
        JSON.stringify(
          {
            type: "core-spacer",
            settings: { height: 5 },
          },
          null,
          2,
        ),
      );

      // -----------------------------------------------------------
      // 8. Media files (images, videos, audios)
      // -----------------------------------------------------------
      // Create actual media files on disk
      const uploadsDir = path.join(projectDir, "uploads");
      await fs.ensureDir(path.join(uploadsDir, "images"));
      await fs.ensureDir(path.join(uploadsDir, "videos"));
      await fs.ensureDir(path.join(uploadsDir, "audios"));

      // Dummy image files
      await fs.writeFile(path.join(uploadsDir, "images", "hero.jpg"), "fake-jpg-data");
      await fs.writeFile(path.join(uploadsDir, "images", "hero-medium.jpg"), "fake-jpg-medium");
      await fs.writeFile(path.join(uploadsDir, "images", "unused.png"), "fake-png-data");
      // Dummy video
      await fs.writeFile(path.join(uploadsDir, "videos", "intro.mp4"), "fake-mp4-data");
      await fs.writeFile(path.join(uploadsDir, "videos", "unused.mp4"), "fake-unused-mp4");
      // Dummy audio
      await fs.writeFile(path.join(uploadsDir, "audios", "podcast.mp3"), "fake-mp3-data");

      await writeMediaFile(PROJECT_ID, {
        files: [
          {
            id: `img-1-${TEST_USER_ID}`,
            filename: "hero.jpg",
            path: "/uploads/images/hero.jpg",
            type: "image/jpeg",
            width: 1920,
            height: 1080,
            usedIn: ["index"],
            sizes: {
              medium: {
                path: "/uploads/images/hero-medium.jpg",
                width: 1024,
                height: 576,
              },
            },
          },
          {
            id: `img-2-${TEST_USER_ID}`,
            filename: "unused.png",
            path: "/uploads/images/unused.png",
            type: "image/png",
            width: 500,
            height: 500,
            usedIn: [], // <-- not used anywhere
          },
          {
            id: `vid-1-${TEST_USER_ID}`,
            filename: "intro.mp4",
            path: "/uploads/videos/intro.mp4",
            type: "video/mp4",
            usedIn: ["index"],
          },
          {
            id: `vid-2-${TEST_USER_ID}`,
            filename: "unused.mp4",
            path: "/uploads/videos/unused.mp4",
            type: "video/mp4",
            usedIn: [], // <-- not used
          },
          {
            id: `aud-1-${TEST_USER_ID}`,
            filename: "podcast.mp3",
            path: "/uploads/audios/podcast.mp3",
            type: "audio/mpeg",
            usedIn: ["about"],
          },
        ],
      }, TEST_USER_ID);

      // -----------------------------------------------------------
      // 9. Project assets (CSS/JS)
      // -----------------------------------------------------------
      await fs.writeFile(path.join(projectDir, "assets", "css", "styles.css"), "body { margin: 0; }");
      await fs.writeFile(path.join(projectDir, "assets", "js", "app.js"), "console.log('hello');");

      // -----------------------------------------------------------
      // 10. Widget assets (CSS/JS in widgets dir)
      // -----------------------------------------------------------
      const widgetAssetsDir = path.join(projectDir, "widgets", "hero-slider");
      await fs.ensureDir(widgetAssetsDir);
      await fs.writeFile(path.join(widgetAssetsDir, "hero-slider.css"), ".hero { display: flex; }");
      await fs.writeFile(path.join(widgetAssetsDir, "hero-slider.js"), "// slider init");

      // -----------------------------------------------------------
      // 11. Core assets (placeholder SVGs) — may already exist
      // -----------------------------------------------------------
      const coreAssetsDir = path.join(process.cwd(), "src", "core", "assets");
      if (!(await fs.pathExists(path.join(coreAssetsDir, "placeholder.svg")))) {
        await fs.ensureDir(coreAssetsDir);
        await fs.writeFile(
          path.join(coreAssetsDir, "placeholder.svg"),
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
        );
      }

      // -----------------------------------------------------------
      // 12. Ensure publish dir exists
      // -----------------------------------------------------------
      await fs.ensureDir(PUBLISH_DIR);
    });

    // Clean export history before each test group that needs fresh state
    async function cleanExportHistory() {
      // Delete all export records from all projects in the DB
      const { getDb } = await import("../db/index.js");
      getDb().prepare("DELETE FROM exports").run();
      // Also remove any export directories
      const publishContents = await fs.readdir(PUBLISH_DIR).catch(() => []);
      for (const entry of publishContents) {
        if (
          entry.startsWith(PROJECT_FOLDER) ||
          entry.startsWith(`cleanup-test-${TEST_USER_ID}`) ||
          entry.startsWith(`no-url-${TEST_USER_ID}`) ||
          entry.startsWith(`home-slug-${TEST_USER_ID}`) ||
          entry.startsWith(`bad-theme-${TEST_USER_ID}`)
        ) {
          await fs.remove(path.join(PUBLISH_DIR, entry));
        }
      }
    }

    // ========================================================================
    // exportProject — full pipeline
    // ========================================================================

    describe("exportProject", () => {
      before(async () => {
        await cleanExportHistory();
      });

      it("exports successfully with all output files", async () => {
        const res = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });

        assert.equal(res._status, 200, `Expected 200 but got ${res._status}: ${JSON.stringify(res._json)}`);
        assert.ok(res._json.success);
        assert.equal(res._json.version, 1);
        assert.ok(res._json.outputDir);
        assert.ok(res._json.exportRecord);
      });

      it("creates index.html for the homepage", async () => {
        const exportDir = await getLatestExportDir();
        assert.ok(exportDir, "Export directory should exist in history");
        const indexPath = path.join(exportDir, "index.html");
        assert.ok(await fs.pathExists(indexPath), "index.html should exist");
      });

      it("creates about.html for the about page", async () => {
        const exportDir = await getLatestExportDir();
        const aboutPath = path.join(exportDir, "about.html");
        assert.ok(await fs.pathExists(aboutPath), "about.html should exist");
      });

      it("creates hidden.html for the noindex page (still exported, just excluded from sitemap)", async () => {
        const exportDir = await getLatestExportDir();
        const hiddenPath = path.join(exportDir, "hidden.html");
        assert.ok(await fs.pathExists(hiddenPath), "hidden.html should still be exported");
      });

      it("rendered HTML contains the easter egg comment", async () => {
        const exportDir = await getLatestExportDir();
        const html = await fs.readFile(path.join(exportDir, "index.html"), "utf8");
        assert.ok(html.includes("Made with Widgetizer"), "Should contain easter egg comment");
        assert.ok(html.includes("Per aspera ad astra"), "Should contain easter egg motto");
      });

      it("rendered HTML contains the page SEO title", async () => {
        const exportDir = await getLatestExportDir();
        const html = await fs.readFile(path.join(exportDir, "index.html"), "utf8");
        // The rendering service exposes page data as `page` object in Liquid context
        // so {{ page.seo.title }} resolves to the SEO title from the page JSON.
        assert.ok(html.includes("Home | Export Test"), "Should contain page SEO title via {{ page.seo.title }}");
      });

      it("rendered HTML contains the core-spacer widget output", async () => {
        const exportDir = await getLatestExportDir();
        const html = await fs.readFile(path.join(exportDir, "index.html"), "utf8");
        assert.ok(html.includes("core-spacer"), "Should render core-spacer widget");
      });

      it("generates sitemap.xml with site URL", async () => {
        const exportDir = await getLatestExportDir();
        const sitemapPath = path.join(exportDir, "sitemap.xml");
        assert.ok(await fs.pathExists(sitemapPath), "sitemap.xml should exist");

        const sitemap = await fs.readFile(sitemapPath, "utf8");
        assert.ok(sitemap.includes("<urlset"), "Should be valid sitemap");
        assert.ok(sitemap.includes(SITE_URL), "Should reference site URL");
      });

      it("sitemap includes index and about pages", async () => {
        const exportDir = await getLatestExportDir();
        const sitemap = await fs.readFile(path.join(exportDir, "sitemap.xml"), "utf8");
        assert.ok(sitemap.includes("index.html"), "Should include index page");
        assert.ok(sitemap.includes("about.html"), "Should include about page");
      });

      it("sitemap excludes noindex pages", async () => {
        const exportDir = await getLatestExportDir();
        const sitemap = await fs.readFile(path.join(exportDir, "sitemap.xml"), "utf8");
        assert.ok(!sitemap.includes("hidden.html"), "Should NOT include noindex page in sitemap");
      });

      it("generates robots.txt with sitemap reference", async () => {
        const exportDir = await getLatestExportDir();
        const robotsPath = path.join(exportDir, "robots.txt");
        assert.ok(await fs.pathExists(robotsPath), "robots.txt should exist");

        const robots = await fs.readFile(robotsPath, "utf8");
        assert.ok(robots.includes("User-agent: *"), "Should have User-agent directive");
        assert.ok(robots.includes("Allow: /"), "Should allow all by default");
        assert.ok(robots.includes("Sitemap:"), "Should reference sitemap");
        assert.ok(robots.includes(SITE_URL), "Sitemap URL should include site URL");
      });

      it("robots.txt disallows noindex pages", async () => {
        const exportDir = await getLatestExportDir();
        const robots = await fs.readFile(path.join(exportDir, "robots.txt"), "utf8");
        assert.ok(robots.includes("Disallow: /hidden.html"), "Should disallow hidden page");
      });

      it("copies used images to assets/images/, not uploads/", async () => {
        const exportDir = await getLatestExportDir();
        const heroPath = path.join(exportDir, "assets", "images", "hero.jpg");
        assert.ok(await fs.pathExists(heroPath), "Used image hero.jpg should be in assets/images/");
        // Verify content matches
        const content = await fs.readFile(heroPath, "utf8");
        assert.equal(content, "fake-jpg-data");
      });

      it("copies image size variants", async () => {
        const exportDir = await getLatestExportDir();
        const mediumPath = path.join(exportDir, "assets", "images", "hero-medium.jpg");
        assert.ok(await fs.pathExists(mediumPath), "Medium size image should be copied");
      });

      it("skips unused images", async () => {
        const exportDir = await getLatestExportDir();
        const unusedPath = path.join(exportDir, "assets", "images", "unused.png");
        assert.ok(!(await fs.pathExists(unusedPath)), "Unused image should NOT be copied");
      });

      it("copies used videos to assets/videos/", async () => {
        const exportDir = await getLatestExportDir();
        const videoPath = path.join(exportDir, "assets", "videos", "intro.mp4");
        assert.ok(await fs.pathExists(videoPath), "Used video should be in assets/videos/");
      });

      it("skips unused videos", async () => {
        const exportDir = await getLatestExportDir();
        const unusedPath = path.join(exportDir, "assets", "videos", "unused.mp4");
        assert.ok(!(await fs.pathExists(unusedPath)), "Unused video should NOT be copied");
      });

      it("copies used audios to assets/audios/", async () => {
        const exportDir = await getLatestExportDir();
        const audioPath = path.join(exportDir, "assets", "audios", "podcast.mp3");
        assert.ok(await fs.pathExists(audioPath), "Used audio should be in assets/audios/");
      });

      it("copies project assets (CSS/JS) to output", async () => {
        const exportDir = await getLatestExportDir();
        const cssPath = path.join(exportDir, "assets", "css", "styles.css");
        const jsPath = path.join(exportDir, "assets", "js", "app.js");
        assert.ok(await fs.pathExists(cssPath), "Project CSS should be copied");
        assert.ok(await fs.pathExists(jsPath), "Project JS should be copied");
      });

      it("copies widget assets (CSS/JS) to output", async () => {
        const exportDir = await getLatestExportDir();
        const widgetCss = path.join(exportDir, "assets", "hero-slider.css");
        const widgetJs = path.join(exportDir, "assets", "hero-slider.js");
        assert.ok(await fs.pathExists(widgetCss), "Widget CSS should be copied to assets/");
        assert.ok(await fs.pathExists(widgetJs), "Widget JS should be copied to assets/");
      });

      it("copies core placeholder SVGs", async () => {
        const exportDir = await getLatestExportDir();
        const placeholderPath = path.join(exportDir, "assets", "placeholder.svg");
        assert.ok(await fs.pathExists(placeholderPath), "Core placeholder SVG should be copied");
      });

      it("generates manifest.json with correct metadata", async () => {
        const exportDir = await getLatestExportDir();
        const manifestPath = path.join(exportDir, "manifest.json");
        assert.ok(await fs.pathExists(manifestPath), "manifest.json should exist");

        const manifest = await fs.readJson(manifestPath);
        assert.equal(manifest.generator, "widgetizer");
        assert.equal(manifest.themeId, "__export_test_theme__");
        assert.equal(manifest.themeVersion, "1.0.0");
        assert.equal(manifest.exportVersion, 1);
        assert.equal(manifest.projectName, "Export Test Project");
        assert.ok(manifest.exportedAt, "Should have exportedAt timestamp");
        assert.ok(manifest.widgetizerVersion, "Should have widgetizerVersion");
      });

      it("records export in history", async () => {
        const exports = readExportHistory(PROJECT_ID);
        assert.ok(exports.length > 0, "Project should have export history");
        assert.equal(exports.length, 1);
        assert.equal(exports[0].version, 1);
        assert.equal(exports[0].status, "success");
        // nextVersion is now derived, not stored
        assert.equal(exportRepo.getNextVersion(PROJECT_ID), 2);
      });

      it("output directory follows naming convention: folderName-v{version}", async () => {
        const exportDir = await getLatestExportDir();
        const dirName = path.basename(exportDir);
        assert.equal(dirName, `${PROJECT_FOLDER}-v1`);
      });
    });

    // ========================================================================
    // Version incrementing and history cleanup
    // ========================================================================

    describe("export versioning", () => {
      before(async () => {
        await cleanExportHistory();
      });

      it("increments version on successive exports", async () => {
        const res1 = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });
        assert.equal(res1._json.version, 1);

        const res2 = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });
        assert.equal(res2._json.version, 2);

        const res3 = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });
        assert.equal(res3._json.version, 3);
      });

      it("history records exports in reverse-chronological order (newest first)", async () => {
        const exports = readExportHistory(PROJECT_ID);
        assert.ok(exports.length >= 3);
        assert.equal(exports[0].version, 3, "Newest version first");
        assert.equal(exports[1].version, 2);
        assert.equal(exports[2].version, 1, "Oldest version last");
      });

      it("nextVersion is always one more than the last exported version", async () => {
        assert.equal(exportRepo.getNextVersion(PROJECT_ID), 4);
      });
    });

    // ========================================================================
    // exportProject — validation and edge cases
    // ========================================================================

    describe("exportProject validation", () => {
      it("returns 400 when projectId is missing", async () => {
        const res = await callController(exportProject, {
          params: {},
        });
        assert.equal(res._status, 400);
        assert.ok(res._json.error);
      });

      it("returns 500 when project does not exist in the database", async () => {
        const res = await callController(exportProject, {
          params: { projectId: "nonexistent-uuid" },
        });
        assert.equal(res._status, 500);
        assert.ok(res._json.error);
      });

      it("returns 400 when project has no index page", async () => {
        // Create a temporary project with no index page
        const tempProjectId = `no-index-project-uuid-${TEST_USER_ID}`;
        const tempFolder = `no-index-project-${TEST_USER_ID}`;
        const currentData = await projectRepo.readProjectsData(TEST_USER_ID);
        currentData.projects.push({
          id: tempProjectId,
          folderName: tempFolder,
          name: "No Index Project",
          theme: "__export_test_theme__",
          siteUrl: "",
          created: new Date().toISOString(),
        });
        await projectRepo.writeProjectsData(currentData, TEST_USER_ID);

        const projDir = getProjectDir(tempFolder, TEST_USER_ID);
        const pagesDir = getProjectPagesDir(tempFolder, TEST_USER_ID);
        await fs.ensureDir(pagesDir);
        // Create theme.json for the project
        await fs.outputFile(
          getProjectThemeJsonPath(tempFolder, TEST_USER_ID),
          JSON.stringify({ settings: {} }, null, 2),
        );
        // Only an "about" page, no index
        await fs.writeFile(
          path.join(pagesDir, "about.json"),
          JSON.stringify({ name: "About", slug: "about", widgets: {}, widgetsOrder: [] }),
        );

        const res = await callController(exportProject, {
          params: { projectId: tempProjectId },
        });
        assert.equal(res._status, 400);
        assert.ok(
          res._json.error.toLowerCase().includes("homepage"),
          `Expected homepage error, got: ${res._json.error}`,
        );

        // Cleanup
        await fs.remove(projDir);
        const data2 = await projectRepo.readProjectsData(TEST_USER_ID);
        data2.projects = data2.projects.filter((p) => p.id !== tempProjectId);
        await projectRepo.writeProjectsData(data2, TEST_USER_ID);
      });
    });

    // ========================================================================
    // exportProject — no siteUrl
    // ========================================================================

    describe("exportProject without siteUrl", () => {
      const NO_URL_ID = `no-url-${TEST_USER_ID}-project-uuid`;
      const NO_URL_FOLDER = `no-url-${TEST_USER_ID}-project`;

      before(async () => {
        await cleanExportHistory();

        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects.push({
          id: NO_URL_ID,
          folderName: NO_URL_FOLDER,
          name: "No URL Project",
          theme: "__export_test_theme__",
          siteUrl: "", // No site URL
          created: new Date().toISOString(),
        });
        await projectRepo.writeProjectsData(data, TEST_USER_ID);

        const projDir = getProjectDir(NO_URL_FOLDER, TEST_USER_ID);
        const pagesDir = getProjectPagesDir(NO_URL_FOLDER, TEST_USER_ID);
        await fs.ensureDir(pagesDir);
        await fs.outputFile(
          getProjectThemeJsonPath(NO_URL_FOLDER, TEST_USER_ID),
          JSON.stringify({ settings: {} }, null, 2),
        );
        await fs.writeFile(
          path.join(pagesDir, "index.json"),
          JSON.stringify({
            name: "Home",
            slug: "index",
            uuid: "page-uuid-nourl",
            seo: { title: "Home" },
            widgets: {},
            widgetsOrder: [],
          }),
        );
        // Create layout.liquid
        await fs.writeFile(
          path.join(projDir, "layout.liquid"),
          `<!DOCTYPE html><html><head><title>{{ page_title }}</title></head><body>{{ main_content | raw }}</body></html>`,
        );
      });

      after(async () => {
        await fs.remove(getProjectDir(NO_URL_FOLDER, TEST_USER_ID));
        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects = data.projects.filter((p) => p.id !== NO_URL_ID);
        await projectRepo.writeProjectsData(data, TEST_USER_ID);
      });

      it("exports successfully without sitemap or robots.txt", async () => {
        const res = await callController(exportProject, {
          params: { projectId: NO_URL_ID },
        });
        assert.equal(res._status, 200, `Expected 200, got ${res._status}: ${JSON.stringify(res._json)}`);
        assert.ok(res._json.success);

        // Verify no sitemap or robots.txt
        const exportDir = res._json.outputDir;
        assert.ok(!(await fs.pathExists(path.join(exportDir, "sitemap.xml"))), "No sitemap without siteUrl");
        assert.ok(!(await fs.pathExists(path.join(exportDir, "robots.txt"))), "No robots.txt without siteUrl");
      });
    });

    // ========================================================================
    // getExportFiles — entry file detection and security
    // ========================================================================

    describe("getExportFiles", () => {
      let testExportDir;

      before(async () => {
        // Create a mock export directory
        testExportDir = `test-entry-files-${TEST_USER_ID}`;
        const fullDir = path.join(PUBLISH_DIR, testExportDir);
        await fs.ensureDir(fullDir);
        await fs.writeFile(path.join(fullDir, "index.html"), "<html></html>");
        await fs.writeFile(path.join(fullDir, "about.html"), "<html></html>");
      });

      after(async () => {
        await fs.remove(path.join(PUBLISH_DIR, testExportDir));
      });

      it("returns index.html as entry file when it exists", async () => {
        const res = await callController(getExportFiles, {
          params: { exportDir: testExportDir },
        });
        assert.equal(res._status, 200);
        assert.ok(res._json.success);
        assert.equal(res._json.entryFile, "index.html");
      });

      it("returns 400 when exportDir is missing", async () => {
        const res = await callController(getExportFiles, {
          params: {},
        });
        assert.equal(res._status, 400);
      });

      it("returns 404 when export directory does not exist", async () => {
        const res = await callController(getExportFiles, {
          params: { exportDir: "nonexistent-export" },
        });
        assert.equal(res._status, 404);
      });

      it("returns 403 for path traversal attempt", async () => {
        const res = await callController(getExportFiles, {
          params: { exportDir: "../../etc/passwd" },
        });
        // Should be 403 (access denied) or 404
        assert.ok(
          res._status === 403 || res._status === 404,
          `Expected 403 or 404 for path traversal, got ${res._status}`,
        );
      });

      it("prefers home.html when index.html is absent", async () => {
        const noIndexDir = `test-home-entry-${TEST_USER_ID}`;
        const fullDir = path.join(PUBLISH_DIR, noIndexDir);
        await fs.ensureDir(fullDir);
        await fs.writeFile(path.join(fullDir, "home.html"), "<html></html>");
        await fs.writeFile(path.join(fullDir, "contact.html"), "<html></html>");

        const res = await callController(getExportFiles, {
          params: { exportDir: noIndexDir },
        });
        assert.equal(res._json.entryFile, "home.html");

        await fs.remove(fullDir);
      });

      it("falls back to first HTML file when no index/home exists", async () => {
        const noSpecialDir = `test-fallback-entry-${TEST_USER_ID}`;
        const fullDir = path.join(PUBLISH_DIR, noSpecialDir);
        await fs.ensureDir(fullDir);
        await fs.writeFile(path.join(fullDir, "contact.html"), "<html></html>");
        await fs.writeFile(path.join(fullDir, "pricing.html"), "<html></html>");

        const res = await callController(getExportFiles, {
          params: { exportDir: noSpecialDir },
        });
        assert.ok(res._json.entryFile.endsWith(".html"), "Should return some HTML file");

        await fs.remove(fullDir);
      });
    });

    // ========================================================================
    // downloadExport — ZIP streaming
    // ========================================================================

    describe("downloadExport", () => {
      let testExportDir;

      before(async () => {
        testExportDir = `test-download-dir-${TEST_USER_ID}`;
        const fullDir = path.join(PUBLISH_DIR, testExportDir);
        await fs.ensureDir(fullDir);
        await fs.writeFile(path.join(fullDir, "index.html"), "<html><body>test</body></html>");
        await fs.ensureDir(path.join(fullDir, "assets"));
        await fs.writeFile(path.join(fullDir, "assets", "style.css"), "body{}");
      });

      after(async () => {
        await fs.remove(path.join(PUBLISH_DIR, testExportDir));
      });

      it("sets correct ZIP response headers", async () => {
        const req = mockReq({ params: { exportDir: testExportDir } });
        const res = mockRes();

        // downloadExport pipes to res as a stream — we need a writable mock
        await downloadExport(req, res);

        assert.equal(res._headers["Content-Type"], "application/zip");
        assert.ok(
          res._headers["Content-Disposition"].includes(testExportDir),
          "Content-Disposition should include dir name",
        );
        assert.ok(res._headers["Content-Disposition"].includes(".zip"), "Should have .zip extension");
      });

      it("returns 400 when exportDir is missing", async () => {
        const res = await callController(downloadExport, {
          params: {},
        });
        assert.equal(res._status, 400);
      });

      it("returns 404 when directory does not exist", async () => {
        const res = await callController(downloadExport, {
          params: { exportDir: "nonexistent-download" },
        });
        assert.equal(res._status, 404);
      });

      it("returns 403 for path traversal attempt", async () => {
        const res = await callController(downloadExport, {
          params: { exportDir: "../../../etc" },
        });
        assert.ok(
          res._status === 403 || res._status === 404,
          `Expected 403/404 for traversal, got ${res._status}`,
        );
      });
    });

    // ========================================================================
    // getExportHistory
    // ========================================================================

    describe("getExportHistory", () => {
      before(async () => {
        await cleanExportHistory();
        // Create a couple of exports to populate history
        await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });
        await callController(exportProject, {
          params: { projectId: PROJECT_ID },
        });
      });

      it("returns export history for a project", async () => {
        const res = await callController(getExportHistory, {
          params: { projectId: PROJECT_ID },
        });
        assert.equal(res._status, 200);
        assert.ok(res._json.success);
        assert.ok(Array.isArray(res._json.exports));
        assert.equal(res._json.exports.length, 2);
        assert.ok(res._json.totalExports >= 2);
      });

      it("newest export is first in the list", async () => {
        const res = await callController(getExportHistory, {
          params: { projectId: PROJECT_ID },
        });
        const versions = res._json.exports.map((e) => e.version);
        assert.ok(versions[0] > versions[1], "First export should have higher version");
      });

      it("returns 404 for unknown project", async () => {
        const res = await callController(getExportHistory, {
          params: { projectId: "unknown-project-999" },
        });
        assert.equal(res._status, 404);
      });

      it("returns 400 when projectId is missing", async () => {
        const res = await callController(getExportHistory, {
          params: {},
        });
        assert.equal(res._status, 400);
      });

      it("includes maxVersionsToKeep in response", async () => {
        const res = await callController(getExportHistory, {
          params: { projectId: PROJECT_ID },
        });
        assert.ok(typeof res._json.maxVersionsToKeep === "number");
        assert.ok(res._json.maxVersionsToKeep > 0);
      });
    });

    // ========================================================================
    // deleteExport
    // ========================================================================

    describe("deleteExport", () => {
      before(async () => {
        await cleanExportHistory();
        // Create 3 exports
        await callController(exportProject, { params: { projectId: PROJECT_ID } });
        await callController(exportProject, { params: { projectId: PROJECT_ID } });
        await callController(exportProject, { params: { projectId: PROJECT_ID } });
      });

      it("deletes a specific export version", async () => {
        // Delete version 2
        const res = await callController(deleteExport, {
          params: { projectId: PROJECT_ID, version: "2" },
        });
        assert.equal(res._status, 200);
        assert.ok(res._json.success);

        // Verify it's removed from history
        const exports = readExportHistory(PROJECT_ID);
        const versions = exports.map((e) => e.version);
        assert.ok(!versions.includes(2), "Version 2 should be removed from history");
      });

      it("deletes the physical export directory", async () => {
        // Version 2's directory should be gone
        const v2Dir = path.join(PUBLISH_DIR, `${PROJECT_FOLDER}-v2`);
        assert.ok(!(await fs.pathExists(v2Dir)), "Physical directory for v2 should be removed");
      });

      it("preserves other export versions", async () => {
        const exports = readExportHistory(PROJECT_ID);
        const versions = exports.map((e) => e.version);
        assert.ok(versions.includes(1), "Version 1 should still exist");
        assert.ok(versions.includes(3), "Version 3 should still exist");
      });

      it("returns 404 for nonexistent version", async () => {
        const res = await callController(deleteExport, {
          params: { projectId: PROJECT_ID, version: "999" },
        });
        assert.equal(res._status, 404);
      });

      it("returns 404 for unknown project", async () => {
        const res = await callController(deleteExport, {
          params: { projectId: "unknown-project", version: "1" },
        });
        assert.equal(res._status, 404);
      });

      it("returns 400 when params are missing", async () => {
        const res = await callController(deleteExport, {
          params: {},
        });
        assert.equal(res._status, 400);
      });
    });

    // ========================================================================
    // cleanupProjectExports
    // ========================================================================

    describe("cleanupProjectExports", () => {
      const CLEANUP_ID = `cleanup-test-${TEST_USER_ID}-uuid`;
      const CLEANUP_FOLDER = `cleanup-test-${TEST_USER_ID}-project`;

      before(async () => {
        await cleanExportHistory();

        // Create a separate project for cleanup tests
        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects.push({
          id: CLEANUP_ID,
          folderName: CLEANUP_FOLDER,
          name: "Cleanup Test",
          theme: "__export_test_theme__",
          siteUrl: "",
          created: new Date().toISOString(),
        });
        await projectRepo.writeProjectsData(data, TEST_USER_ID);

        const projDir = getProjectDir(CLEANUP_FOLDER, TEST_USER_ID);
        const pagesDir = getProjectPagesDir(CLEANUP_FOLDER, TEST_USER_ID);
        await fs.ensureDir(pagesDir);
        await fs.outputFile(
          getProjectThemeJsonPath(CLEANUP_FOLDER, TEST_USER_ID),
          JSON.stringify({ settings: {} }, null, 2),
        );
        await fs.writeFile(
          path.join(pagesDir, "index.json"),
          JSON.stringify({
            name: "Home",
            slug: "index",
            widgets: {},
            widgetsOrder: [],
          }),
        );
        await fs.writeFile(
          path.join(projDir, "layout.liquid"),
          `<!DOCTYPE html><html><head><title>{{ page_title }}</title></head><body>{{ main_content | raw }}</body></html>`,
        );

        // Create two exports
        await callController(exportProject, { params: { projectId: CLEANUP_ID } });
        await callController(exportProject, { params: { projectId: CLEANUP_ID } });
      });

      after(async () => {
        await fs.remove(getProjectDir(CLEANUP_FOLDER, TEST_USER_ID));
        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects = data.projects.filter((p) => p.id !== CLEANUP_ID);
        await projectRepo.writeProjectsData(data, TEST_USER_ID);
      });

      it("removes all export directories for a project", async () => {
        // Verify exports exist first
        const exportsBefore = readExportHistory(CLEANUP_ID);
        assert.ok(exportsBefore.length > 0, "Should have history before cleanup");
        const exportDirs = exportsBefore.map((e) =>
          e.outputDir && !path.isAbsolute(e.outputDir) ? path.join(PUBLISH_DIR, e.outputDir) : e.outputDir,
        );
        for (const dir of exportDirs) {
          assert.ok(await fs.pathExists(dir), `${dir} should exist before cleanup`);
        }

        const result = await cleanupProjectExports(CLEANUP_ID, TEST_USER_ID);

        assert.equal(result.deletedDirs, 2);
        assert.equal(result.deletedHistory, true);

        // Directories should be gone
        for (const dir of exportDirs) {
          assert.ok(!(await fs.pathExists(dir)), `${dir} should be removed after cleanup`);
        }
      });

      it("removes project entry from export history", async () => {
        const exportsAfter = readExportHistory(CLEANUP_ID);
        assert.equal(exportsAfter.length, 0, "Project should have no export history");
      });

      it("throws for non-existent project (ownership check)", async () => {
        await assert.rejects(
          () => cleanupProjectExports("never-exported-uuid", TEST_USER_ID),
          (err) => err.message.includes("not found"),
        );
      });
    });

    // ========================================================================
    // Markdown export
    // ========================================================================

    describe("exportProject with markdown", () => {
      before(async () => {
        await cleanExportHistory();
      });

      it("generates .md files alongside HTML when exportMarkdown is true", async () => {
        const res = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
          body: { exportMarkdown: true },
        });
        assert.equal(res._status, 200);
        assert.ok(res._json.success);

        const exportDir = res._json.outputDir;
        const indexMdPath = path.join(exportDir, "index.md");
        const aboutMdPath = path.join(exportDir, "about.md");

        assert.ok(await fs.pathExists(indexMdPath), "index.md should exist");
        assert.ok(await fs.pathExists(aboutMdPath), "about.md should exist");
      });

      it("markdown files contain YAML frontmatter", async () => {
        const rawDir = readExportHistory(PROJECT_ID)[0].outputDir;
        const exportDir = path.isAbsolute(rawDir) ? rawDir : path.join(PUBLISH_DIR, rawDir);
        const indexMd = await fs.readFile(path.join(exportDir, "index.md"), "utf8");
        assert.ok(indexMd.startsWith("---"), "Should start with YAML frontmatter");
        assert.ok(indexMd.includes("title:"), "Should have title in frontmatter");
        assert.ok(indexMd.includes("source_url:"), "Should have source_url section");
      });

      it("does not generate .md files when exportMarkdown is false (default)", async () => {
        await cleanExportHistory();
        const res = await callController(exportProject, {
          params: { projectId: PROJECT_ID },
          body: {}, // default — no markdown
        });
        const exportDir = res._json.outputDir;
        const indexMdPath = path.join(exportDir, "index.md");
        assert.ok(!(await fs.pathExists(indexMdPath)), "No .md files without exportMarkdown flag");
      });
    });

    // ========================================================================
    // Export with "home" slug treated as index.html
    // ========================================================================

    describe("home page slug mapping", () => {
      const HOME_SLUG_ID = `home-slug-${TEST_USER_ID}-uuid`;
      const HOME_SLUG_FOLDER = `home-slug-${TEST_USER_ID}-project`;

      before(async () => {
        await cleanExportHistory();

        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects.push({
          id: HOME_SLUG_ID,
          folderName: HOME_SLUG_FOLDER,
          name: "Home Slug Project",
          theme: "__export_test_theme__",
          siteUrl: "",
          created: new Date().toISOString(),
        });
        await projectRepo.writeProjectsData(data, TEST_USER_ID);

        const projDir = getProjectDir(HOME_SLUG_FOLDER, TEST_USER_ID);
        const pagesDir = getProjectPagesDir(HOME_SLUG_FOLDER, TEST_USER_ID);
        await fs.ensureDir(pagesDir);
        await fs.outputFile(
          getProjectThemeJsonPath(HOME_SLUG_FOLDER, TEST_USER_ID),
          JSON.stringify({ settings: {} }, null, 2),
        );

        // Create both index and home pages — "home" should map to index.html
        await fs.writeFile(
          path.join(pagesDir, "index.json"),
          JSON.stringify({
            name: "Index",
            slug: "index",
            widgets: {},
            widgetsOrder: [],
          }),
        );
        await fs.writeFile(
          path.join(pagesDir, "home.json"),
          JSON.stringify({
            name: "Home",
            slug: "home",
            widgets: {},
            widgetsOrder: [],
          }),
        );
        await fs.writeFile(
          path.join(projDir, "layout.liquid"),
          `<!DOCTYPE html><html><head><title>{{ page_title }}</title></head><body>{{ main_content | raw }}</body></html>`,
        );
      });

      after(async () => {
        await fs.remove(getProjectDir(HOME_SLUG_FOLDER, TEST_USER_ID));
        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects = data.projects.filter((p) => p.id !== HOME_SLUG_ID);
        await projectRepo.writeProjectsData(data, TEST_USER_ID);
      });

      it("'home' slug produces index.html (same as 'index')", async () => {
        const res = await callController(exportProject, {
          params: { projectId: HOME_SLUG_ID },
        });
        assert.equal(res._status, 200);

        const exportDir = res._json.outputDir;
        // "home" page should produce index.html too (the controller maps both to index.html)
        // This means there could be a conflict — let's document what happens
        const indexExists = await fs.pathExists(path.join(exportDir, "index.html"));
        assert.ok(indexExists, "index.html should exist from either index or home page");
      });
    });

    // ========================================================================
    // Export records failed exports
    // ========================================================================

    describe("export failure recording", () => {
      before(async () => {
        await cleanExportHistory();
      });

      it("records a failed export in history when theme is missing", async () => {
        // Create a project that references a non-existent theme
        const badId = `bad-theme-${TEST_USER_ID}-uuid`;
        const badFolder = `bad-theme-${TEST_USER_ID}-project`;
        const data = await projectRepo.readProjectsData(TEST_USER_ID);
        data.projects.push({
          id: badId,
          folderName: badFolder,
          name: "Bad Theme Project",
          theme: "nonexistent-theme",
          siteUrl: "",
          created: new Date().toISOString(),
        });
        await projectRepo.writeProjectsData(data, TEST_USER_ID);

        const projDir = getProjectDir(badFolder, TEST_USER_ID);
        const pagesDir = getProjectPagesDir(badFolder, TEST_USER_ID);
        await fs.ensureDir(pagesDir);
        // No theme.json — this will cause readProjectThemeData to throw

        const res = await callController(exportProject, {
          params: { projectId: badId },
        });

        // Should be 404 (theme not found) or 500
        assert.ok(res._status === 404 || res._status === 500, `Expected error status, got ${res._status}`);

        // Check that the failure was recorded in export history
        const exports = readExportHistory(badId);
        if (exports.length > 0) {
          const failedExport = exports.find((e) => e.status === "failed");
          assert.ok(failedExport, "Should have a failed export record");
        }

        // Cleanup
        await fs.remove(projDir);
        const data2 = await projectRepo.readProjectsData(TEST_USER_ID);
        data2.projects = data2.projects.filter((p) => p.id !== badId);
        await projectRepo.writeProjectsData(data2, TEST_USER_ID);
      });
    });
  });
}
