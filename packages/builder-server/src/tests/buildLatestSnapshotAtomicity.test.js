/**
 * buildLatestSnapshot atomicity test suite.
 *
 * Pins that rebuilding a theme's latest/ snapshot never exposes readers to a
 * missing or half-built tree: the snapshot is layered into a temp sibling and
 * swapped in only once complete, so a rebuild that fails midway leaves the
 * previous latest/ untouched (and a successful one leaves no temp behind).
 *
 * Run with: node --test packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment (env set before the dynamic config import)
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-latest-atomicity-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence production console output
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getThemeDir, getThemeLatestDir } = await import("../config.js");
const { buildLatestSnapshot } = await import("../controllers/themeController.js");
const { closeDb } = await import("../db/index.js");

const THEME_ID = "atomic-theme";

async function seedTheme() {
  const themeDir = getThemeDir(THEME_ID);
  await fs.outputJson(path.join(themeDir, "theme.json"), { name: "Atomic", version: "1.0.0" });
  await fs.outputFile(path.join(themeDir, "layout.liquid"), "<!-- base -->");
  await fs.outputJson(path.join(themeDir, "updates", "1.1.0", "theme.json"), {
    name: "Atomic",
    version: "1.1.0",
  });
  await fs.outputFile(path.join(themeDir, "updates", "1.1.0", "layout.liquid"), "<!-- v1.1.0 -->");
  return themeDir;
}

describe("buildLatestSnapshot atomicity", () => {
  before(async () => {
    await fs.ensureDir(TEST_THEMES_DIR); // empty seed root; seed-sync is a no-op
    await seedTheme();
  });

  after(async () => {
    closeDb();
    await fs.remove(TEST_ROOT);
  });

  it("builds latest/ and leaves no temp sibling behind", async () => {
    await buildLatestSnapshot(THEME_ID);

    const latestDir = getThemeLatestDir(THEME_ID);
    assert.deepEqual((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
    assert.equal(await fs.readFile(path.join(latestDir, "layout.liquid"), "utf8"), "<!-- v1.1.0 -->");
    assert.equal(await fs.pathExists(path.join(getThemeDir(THEME_ID), "latest.tmp")), false);
  });

  it("concurrent rebuilds of the same theme never leave latest/ missing or torn", async () => {
    const themeDir = getThemeDir(THEME_ID);
    const latestDir = getThemeLatestDir(THEME_ID);
    // Widen the race window: enough files that layering spans many awaits.
    for (let i = 0; i < 40; i++) {
      await fs.outputFile(path.join(themeDir, "widgets", `w${i}.liquid`), "base");
      await fs.outputFile(path.join(themeDir, "updates", "1.1.0", "widgets", `w${i}.liquid`), "v1.1.0");
    }

    for (let round = 0; round < 10; round++) {
      await Promise.all([
        buildLatestSnapshot(THEME_ID),
        buildLatestSnapshot(THEME_ID),
        buildLatestSnapshot(THEME_ID),
      ]);
      assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0", `round ${round}: version`);
      for (let i = 0; i < 40; i++) {
        assert.equal(
          await fs.readFile(path.join(latestDir, "widgets", `w${i}.liquid`), "utf8"),
          "v1.1.0",
          `round ${round}: w${i}`,
        );
      }
      assert.equal(await fs.pathExists(path.join(themeDir, "latest.tmp")), false, `round ${round}: temp left`);
    }
  });

  it("recovers a crash-parked latest.old at the next build", async () => {
    const themeDir = getThemeDir(THEME_ID);
    const latestDir = getThemeLatestDir(THEME_ID);

    // Simulate a crash between the two promotion renames: the previous good
    // snapshot sits at latest.old and latest/ is missing.
    await buildLatestSnapshot(THEME_ID);
    await fs.rename(latestDir, path.join(themeDir, "latest.old"));

    // The next build fails midway (poisoned base) — the parked snapshot must
    // have been restored first, so a serving latest/ still exists.
    const poison = path.join(themeDir, "poison.liquid");
    await fs.outputFile(poison, "unreadable");
    await fs.chmod(poison, 0o000);
    try {
      await assert.rejects(() => buildLatestSnapshot(THEME_ID));
      assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
    } finally {
      await fs.chmod(poison, 0o644);
      await fs.remove(poison);
    }

    // And a healthy build afterwards leaves a clean state.
    await buildLatestSnapshot(THEME_ID);
    assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
    assert.equal(await fs.pathExists(path.join(themeDir, "latest.old")), false);
  });

  it("a failure to delete the set-aside tree doesn't fail a completed promotion", async () => {
    const themeDir = getThemeDir(THEME_ID);
    const latestDir = getThemeLatestDir(THEME_ID);

    // A good snapshot whose tree can't be recursively removed (unreadable
    // subdir) — after promotion, deleting it as latest.old will fail.
    await buildLatestSnapshot(THEME_ID);
    const locked = path.join(latestDir, "locked");
    await fs.outputFile(path.join(locked, "secret.txt"), "x"); // non-empty: deletion must list it
    await fs.chmod(locked, 0o000);

    const oldDir = path.join(themeDir, "latest.old");
    try {
      // The new snapshot went live, so the build must still resolve…
      await buildLatestSnapshot(THEME_ID);
      assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
      assert.equal(await fs.pathExists(path.join(latestDir, "locked")), false);
      // …with the undeletable old tree left parked (cleaned by a later build).
      assert.equal(await fs.pathExists(oldDir), true);
    } finally {
      await fs.chmod(path.join(oldDir, "locked"), 0o755).catch(() => {});
      await fs.remove(oldDir);
    }
  });

  it("a corrupt update makes the rebuild fail loudly instead of promoting a partial snapshot", async () => {
    const themeDir = getThemeDir(THEME_ID);
    const latestDir = getThemeLatestDir(THEME_ID);

    // Baseline: a good v1.1.0 snapshot.
    await buildLatestSnapshot(THEME_ID);
    assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");

    // A v1.2.0 update whose theme.json is fine (passes validation) but whose
    // payload can't be copied.
    const v120 = path.join(themeDir, "updates", "1.2.0");
    await fs.outputJson(path.join(v120, "theme.json"), { name: "Atomic", version: "1.2.0" });
    const unreadable = path.join(v120, "broken.liquid");
    await fs.outputFile(unreadable, "unreadable");
    await fs.chmod(unreadable, 0o000);

    try {
      // Silently promoting base + "whatever applied" as the newest version is
      // the failure mode this pins against: the build must reject…
      await assert.rejects(() => buildLatestSnapshot(THEME_ID));
      // …and the previous complete snapshot must still be what readers see.
      assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
    } finally {
      await fs.chmod(unreadable, 0o644);
      await fs.remove(v120);
    }
  });

  it("a failed rebuild leaves the previous latest/ intact (and no temp behind)", async () => {
    const themeDir = getThemeDir(THEME_ID);
    const latestDir = getThemeLatestDir(THEME_ID);

    // Baseline: a good v1.1.0 snapshot exists (from the test above or built here).
    await buildLatestSnapshot(THEME_ID);
    assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");

    // A new update arrives…
    await fs.outputJson(path.join(themeDir, "updates", "1.2.0", "theme.json"), {
      name: "Atomic",
      version: "1.2.0",
    });
    // …but the rebuild will fail midway: an unreadable file in the theme root
    // makes the base-copy phase throw (mode 000; validation never reads it).
    const poison = path.join(themeDir, "poison.liquid");
    await fs.outputFile(poison, "unreadable");
    await fs.chmod(poison, 0o000);

    try {
      await assert.rejects(() => buildLatestSnapshot(THEME_ID));

      // Readers must still find the complete previous snapshot, not a missing
      // or half-built latest/.
      assert.equal(await fs.pathExists(path.join(latestDir, "theme.json")), true, "latest/ was lost");
      assert.equal((await fs.readJson(path.join(latestDir, "theme.json"))).version, "1.1.0");
      assert.equal(await fs.readFile(path.join(latestDir, "layout.liquid"), "utf8"), "<!-- v1.1.0 -->");
      assert.equal(await fs.pathExists(path.join(themeDir, "latest.tmp")), false, "temp left behind");
    } finally {
      await fs.chmod(poison, 0o644);
      await fs.remove(poison);
      await fs.remove(path.join(themeDir, "updates", "1.2.0"));
    }
  });
});
