/**
 * App Settings Test Suite
 *
 * Tests the appSettingsController which manages application-wide settings
 * (language, media limits, image processing, export config, developer mode).
 *
 * Uses an isolated DATA_DIR so tests never touch real settings.
 *
 * Run with: node --test server/tests/appSettings.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-appsettings-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.NODE_ENV = "test";

const { getAppSettingsPath } = await import("../config.js");

const { getAppSettings, updateAppSettings, readAppSettingsFile, getSetting } =
  await import("../controllers/appSettingsController.js");

// ============================================================================
// Test helpers
// ============================================================================

function mockReq({ body = {} } = {}) {
  return {
    body,
    [Symbol.for("express-validator#contexts")]: [],
  };
}

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

async function callController(controllerFn, { body } = {}) {
  const req = mockReq({ body });
  const res = mockRes();
  await controllerFn(req, res);
  return res;
}

// ============================================================================
// Global setup / teardown
// ============================================================================

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
});

beforeEach(async () => {
  // Remove settings file before each test so defaults are used
  const settingsPath = getAppSettingsPath();
  await fs.remove(settingsPath);
});

after(async () => {
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// readAppSettingsFile / getAppSettings
// ============================================================================

describe("readAppSettingsFile", () => {
  it("returns defaults when no settings file exists", async () => {
    const settings = await readAppSettingsFile();
    assert.equal(settings.general.language, "en");
    assert.equal(settings.media.maxFileSizeMB, 5);
    assert.equal(settings.developer.enabled, false);
  });

  it("creates the settings file on first read", async () => {
    await readAppSettingsFile();
    const settingsPath = getAppSettingsPath();
    assert.ok(await fs.pathExists(settingsPath));
  });

  it("returns saved settings when file exists", async () => {
    const settingsPath = getAppSettingsPath();
    await fs.outputFile(settingsPath, JSON.stringify({ general: { language: "de" } }, null, 2));
    const settings = await readAppSettingsFile();
    assert.equal(settings.general.language, "de");
  });

  it("merges saved settings with defaults (missing keys get defaults)", async () => {
    const settingsPath = getAppSettingsPath();
    await fs.outputFile(settingsPath, JSON.stringify({ general: { language: "fr" } }, null, 2));
    const settings = await readAppSettingsFile();
    assert.equal(settings.general.language, "fr");
    // media should come from defaults
    assert.equal(settings.media.maxFileSizeMB, 5);
  });

  it("returns defaults on corrupted JSON", async () => {
    const settingsPath = getAppSettingsPath();
    await fs.outputFile(settingsPath, "{ broken json !!!");
    const settings = await readAppSettingsFile();
    assert.equal(settings.general.language, "en");
  });
});

describe("getAppSettings (controller)", () => {
  it("returns 200 with settings", async () => {
    const res = await callController(getAppSettings);
    assert.equal(res._status, 200);
    assert.ok(res._json.general);
    assert.ok(res._json.media);
    assert.ok(res._json.export);
    assert.ok("enabled" in res._json.developer);
  });

  it("includes all default sections", async () => {
    const res = await callController(getAppSettings);
    assert.equal(res._json.general.language, "en");
    assert.equal(res._json.media.maxFileSizeMB, 5);
    assert.equal(res._json.media.maxVideoSizeMB, 50);
    assert.equal(res._json.media.maxAudioSizeMB, 25);
    assert.equal(res._json.export.maxVersionsToKeep, 10);
    assert.equal(res._json.export.maxImportSizeMB, 500);
    assert.equal(res._json.developer.enabled, false);
  });

  it("includes default image processing settings", async () => {
    const res = await callController(getAppSettings);
    const imgProc = res._json.media.imageProcessing;
    assert.equal(imgProc.quality, 85);
    assert.equal(imgProc.sizes.thumb.width, 150);
    assert.equal(imgProc.sizes.small.width, 480);
    assert.equal(imgProc.sizes.medium.width, 1024);
    assert.equal(imgProc.sizes.large.width, 1920);
  });
});

// ============================================================================
// updateAppSettings
// ============================================================================

describe("updateAppSettings", () => {
  it("updates and persists settings", async () => {
    const res = await callController(updateAppSettings, {
      body: { general: { language: "el" } },
    });
    assert.equal(res._status, 200);
    assert.ok(res._json.message.includes("updated"));

    // Verify persistence
    const saved = await readAppSettingsFile();
    assert.equal(saved.general.language, "el");
  });

  it("merges with existing settings (does not wipe)", async () => {
    // First set language
    await callController(updateAppSettings, {
      body: { general: { language: "it" } },
    });
    // Then update developer mode only
    await callController(updateAppSettings, {
      body: { developer: { enabled: true } },
    });

    const saved = await readAppSettingsFile();
    assert.equal(saved.developer.enabled, true);
    // media defaults should still be present
    assert.equal(saved.media.maxFileSizeMB, 5);
  });

  it("accepts negative maxFileSizeMB when passed as number (no type guard)", async () => {
    // Note: the controller only validates non-number types (strings).
    // A numeric -1 passes through — this documents the current behaviour.
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: -1 } },
    });
    assert.equal(res._status, 200);
  });

  it("validates maxFileSizeMB rejects negative string", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: "-5" } },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /max file size/i);
  });

  it("validates maxFileSizeMB rejects non-numeric string", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: "abc" } },
    });
    assert.equal(res._status, 400);
  });

  it("parses maxFileSizeMB from numeric string", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: "10" } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxFileSizeMB, 10);
  });

  it("validates image quality range (1-100)", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 0 } } },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /quality/i);

    const res2 = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 101 } } },
    });
    assert.equal(res2._status, 400);
  });

  it("accepts valid image quality", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 50 } } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.imageProcessing.quality, 50);
  });

  it("validates image size width is positive", async () => {
    const res = await callController(updateAppSettings, {
      body: {
        media: {
          maxFileSizeMB: 5,
          imageProcessing: {
            sizes: { thumb: { width: 0, enabled: true } },
          },
        },
      },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /width/i);
  });

  it("validates image size enabled flag must be boolean", async () => {
    const res = await callController(updateAppSettings, {
      body: {
        media: {
          maxFileSizeMB: 5,
          imageProcessing: {
            sizes: { thumb: { width: 150, enabled: "yes" } },
          },
        },
      },
    });
    assert.equal(res._status, 400);
    assert.match(res._json.error, /enabled/i);
  });

  it("rejects non-object request body", async () => {
    const req = mockReq({ body: "not-an-object" });
    const res = mockRes();
    await updateAppSettings(req, res);
    assert.equal(res._status, 400);
  });
});

// ============================================================================
// getSetting (dot-notation lookup)
// ============================================================================

describe("getSetting", () => {
  it("retrieves a top-level setting", async () => {
    const language = await getSetting("general.language");
    assert.equal(language, "en");
  });

  it("retrieves a nested setting", async () => {
    const quality = await getSetting("media.imageProcessing.quality");
    assert.equal(quality, 85);
  });

  it("retrieves a deeply nested setting", async () => {
    const thumbWidth = await getSetting("media.imageProcessing.sizes.thumb.width");
    assert.equal(thumbWidth, 150);
  });

  it("returns default when key is missing from saved settings", async () => {
    // Save settings without media section
    const settingsPath = getAppSettingsPath();
    await fs.outputFile(settingsPath, JSON.stringify({ general: { language: "de" } }, null, 2));

    // media.maxFileSizeMB should fall back to default
    const maxSize = await getSetting("media.maxFileSizeMB");
    assert.equal(maxSize, 5);
  });

  it("returns null for a key that doesn't exist in defaults either", async () => {
    const result = await getSetting("nonexistent.key.path");
    assert.equal(result, null);
  });

  it("returns saved value when it differs from default", async () => {
    const settingsPath = getAppSettingsPath();
    await fs.outputFile(
      settingsPath,
      JSON.stringify(
        {
          general: { language: "en" },
          media: { maxFileSizeMB: 20 },
          developer: { enabled: true },
        },
        null,
        2,
      ),
    );
    const result = await getSetting("developer.enabled");
    assert.equal(result, true);
  });

  it("retrieves boolean false correctly", async () => {
    const result = await getSetting("developer.enabled");
    assert.equal(result, false);
  });
});
