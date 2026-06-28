/**
 * Preset → collections seeding test suite (new-arch port).
 *
 * Ported from the upstream monolith test (server/tests/collectionPresetSeeding.test.js)
 * to the package-split / scope-first builder-server. Covers the BLOCKER-1
 * resolution boundary on the creation side:
 *  - resolvePresetPaths returns collectionsDir (item data) when the preset ships
 *    a collections/ folder, null when it doesn't, and NEVER a collectionTypesDir
 *    (collection-type schemas are theme-only).
 *  - seedPresetCollections copies item DATA with fresh uuids/timestamps and skips
 *    items whose type the (theme-owned) collection-types schemas don't define.
 *  - Preset menu collectionItemUuid refs are remapped to the freshly seeded uuid.
 *
 * NEW-ARCH NOTES (vs. upstream):
 *  - The upstream helpers getProjectCollectionSchemaPath / getProjectCollectionItemPath /
 *    getThemePresetDir-as-source DO NOT EXIST in the same shape. We use, from config.js:
 *    getProjectDir(folder) + hand-built paths for collection-types/<type>/schema.json
 *    and collections/<type>/<slug>.json, and getThemePresetDir(theme, preset) for the
 *    preset dir. resolvePresetPaths resolves the preset under getThemeSourceDir(theme),
 *    which returns getThemeDir(theme) when there is no latest/theme.json — so writing
 *    the preset under getThemePresetDir(theme, preset) (= getThemeDir/presets/<preset>)
 *    IS the resolved source dir for these tests.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionPresetSeeding.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preset-coll-seed-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
// The unknown-type skip warns intentionally — silence it during the run.
console.warn = () => {};

const { getProjectDir, getProjectMenusDir, getProjectPagesDir, getThemePresetDir } =
  await import("../config.js");
const { resolvePresetPaths } = await import("../controllers/themeController.js");
const { seedPresetCollections } = await import("../controllers/projectController.js");
const { closeDb } = await import("../db/index.js");

const FOLDER = "preset-coll-seed-project";

// Collection schema path: getProjectDir(folder)/collection-types/<type>/schema.json
const schemaPath = (folder, type) =>
  path.join(getProjectDir(folder), "collection-types", type, "schema.json");
// Collection item path: getProjectDir(folder)/collections/<type>/<slug>.json
const itemPath = (folder, type, slug) =>
  path.join(getProjectDir(folder), "collections", type, `${slug}.json`);

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
});

beforeEach(async () => {
  await fs.remove(getProjectDir(FOLDER));
  // seedPresetCollections runs remapCollectionItemLinkRefs, which scans the
  // project's pages/ dir (always present after scaffoldProjectContent in the real
  // create flow) — ensure it exists so the fixture mirrors a scaffolded project.
  await fs.ensureDir(getProjectPagesDir(FOLDER));
});

describe("resolvePresetPaths — collections", () => {
  before(async () => {
    // preset WITH a collections/ folder (item data) — getThemeSourceDir falls back
    // to getThemeDir when there is no latest/theme.json, so the preset dir under
    // getThemePresetDir IS the resolved source preset dir.
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
    assert.ok(!("collectionTypesDir" in result), "must never expose a collectionTypesDir");
  });
});

describe("seedPresetCollections", () => {
  it("seeds item data with fresh uuids/timestamps and skips unknown types", async () => {
    // theme-owned schema (only "posts" is defined in the project's collection-types/)
    await fs.outputJson(schemaPath(FOLDER, "posts"), {
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

    // known type seeded, with a regenerated uuid + fresh timestamps + preserved settings
    const seeded = await fs.readJson(itemPath(FOLDER, "posts", "hello"));
    assert.equal(seeded.settings.title, "Hello World");
    assert.notEqual(seeded.uuid, "ORIGINAL-UUID");
    assert.notEqual(seeded.created, "2000-01-01T00:00:00.000Z");
    assert.notEqual(seeded.updated, "2000-01-01T00:00:00.000Z");

    // unknown type skipped (theme defines no "events" collection)
    assert.equal(await fs.pathExists(itemPath(FOLDER, "events", "expo")), false);
  });

  it("stamps richtext page + item links on seeded collection-item bodies (LINK-022→025)", async () => {
    await fs.outputJson(schemaPath(FOLDER, "posts"), {
      type: "posts",
      schemaVersion: 1,
      displayName: "Post",
      displayNamePlural: "Posts",
      icon: "FileText",
      hasItemPages: true,
      slugPrefix: "blog",
      settings: [
        { type: "text", id: "title", usedAsTitle: true },
        { type: "richtext", id: "body" },
      ],
    });
    // A page the richtext links to (exists at seed time).
    await fs.outputJson(path.join(getProjectPagesDir(FOLDER), "about.json"), {
      id: "about",
      slug: "about",
      uuid: "ABOUT-UUID",
      widgets: {},
    });
    // Two preset items: hello's body links to the page (slug href) and to the other item
    // (slugPrefix/slug href). Preset items carry NO uuid; the seed assigns fresh ones.
    const presetCollections = path.join(TEST_ROOT, "preset-collections");
    await fs.outputJson(path.join(presetCollections, "posts", "world.json"), { slug: "world", settings: { title: "World" } });
    await fs.outputJson(path.join(presetCollections, "posts", "hello.json"), {
      slug: "hello",
      settings: { title: "Hello", body: '<a href="about.html">A</a><a href="blog/world.html">W</a>' },
    });

    await seedPresetCollections(FOLDER, presetCollections);

    const hello = await fs.readJson(itemPath(FOLDER, "posts", "hello"));
    const world = await fs.readJson(itemPath(FOLDER, "posts", "world"));
    assert.ok(hello.settings.body.includes('data-page-uuid="ABOUT-UUID"'), hello.settings.body);
    assert.ok(hello.settings.body.includes(`data-collection-item-uuid="${world.uuid}"`), hello.settings.body);
  });

  it("remaps preset menu collectionItemUuid refs to the freshly seeded uuid (#11)", async () => {
    await fs.outputJson(schemaPath(FOLDER, "posts"), {
      type: "posts",
      schemaVersion: 1,
      displayName: "Post",
      displayNamePlural: "Posts",
      icon: "FileText",
      hasItemPages: true,
      slugPrefix: "blog",
      settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
    });

    const presetCollections = path.join(TEST_ROOT, "preset-collections-menu");
    await fs.outputJson(path.join(presetCollections, "posts", "hello.json"), {
      id: "hello",
      slug: "hello",
      uuid: "PRESET-UUID",
      settings: { title: "Hello" },
    });

    // a project menu (e.g. shipped by a preset template) pointing at the preset item
    await fs.outputJson(path.join(getProjectMenusDir(FOLDER), "main.json"), {
      id: "main",
      uuid: "menu-main",
      name: "Main",
      items: [
        {
          id: "i1",
          label: "Hello",
          link: "blog/hello.html",
          collectionType: "posts",
          collectionItemUuid: "PRESET-UUID",
        },
      ],
    });

    await seedPresetCollections(FOLDER, presetCollections);

    const seeded = await fs.readJson(itemPath(FOLDER, "posts", "hello"));
    const menu = await fs.readJson(path.join(getProjectMenusDir(FOLDER), "main.json"));
    assert.notEqual(seeded.uuid, "PRESET-UUID"); // uuid regenerated on seed
    assert.equal(menu.items[0].collectionItemUuid, seeded.uuid); // menu ref remapped to it
  });
});
