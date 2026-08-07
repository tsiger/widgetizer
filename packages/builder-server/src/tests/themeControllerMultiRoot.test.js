/**
 * Multi-root theme seeding tests.
 *
 * Covers the four themeController sites that read seed themes once more than one
 * seed root is configured (THEMES_EXTRA_ROOTS + THEMES_ROOT):
 *  - ensureThemesDirectory: installs themes that exist only in an extra root, and
 *    installs a shadowed theme from the FIRST root that owns it (whole-dir).
 *  - getThemeVersions: reads updates/ from the owning root only.
 *  - buildLatestSnapshot: syncs seed updates from the owning root.
 *  - resolvePresetPaths: resolves preset-media from the owning root.
 *
 * Env pattern: config.js reads DATA_ROOT / THEMES_ROOT / THEMES_EXTRA_ROOTS at
 * import time, so (as in themeUpdates.test.js and presetMediaSeeding.test.js)
 * the env is set before the dynamic import of config/controller. Each test file
 * runs in its own process under the Node test runner, so this stays isolated.
 *
 * Run with: node --test packages/builder-server/src/tests/themeControllerMultiRoot.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-multiroot-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const MAIN_SEED_DIR = path.join(TEST_ROOT, "themes");
const EXTRA_SEED_DIR = path.join(TEST_ROOT, "extra-themes");

const SHARED_THEME_ID = "shared-theme";
const EXTRA_ONLY_THEME_ID = "extra-only-theme";
const MAIN_ONLY_THEME_ID = "main-only-theme";
const PRESET_ID = "starter";

await fs.remove(TEST_ROOT);

// --- Extra root (searched first) --------------------------------------------
await fs.outputJson(path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "theme.json"), {
  name: "Shared Theme",
  version: "1.0.0",
  origin: "extra",
});
await fs.outputJson(path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "updates", "1.1.0", "theme.json"), {
  name: "Shared Theme",
  version: "1.1.0",
  origin: "extra",
});
await fs.outputFile(
  path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "updates", "1.1.0", "layout.liquid"),
  "<!-- extra v1.1.0 -->",
);
await fs.outputJson(path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "presets", PRESET_ID, "preset.json"), {
  name: "Starter",
});
await fs.outputFile(
  path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "preset-media", PRESET_ID, "manifest.json"),
  "{}",
);
await fs.outputJson(path.join(EXTRA_SEED_DIR, EXTRA_ONLY_THEME_ID, "theme.json"), {
  name: "Extra Only",
  version: "1.0.0",
});
// A directory with no theme.json must never be installed or shadow anything.
await fs.ensureDir(path.join(EXTRA_SEED_DIR, "not-a-theme"));

// --- Main root ---------------------------------------------------------------
await fs.outputJson(path.join(MAIN_SEED_DIR, SHARED_THEME_ID, "theme.json"), {
  name: "Shared Theme",
  version: "1.0.0",
  origin: "main",
});
await fs.outputJson(path.join(MAIN_SEED_DIR, SHARED_THEME_ID, "updates", "1.2.0", "theme.json"), {
  name: "Shared Theme",
  version: "1.2.0",
  origin: "main",
});
await fs.outputFile(
  path.join(MAIN_SEED_DIR, SHARED_THEME_ID, "preset-media", PRESET_ID, "manifest.json"),
  "{}",
);
await fs.outputJson(path.join(MAIN_SEED_DIR, MAIN_ONLY_THEME_ID, "theme.json"), {
  name: "Main Only",
  version: "1.0.0",
});

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = MAIN_SEED_DIR;
process.env.THEMES_EXTRA_ROOTS = EXTRA_SEED_DIR;
process.env.NODE_ENV = "test";

const { getThemeDir, getThemesDir } = await import("../config.js");
const { ensureThemesDirectory, getThemeVersions, buildLatestSnapshot, resolvePresetPaths } = await import(
  "../controllers/themeController.js"
);

before(async () => {
  await ensureThemesDirectory();
});

after(async () => {
  await fs.remove(TEST_ROOT);
});

describe("ensureThemesDirectory across multiple seed roots", () => {
  it("installs themes from every root", async () => {
    const installed = (await fs.readdir(getThemesDir())).sort();
    assert.deepEqual(installed, [EXTRA_ONLY_THEME_ID, MAIN_ONLY_THEME_ID, SHARED_THEME_ID].sort());
  });

  it("installs a shadowed theme from the first root that owns it", async () => {
    const themeJson = await fs.readJson(path.join(getThemeDir(SHARED_THEME_ID), "theme.json"));
    assert.equal(themeJson.origin, "extra");
  });

  it("installs the owning root's updates/, not the shadowed root's", async () => {
    const updates = await fs.readdir(path.join(getThemeDir(SHARED_THEME_ID), "updates"));
    assert.deepEqual(updates, ["1.1.0"]);
  });

  it("still skips preset-media/ when copying from an extra root", async () => {
    const exists = await fs.pathExists(path.join(getThemeDir(SHARED_THEME_ID), "preset-media"));
    assert.ok(!exists, "preset-media/ should not be copied into the installed theme");
  });

  it("does not install a directory without theme.json", async () => {
    const exists = await fs.pathExists(path.join(getThemesDir(), "not-a-theme"));
    assert.ok(!exists, "a dir without theme.json is not a theme");
  });
});

describe("getThemeVersions across multiple seed roots", () => {
  it("reads seed updates from the owning root only", async () => {
    const versions = await getThemeVersions(SHARED_THEME_ID);
    assert.deepEqual(versions, ["1.0.0", "1.1.0"]);
  });

  it("returns only the base version for a theme with no seed root", async () => {
    const orphanId = "__orphan_theme__";
    const orphanDir = getThemeDir(orphanId);
    try {
      await fs.outputJson(path.join(orphanDir, "theme.json"), { name: "Orphan", version: "2.0.0" });
      assert.deepEqual(await getThemeVersions(orphanId), ["2.0.0"]);
    } finally {
      await fs.remove(orphanDir);
    }
  });
});

describe("buildLatestSnapshot across multiple seed roots", () => {
  it("syncs seed updates from the owning root and layers them", async () => {
    await buildLatestSnapshot(SHARED_THEME_ID);
    const latestThemeJson = await fs.readJson(path.join(getThemeDir(SHARED_THEME_ID), "latest", "theme.json"));
    assert.equal(latestThemeJson.version, "1.1.0");
    assert.equal(latestThemeJson.origin, "extra");
    const syncedUpdates = await fs.readdir(path.join(getThemeDir(SHARED_THEME_ID), "updates"));
    assert.deepEqual(syncedUpdates, ["1.1.0"], "the shadowed root's 1.2.0 must not be synced");
  });

  it("does not throw for a theme with no seed root", async () => {
    const orphanId = "__orphan_theme_snapshot__";
    const orphanDir = getThemeDir(orphanId);
    try {
      await fs.outputJson(path.join(orphanDir, "theme.json"), { name: "Orphan", version: "1.0.0" });
      await buildLatestSnapshot(orphanId);
      assert.ok(!(await fs.pathExists(path.join(orphanDir, "latest"))));
    } finally {
      await fs.remove(orphanDir);
    }
  });
});

describe("resolvePresetPaths across multiple seed roots", () => {
  it("resolves preset media from the owning root's seed", async () => {
    const { mediaDir } = await resolvePresetPaths(SHARED_THEME_ID, PRESET_ID);
    assert.equal(mediaDir, path.join(EXTRA_SEED_DIR, SHARED_THEME_ID, "preset-media", PRESET_ID));
  });
});
