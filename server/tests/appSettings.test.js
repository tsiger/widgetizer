/**
 * App Settings Test Suite
 *
 * Tests the appSettingsController which manages per-user application settings
 * (language, media limits, image processing, export config, developer mode).
 *
 * Runs all tests for both open-source (userId="local") and hosted
 * (userId="user_hosted_abc") modes to catch userId propagation bugs.
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

const { getAppSettings, updateAppSettings, readAppSettingsFile, getSetting } =
  await import("../controllers/appSettingsController.js");
const { saveSettings, getSettings, defaultSettings } = await import("../db/repositories/settingsRepository.js");
const { getDb, closeDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const TEST_USER_IDS = ["local", "user_hosted_abc"];

// ============================================================================
// Test helpers
// ============================================================================

function mockReq({ body = {}, userId = "local" } = {}) {
  return {
    body,
    userId,
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

async function callController(controllerFn, { body, userId = "local" } = {}) {
  const req = mockReq({ body, userId });
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
  // Wipe all settings rows then seed defaults for the standard test users
  const db = getDb();
  db.prepare("DELETE FROM app_settings WHERE key LIKE 'config:%'").run();
  for (const userId of TEST_USER_IDS) {
    saveSettings({ ...defaultSettings }, userId);
  }
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Per-userId tests (run for both "local" and hosted user)
// ============================================================================

for (const userId of TEST_USER_IDS) {
  describe(`[userId=${userId}]`, () => {
    // ========================================================================
    // readAppSettingsFile / getAppSettings
    // ========================================================================

    describe("readAppSettingsFile", () => {
      it("returns defaults when no settings exist", async () => {
        // Clear settings for this user
        saveSettings({}, userId);
        const settings = await readAppSettingsFile(userId);
        assert.equal(settings.general.language, "en");
        assert.equal(settings.media.maxFileSizeMB, 5);
        assert.equal(settings.developer.enabled, false);
      });

      it("returns saved settings after update", async () => {
        saveSettings({ ...defaultSettings, general: { ...defaultSettings.general, language: "de" } }, userId);
        const settings = await readAppSettingsFile(userId);
        assert.equal(settings.general.language, "de");
      });

      it("merges saved settings with defaults (missing keys get defaults)", async () => {
        saveSettings({ general: { language: "fr" } }, userId);
        const settings = await readAppSettingsFile(userId);
        assert.equal(settings.general.language, "fr");
        // media should come from defaults
        assert.equal(settings.media.maxFileSizeMB, 5);
      });
    });

    describe("getAppSettings (controller)", () => {
      it("returns 200 with settings", async () => {
        const res = await callController(getAppSettings, { userId });
        assert.equal(res._status, 200);
        assert.ok(res._json.general);
        assert.ok(res._json.media);
        assert.ok(res._json.export);
        assert.ok("enabled" in res._json.developer);
      });

      it("includes all default sections", async () => {
        const res = await callController(getAppSettings, { userId });
        assert.equal(res._json.general.language, "en");
        assert.equal(res._json.media.maxFileSizeMB, 5);
        assert.equal(res._json.media.maxVideoSizeMB, 50);
        assert.equal(res._json.media.maxAudioSizeMB, 25);
        assert.equal(res._json.export.maxVersionsToKeep, 10);
        assert.equal(res._json.export.maxImportSizeMB, 500);
        assert.equal(res._json.developer.enabled, false);
      });

      it("includes default image processing settings", async () => {
        const res = await callController(getAppSettings, { userId });
        const imgProc = res._json.media.imageProcessing;
        assert.equal(imgProc.quality, 85);
        assert.equal(imgProc.sizes.thumb.width, 150);
        assert.equal(imgProc.sizes.small.width, 480);
        assert.equal(imgProc.sizes.medium.width, 1024);
        assert.equal(imgProc.sizes.large.width, 1920);
      });
    });

    // ========================================================================
    // updateAppSettings
    // ========================================================================

    describe("updateAppSettings", () => {
      it("updates and persists settings", async () => {
        const res = await callController(updateAppSettings, {
          body: { general: { language: "el" } },
          userId,
        });
        assert.equal(res._status, 200);
        assert.ok(res._json.message.includes("updated"));

        // Verify persistence
        const saved = await readAppSettingsFile(userId);
        assert.equal(saved.general.language, "el");
      });

      it("merges with existing settings (does not wipe)", async () => {
        // First set language
        await callController(updateAppSettings, {
          body: { general: { language: "it" } },
          userId,
        });
        // Then update developer mode only
        await callController(updateAppSettings, {
          body: { developer: { enabled: true } },
          userId,
        });

        const saved = await readAppSettingsFile(userId);
        assert.equal(saved.developer.enabled, true);
        // media defaults should still be present
        assert.equal(saved.media.maxFileSizeMB, 5);
      });

      it("accepts negative maxFileSizeMB when passed as number (no type guard)", async () => {
        // Note: the controller only validates non-number types (strings).
        // A numeric -1 passes through — this documents the current behaviour.
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: -1 } },
          userId,
        });
        assert.equal(res._status, 200);
      });

      it("validates maxFileSizeMB rejects negative string", async () => {
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: "-5" } },
          userId,
        });
        assert.equal(res._status, 400);
        assert.match(res._json.error, /max file size/i);
      });

      it("validates maxFileSizeMB rejects non-numeric string", async () => {
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: "abc" } },
          userId,
        });
        assert.equal(res._status, 400);
      });

      it("parses maxFileSizeMB from numeric string", async () => {
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: "10" } },
          userId,
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.settings.media.maxFileSizeMB, 10);
      });

      it("validates image quality range (1-100)", async () => {
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 0 } } },
          userId,
        });
        assert.equal(res._status, 400);
        assert.match(res._json.error, /quality/i);

        const res2 = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 101 } } },
          userId,
        });
        assert.equal(res2._status, 400);
      });

      it("accepts valid image quality", async () => {
        const res = await callController(updateAppSettings, {
          body: { media: { maxFileSizeMB: 5, imageProcessing: { quality: 50 } } },
          userId,
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
          userId,
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
          userId,
        });
        assert.equal(res._status, 400);
        assert.match(res._json.error, /enabled/i);
      });

      it("rejects non-object request body", async () => {
        const req = mockReq({ body: "not-an-object", userId });
        const res = mockRes();
        await updateAppSettings(req, res);
        assert.equal(res._status, 400);
      });
    });

    // ========================================================================
    // getSetting (dot-notation lookup)
    // ========================================================================

    describe("getSetting", () => {
      it("retrieves a top-level setting", async () => {
        const language = await getSetting("general.language", userId);
        assert.equal(language, "en");
      });

      it("retrieves a nested setting", async () => {
        const quality = await getSetting("media.imageProcessing.quality", userId);
        assert.equal(quality, 85);
      });

      it("retrieves a deeply nested setting", async () => {
        const thumbWidth = await getSetting("media.imageProcessing.sizes.thumb.width", userId);
        assert.equal(thumbWidth, 150);
      });

      it("returns default when key is missing from saved settings", async () => {
        // Save settings without media section
        saveSettings({ general: { language: "de" } }, userId);

        // media.maxFileSizeMB should fall back to default
        const maxSize = await getSetting("media.maxFileSizeMB", userId);
        assert.equal(maxSize, 5);
      });

      it("returns null for a key that doesn't exist in defaults either", async () => {
        const result = await getSetting("nonexistent.key.path", userId);
        assert.equal(result, null);
      });

      it("returns saved value when it differs from default", async () => {
        saveSettings(
          {
            general: { language: "en" },
            media: { maxFileSizeMB: 20 },
            developer: { enabled: true },
          },
          userId,
        );
        const result = await getSetting("developer.enabled", userId);
        assert.equal(result, true);
      });

      it("retrieves boolean false correctly", async () => {
        const result = await getSetting("developer.enabled", userId);
        assert.equal(result, false);
      });
    });
  });
}

// ============================================================================
// Multi-user isolation
// ============================================================================

describe("Multi-user settings isolation", () => {
  it("settings for one user do not affect another user", async () => {
    // User A changes language to German
    saveSettings({ ...defaultSettings, general: { ...defaultSettings.general, language: "de" } }, "user_a");

    // User B changes max file size
    saveSettings({ ...defaultSettings, media: { ...defaultSettings.media, maxFileSizeMB: 100 } }, "user_b");

    // User A still has default max file size
    const settingsA = getSettings("user_a");
    assert.equal(settingsA.general.language, "de");
    assert.equal(settingsA.media.maxFileSizeMB, 5);

    // User B still has default language
    const settingsB = getSettings("user_b");
    assert.equal(settingsB.general.language, "en");
    assert.equal(settingsB.media.maxFileSizeMB, 100);
  });

  it("updating settings via controller is user-scoped", async () => {
    // User A enables developer mode
    await callController(updateAppSettings, {
      body: { developer: { enabled: true } },
      userId: "user_a",
    });

    // User B should still have developer mode disabled
    const resB = await callController(getAppSettings, { userId: "user_b" });
    assert.equal(resB._json.developer.enabled, false);

    // User A should have it enabled
    const resA = await callController(getAppSettings, { userId: "user_a" });
    assert.equal(resA._json.developer.enabled, true);
  });

  it("getSetting respects userId scoping", async () => {
    saveSettings({ ...defaultSettings, media: { ...defaultSettings.media, maxFileSizeMB: 50 } }, "user_a");

    // User A sees 50
    const maxSizeA = await getSetting("media.maxFileSizeMB", "user_a");
    assert.equal(maxSizeA, 50);

    // User B sees default (5)
    const maxSizeB = await getSetting("media.maxFileSizeMB", "user_b");
    assert.equal(maxSizeB, 5);
  });

  it("readAppSettingsFile respects userId scoping", async () => {
    saveSettings(
      { ...defaultSettings, export: { ...defaultSettings.export, maxVersionsToKeep: 25 } },
      "user_a",
    );

    const settingsA = await readAppSettingsFile("user_a");
    assert.equal(settingsA.export.maxVersionsToKeep, 25);

    const settingsB = await readAppSettingsFile("user_b");
    assert.equal(settingsB.export.maxVersionsToKeep, 10); // default
  });
});
