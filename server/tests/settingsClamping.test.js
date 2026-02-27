/**
 * Settings Ceiling Clamping Test Suite
 *
 * Tests that updateAppSettings correctly clamps user-configurable values
 * to platform ceilings defined in EDITOR_LIMITS.
 *
 * Uses the same isolated test environment pattern as appSettings.test.js.
 *
 * Run with: node --test server/tests/settingsClamping.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-clamping-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.NODE_ENV = "test";

const { updateAppSettings, readAppSettingsFile } = await import("../controllers/appSettingsController.js");
const { saveSettings, defaultSettings } = await import("../db/repositories/settingsRepository.js");
const { getDb, closeDb } = await import("../db/index.js");
const { EDITOR_LIMITS } = await import("../limits.js");

// ============================================================================
// Test helpers
// ============================================================================

function mockReq({ body = {}, userId = "local", hostedMode = true } = {}) {
  return {
    body,
    userId,
    app: { locals: { hostedMode } },
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
  const db = getDb();
  db.prepare("DELETE FROM app_settings WHERE key LIKE 'config:%'").run();
  saveSettings({ ...defaultSettings }, "local");
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Media ceiling clamping
// ============================================================================

describe("Settings ceiling clamping — media", () => {
  it("clamps maxFileSizeMB to ceiling when exceeding", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 999 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
  });

  it("passes maxFileSizeMB through when under ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 10 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxFileSizeMB, 10);
  });

  it("clamps maxVideoSizeMB to ceiling when exceeding", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxVideoSizeMB: 9999 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxVideoSizeMB, EDITOR_LIMITS.media.maxVideoSizeMBCeiling);
  });

  it("passes maxVideoSizeMB through when under ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxVideoSizeMB: 100 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxVideoSizeMB, 100);
  });

  it("clamps maxAudioSizeMB to ceiling when exceeding", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxAudioSizeMB: 5000 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxAudioSizeMB, EDITOR_LIMITS.media.maxAudioSizeMBCeiling);
  });

  it("passes maxAudioSizeMB through when under ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxAudioSizeMB: 25 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxAudioSizeMB, 25);
  });

  it("clamps all three media fields independently in a single update", async () => {
    const res = await callController(updateAppSettings, {
      body: {
        media: {
          maxFileSizeMB: 999,
          maxVideoSizeMB: 9999,
          maxAudioSizeMB: 5000,
        },
      },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
    assert.equal(res._json.settings.media.maxVideoSizeMB, EDITOR_LIMITS.media.maxVideoSizeMBCeiling);
    assert.equal(res._json.settings.media.maxAudioSizeMB, EDITOR_LIMITS.media.maxAudioSizeMBCeiling);
  });

  it("clamping persists to disk", async () => {
    await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 999 } },
    });

    const saved = await readAppSettingsFile("local");
    assert.equal(saved.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
  });
});

// ============================================================================
// Export ceiling clamping
// ============================================================================

describe("Settings ceiling clamping — export", () => {
  it("clamps maxImportSizeMB to ceiling when exceeding", async () => {
    const res = await callController(updateAppSettings, {
      body: { export: { maxImportSizeMB: 99999 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.export.maxImportSizeMB, EDITOR_LIMITS.maxImportSizeMBCeiling);
  });

  it("passes maxImportSizeMB through when under ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { export: { maxImportSizeMB: 500 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.export.maxImportSizeMB, 500);
  });

  it("clamps maxVersionsToKeep to ceiling when exceeding", async () => {
    const res = await callController(updateAppSettings, {
      body: { export: { maxVersionsToKeep: 999 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.export.maxVersionsToKeep, EDITOR_LIMITS.maxExportVersionsCeiling);
  });

  it("passes maxVersionsToKeep through when under ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { export: { maxVersionsToKeep: 10 } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.export.maxVersionsToKeep, 10);
  });

  it("clamps both export fields independently in a single update", async () => {
    const res = await callController(updateAppSettings, {
      body: {
        export: {
          maxImportSizeMB: 99999,
          maxVersionsToKeep: 999,
        },
      },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.export.maxImportSizeMB, EDITOR_LIMITS.maxImportSizeMBCeiling);
    assert.equal(res._json.settings.export.maxVersionsToKeep, EDITOR_LIMITS.maxExportVersionsCeiling);
  });

  it("export clamping persists to disk", async () => {
    await callController(updateAppSettings, {
      body: { export: { maxVersionsToKeep: 999 } },
    });

    const saved = await readAppSettingsFile("local");
    assert.equal(saved.export.maxVersionsToKeep, EDITOR_LIMITS.maxExportVersionsCeiling);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe("Settings ceiling clamping — edge cases", () => {
  it("does not clamp values that are exactly at the ceiling", async () => {
    const res = await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: EDITOR_LIMITS.media.maxFileSizeMBCeiling } },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.settings.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
  });

  it("preserves other settings when clamping", async () => {
    // Set language first
    await callController(updateAppSettings, {
      body: { general: { language: "de" } },
    });

    // Now update media with oversized value
    await callController(updateAppSettings, {
      body: { media: { maxFileSizeMB: 999 } },
    });

    const saved = await readAppSettingsFile("local");
    assert.equal(saved.general.language, "de");
    assert.equal(saved.media.maxFileSizeMB, EDITOR_LIMITS.media.maxFileSizeMBCeiling);
    // imageProcessing should still be present
    assert.ok(saved.media.imageProcessing);
    assert.equal(saved.media.imageProcessing.quality, 85);
  });
});
