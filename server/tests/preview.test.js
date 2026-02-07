/**
 * Preview Controller Test Suite
 *
 * Tests getGlobalWidgets, saveGlobalWidget, and serveAsset.
 * Focuses on global widget I/O, media usage tracking on save,
 * and path traversal protection in serveAsset.
 *
 * Run with: node --test server/tests/preview.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preview-test-${Date.now()}`);
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
  getProjectPagesDir,
  getProjectMediaJsonPath,
} = await import("../config.js");

const { writeProjectsFile } = await import("../controllers/projectController.js");

const {
  getGlobalWidgets,
  saveGlobalWidget,
  serveAsset,
} = await import("../controllers/previewController.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "preview-test-uuid-1234";
const PROJECT_FOLDER = "preview-test-project";

// ============================================================================
// Mock helpers
// ============================================================================

function mockReq({ params = {}, body = {} } = {}) {
  return {
    params,
    body,
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    _sent: null,
    _headers: {},
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
    send(data) {
      res._sent = data;
      res.headersSent = true;
      return res;
    },
    setHeader(key, val) {
      res._headers[key] = val;
      return res;
    },
  };
  return res;
}

async function callController(fn, { params, body } = {}) {
  const req = mockReq({ params, body });
  const res = mockRes();
  await fn(req, res);
  return res;
}

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
        name: "Preview Test Project",
        theme: "__preview_test_theme__",
        siteUrl: "https://example.com",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));

  // Create global pages directory
  const globalDir = path.join(projectDir, "pages", "global");
  await fs.ensureDir(globalDir);

  // Create assets directories
  await fs.ensureDir(path.join(projectDir, "assets"));
  await fs.ensureDir(path.join(projectDir, "theme"));

  // Create media.json for usage tracking
  const mediaPath = getProjectMediaJsonPath(PROJECT_FOLDER);
  await fs.outputFile(mediaPath, JSON.stringify({ files: [] }, null, 2));
});

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// getGlobalWidgets
// ============================================================================

describe("getGlobalWidgets", () => {
  const globalDir = () => path.join(getProjectDir(PROJECT_FOLDER), "pages", "global");

  beforeEach(async () => {
    // Seed header and footer files
    await fs.ensureDir(globalDir());
    await fs.writeJson(path.join(globalDir(), "header.json"), {
      type: "theme-header",
      settings: { logo: "/uploads/images/logo.png" },
      blocks: [],
    });
    await fs.writeJson(path.join(globalDir(), "footer.json"), {
      type: "theme-footer",
      settings: { copyright: "2025 Test Corp" },
      blocks: [],
    });
  });

  it("returns both header and footer data", async () => {
    const res = await callController(getGlobalWidgets);
    assert.equal(res._status, 200);
    assert.ok(res._json.header, "Should return header data");
    assert.ok(res._json.footer, "Should return footer data");
    assert.equal(res._json.header.type, "theme-header");
    assert.equal(res._json.footer.type, "theme-footer");
  });

  it("returns null for missing header file", async () => {
    await fs.remove(path.join(globalDir(), "header.json"));

    const res = await callController(getGlobalWidgets);
    assert.equal(res._status, 200);
    assert.equal(res._json.header, null);
    assert.ok(res._json.footer, "Footer should still be returned");
  });

  it("returns null for corrupted JSON", async () => {
    await fs.writeFile(path.join(globalDir(), "header.json"), "NOT_VALID_JSON{{{");

    const res = await callController(getGlobalWidgets);
    assert.equal(res._status, 200);
    assert.equal(res._json.header, null, "Corrupted header should return null");
    assert.ok(res._json.footer, "Footer should still work");
  });

  it("returns 404 when no active project", async () => {
    // Temporarily clear active project
    const original = await fs.readJson(path.join(TEST_DATA_DIR, "projects", "projects.json"));
    await writeProjectsFile({ ...original, activeProjectId: null });

    const res = await callController(getGlobalWidgets);
    assert.equal(res._status, 404);

    // Restore
    await writeProjectsFile(original);
  });
});

// ============================================================================
// saveGlobalWidget
// ============================================================================

describe("saveGlobalWidget", () => {
  const globalDir = () => path.join(getProjectDir(PROJECT_FOLDER), "pages", "global");

  beforeEach(async () => {
    await fs.ensureDir(globalDir());
    // Clean global files
    await fs.remove(path.join(globalDir(), "header.json"));
    await fs.remove(path.join(globalDir(), "footer.json"));
  });

  it("saves header widget data", async () => {
    const widgetData = {
      type: "theme-header",
      settings: { logo: "/uploads/images/new-logo.png", sticky: true },
      blocks: [{ id: "b1", content: "Nav Item" }],
    };

    const res = await callController(saveGlobalWidget, {
      params: { type: "header" },
      body: widgetData,
    });

    assert.equal(res._status, 200);
    assert.ok(res._json.success);
    assert.deepEqual(res._json.data, widgetData);

    // Verify file on disk
    const saved = await fs.readJson(path.join(globalDir(), "header.json"));
    assert.equal(saved.type, "theme-header");
    assert.equal(saved.settings.sticky, true);
  });

  it("saves footer widget data", async () => {
    const widgetData = {
      type: "theme-footer",
      settings: { copyright: "2025 My Site" },
      blocks: [],
    };

    const res = await callController(saveGlobalWidget, {
      params: { type: "footer" },
      body: widgetData,
    });

    assert.equal(res._status, 200);
    assert.ok(res._json.success);

    const saved = await fs.readJson(path.join(globalDir(), "footer.json"));
    assert.equal(saved.type, "theme-footer");
  });

  it("rejects invalid widget type", async () => {
    const res = await callController(saveGlobalWidget, {
      params: { type: "sidebar" },
      body: { type: "sidebar-widget" },
    });

    assert.equal(res._status, 400);
    assert.ok(res._json.error.toLowerCase().includes("invalid"));
  });

  it("creates global directory if missing", async () => {
    await fs.remove(globalDir());
    assert.ok(!(await fs.pathExists(globalDir())), "Precondition: global dir should not exist");

    const res = await callController(saveGlobalWidget, {
      params: { type: "header" },
      body: { type: "theme-header", settings: {}, blocks: [] },
    });

    assert.equal(res._status, 200);
    assert.ok(await fs.pathExists(globalDir()), "Global dir should be created");
    assert.ok(await fs.pathExists(path.join(globalDir(), "header.json")), "Header file should exist");
  });

  it("returns 404 when no active project", async () => {
    const original = await fs.readJson(path.join(TEST_DATA_DIR, "projects", "projects.json"));
    await writeProjectsFile({ ...original, activeProjectId: null });

    const res = await callController(saveGlobalWidget, {
      params: { type: "header" },
      body: { type: "theme-header" },
    });
    assert.equal(res._status, 404);

    await writeProjectsFile(original);
  });
});

// ============================================================================
// serveAsset
// ============================================================================

describe("serveAsset", () => {
  before(async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);

    // Create test asset files
    await fs.ensureDir(path.join(projectDir, "assets", "css"));
    await fs.ensureDir(path.join(projectDir, "assets", "js"));
    await fs.ensureDir(path.join(projectDir, "assets", "fonts"));
    await fs.ensureDir(path.join(projectDir, "assets", "images"));

    await fs.writeFile(path.join(projectDir, "assets", "css", "main.css"), "body { color: red; }");
    await fs.writeFile(path.join(projectDir, "assets", "js", "app.js"), "console.log('hello');");
    await fs.writeFile(path.join(projectDir, "assets", "images", "icon.png"), "fake-png-data");
    await fs.writeFile(path.join(projectDir, "assets", "images", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await fs.writeFile(path.join(projectDir, "assets", "fonts", "custom.woff2"), "fake-font-data");

    // Create a sensitive file outside assets to verify traversal protection
    await fs.writeFile(path.join(projectDir, "secret.txt"), "SENSITIVE DATA");
  });

  it("serves CSS with correct Content-Type", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["css", "main.css"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "text/css");
    assert.ok(Buffer.isBuffer(res._sent) || typeof res._sent === "string" || res._sent !== null);
  });

  it("serves JavaScript with correct Content-Type", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["js", "app.js"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "application/javascript");
  });

  it("serves PNG images with correct Content-Type", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["images", "icon.png"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "image/png");
  });

  it("serves SVG images with correct Content-Type", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["images", "logo.svg"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "image/svg+xml");
  });

  it("serves WOFF2 fonts with correct Content-Type", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["fonts", "custom.woff2"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._headers["Content-Type"], "font/woff2");
  });

  it("returns 404 for nonexistent file", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["css", "nonexistent.css"] },
    });
    assert.equal(res._status, 404);
  });

  it("blocks path traversal attacks", async () => {
    // Try to escape the assets directory to read secret.txt
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: ["..", "secret.txt"] },
    });
    // Should return 400 (invalid path) or 404 (not within base directory)
    assert.ok(res._status === 400 || res._status === 404, `Should block traversal, got ${res._status}`);
  });

  it("returns 400 when filepath is empty", async () => {
    const res = await callController(serveAsset, {
      params: { projectId: PROJECT_ID, folder: "assets", filepath: [] },
    });
    assert.equal(res._status, 400);
  });
});
