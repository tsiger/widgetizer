/**
 * Preset → collections seeding test suite (Phase 9).
 *
 * Covers the BLOCKER-1 resolution boundary on the creation side:
 *  - resolvePresetPaths returns collectionsDir (item data) and never a
 *    collectionTypesDir (schemas are theme-only).
 *  - seedPresetCollections copies item DATA with fresh uuids/timestamps and
 *    skips items whose type the theme doesn't define.
 *
 * Run with: node --test server/tests/collectionPresetSeeding.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preset-seed-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const {
  getProjectDir,
  getProjectCollectionSchemaPath,
  getProjectCollectionItemPath,
  getThemePresetDir,
} = await import("../config.js");
const { resolvePresetPaths } = await import("../controllers/themeController.js");
const { seedPresetCollections } = await import("../controllers/projectController.js");
const { closeDb } = await import("../db/index.js");

const FOLDER = "preset-seed-project";

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
});

beforeEach(async () => {
  await fs.remove(getProjectDir(FOLDER));
});

describe("resolvePresetPaths — collections", () => {
  before(async () => {
    // preset WITH a collections/ folder (item data)
    const presetDir = getThemePresetDir("seed-theme", "blog");
    await fs.ensureDir(path.join(presetDir, "templates"));
    await fs.outputJson(path.join(presetDir, "collections", "posts", "hello.json"), {
      slug: "hello",
      settings: { title: "Hello" },
    });
    // preset WITHOUT collections/
    await fs.ensureDir(path.join(getThemePresetDir("seed-theme", "plain"), "templates"));
  });

  it("returns collectionsDir when the preset ships collections/, and never a collectionTypesDir", async () => {
    const result = await resolvePresetPaths("seed-theme", "blog");
    assert.ok(result.collectionsDir, "collectionsDir should resolve");
    assert.ok(result.collectionsDir.endsWith(path.join("blog", "collections")));
    assert.ok(!("collectionTypesDir" in result), "must never expose a collectionTypesDir");
  });

  it("returns null collectionsDir when the preset has none", async () => {
    const result = await resolvePresetPaths("seed-theme", "plain");
    assert.equal(result.collectionsDir, null);
  });
});

describe("seedPresetCollections", () => {
  it("seeds item data with fresh uuids/timestamps and skips unknown types", async () => {
    // theme-owned schema (only "posts" is defined)
    await fs.outputJson(getProjectCollectionSchemaPath(FOLDER, "posts"), {
      type: "posts",
      schemaVersion: 1,
      displayName: "Post",
      displayNamePlural: "Posts",
      icon: "FileText",
      hasItemPages: true,
      slugPrefix: "blog",
      settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
    });

    // preset collections: a known "posts" item + an unknown "events" item
    const presetCollections = path.join(TEST_ROOT, "preset-collections");
    await fs.outputJson(path.join(presetCollections, "posts", "hello.json"), {
      id: "hello",
      slug: "hello",
      uuid: "ORIGINAL-UUID",
      created: "2000-01-01T00:00:00.000Z",
      updated: "2000-01-01T00:00:00.000Z",
      settings: { title: "Hello World" },
    });
    await fs.outputJson(path.join(presetCollections, "events", "expo.json"), {
      slug: "expo",
      settings: { title: "Expo" },
    });

    await seedPresetCollections(FOLDER, presetCollections);

    // known type seeded, with a regenerated uuid + fresh timestamps
    const seeded = await fs.readJson(getProjectCollectionItemPath(FOLDER, "posts", "hello"));
    assert.equal(seeded.settings.title, "Hello World");
    assert.notEqual(seeded.uuid, "ORIGINAL-UUID");
    assert.notEqual(seeded.created, "2000-01-01T00:00:00.000Z");

    // unknown type skipped (theme defines no "events" collection)
    assert.equal(
      await fs.pathExists(getProjectCollectionItemPath(FOLDER, "events", "expo")),
      false,
    );
  });
});
