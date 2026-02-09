/**
 * Core Widgets Controller Test Suite
 *
 * Tests getCoreWidgets, getCoreWidget, and getAllCoreWidgets
 * from coreWidgetsController.js.
 *
 * Creates an isolated CORE_WIDGETS_DIR with fake widget schemas
 * to verify directory scanning, schema loading, error handling,
 * and the API endpoint wrapper.
 *
 * Run with: node --test server/tests/coreWidgets.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-core-widgets-${Date.now()}`);
const TEST_CORE_WIDGETS_DIR = path.join(TEST_ROOT, "src", "core", "widgets");

// CORE_WIDGETS_DIR is derived from APP_ROOT: path.join(APP_ROOT, "src", "core", "widgets")
// APP_ROOT defaults to process.cwd() unless APP_ROOT env var is set.
process.env.APP_ROOT = TEST_ROOT;
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

// Silence console output from production code
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getCoreWidgets, getCoreWidget, getAllCoreWidgets } = await import("../controllers/coreWidgetsController.js");

// ============================================================================
// Mock helpers
// ============================================================================

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
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
  };
  return res;
}

// ============================================================================
// Global setup / teardown
// ============================================================================

before(async () => {
  // Create two valid core widgets and one broken one
  await fs.ensureDir(TEST_CORE_WIDGETS_DIR);

  // core-spacer
  const spacerDir = path.join(TEST_CORE_WIDGETS_DIR, "core-spacer");
  await fs.ensureDir(spacerDir);
  await fs.writeJson(path.join(spacerDir, "schema.json"), {
    type: "core-spacer",
    name: "Spacer",
    settings: [{ id: "height", type: "range", default: 40 }],
  });
  await fs.writeFile(path.join(spacerDir, "widget.liquid"), '<div style="height: {{ height }}px"></div>');

  // core-divider
  const dividerDir = path.join(TEST_CORE_WIDGETS_DIR, "core-divider");
  await fs.ensureDir(dividerDir);
  await fs.writeJson(path.join(dividerDir, "schema.json"), {
    type: "core-divider",
    name: "Divider",
    settings: [{ id: "color", type: "color", default: "#ccc" }],
  });
  await fs.writeFile(path.join(dividerDir, "widget.liquid"), '<hr style="color: {{ color }}">');

  // core-broken — has invalid JSON in schema
  const brokenDir = path.join(TEST_CORE_WIDGETS_DIR, "core-broken");
  await fs.ensureDir(brokenDir);
  await fs.writeFile(path.join(brokenDir, "schema.json"), "NOT_VALID_JSON{{{");
});

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// getCoreWidgets
// ============================================================================

describe("getCoreWidgets", () => {
  it("returns all valid widget schemas", async () => {
    const widgets = await getCoreWidgets();
    assert.ok(Array.isArray(widgets));
    // Should return 2 valid schemas (spacer + divider), skipping broken
    assert.equal(widgets.length, 2);

    const types = widgets.map((w) => w.type).sort();
    assert.deepEqual(types, ["core-divider", "core-spacer"]);
  });

  it("skips widgets with invalid schema.json", async () => {
    const widgets = await getCoreWidgets();
    const broken = widgets.find((w) => w.type === "core-broken");
    assert.equal(broken, undefined, "Broken widget should not be in results");
  });

  it("returns empty array when directory is empty", async () => {
    // Temporarily move all widget dirs to a backup location
    const backupDir = path.join(TEST_ROOT, "_widgets_backup");
    await fs.ensureDir(backupDir);
    const dirs = await fs.readdir(TEST_CORE_WIDGETS_DIR);
    for (const dir of dirs) {
      await fs.move(path.join(TEST_CORE_WIDGETS_DIR, dir), path.join(backupDir, dir));
    }

    const widgets = await getCoreWidgets();
    assert.ok(Array.isArray(widgets));
    assert.equal(widgets.length, 0);

    // Restore
    const backedUp = await fs.readdir(backupDir);
    for (const dir of backedUp) {
      await fs.move(path.join(backupDir, dir), path.join(TEST_CORE_WIDGETS_DIR, dir));
    }
    await fs.remove(backupDir);
  });
});

// ============================================================================
// getCoreWidget
// ============================================================================

describe("getCoreWidget", () => {
  it("returns a specific widget schema by name", async () => {
    const widget = await getCoreWidget("core-spacer");
    assert.ok(widget);
    assert.equal(widget.type, "core-spacer");
    assert.equal(widget.name, "Spacer");
    assert.ok(Array.isArray(widget.settings));
  });

  it("returns null for nonexistent widget", async () => {
    const widget = await getCoreWidget("core-nonexistent");
    assert.equal(widget, null);
  });
});

// ============================================================================
// getAllCoreWidgets (API endpoint)
// ============================================================================

describe("getAllCoreWidgets", () => {
  it("returns 200 with widget array", async () => {
    const req = {};
    const res = mockRes();
    await getAllCoreWidgets(req, res);

    assert.equal(res._status, 200);
    assert.ok(Array.isArray(res._json));
    assert.equal(res._json.length, 2);
  });
});
