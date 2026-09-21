/**
 * Translation groups: creating a page's or an item's version in another
 * language, and reading a group's members.
 *
 * A group has no root and no owner. Its members find each other by a shared
 * `translationGroupId`, so deleting any one of them leaves the rest joined, and
 * a group holds at most one version per language.
 *
 * Run with: node --test packages/builder-server/src/tests/translationGroups.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-translations-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const pageController = await import("../controllers/pageController.js");
const collectionController = await import("../controllers/collectionController.js");
const translationController = await import("../controllers/translationController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "translations-test-uuid";
const PROJECT_FOLDER = "translations-test-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const projectBase = () => getProjectDir(PROJECT_FOLDER);
const project = () => projectRepo.getProjectById(PROJECT_ID);

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { id: "title", type: "text", usedAsTitle: true, required: true },
    { id: "body", type: "richtext" },
  ],
};

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    set() {
      return res;
    },
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

// Mutable per-test item cap; unbounded is the OSS default.
let itemLimit = Infinity;
const limits = { getLimit: async () => itemLimit };

const call = async (fn, { params = {}, body = {}, query = {}, storage: override } = {}) => {
  const res = mockRes();
  await fn(
    { scope, activeProject: project(), adapters: { storage: override || storage, assetStorage, limits }, params, body, query },
    res,
  );
  return res;
};

const readPage = (slug, language) =>
  fs.readJSON(path.join(projectBase(), "pages", ...(language ? [language] : []), `${slug}.json`));
const readItem = (slug, language) =>
  fs.readJSON(path.join(projectBase(), "collections", "news", ...(language ? [language] : []), `${slug}.json`));

before(() => {
  projectRepo.createProject({
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Translations Test",
    theme: "__t__",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  itemLimit = Infinity;
  await fs.remove(projectBase());
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el", "it"] });
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  await fs.ensureDir(path.join(projectBase(), "pages", "global"));
});

/** An English page that has never been translated, so it stands alone. */
async function seedPage(slug = "about", extra = {}) {
  const page = { id: slug, slug, uuid: `u-${slug}`, name: "About", widgets: {}, ...extra };
  await storage.write(scope, `pages/${slug}.json`, JSON.stringify(page));
  return page;
}

async function seedItem(slug = "story", extra = {}) {
  const item = {
    id: slug,
    uuid: `u-item-${slug}`,
    slug,
    schemaVersion: 1,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    settings: { title: "Story", body: "<p>Hello</p>" },
    ...extra,
  };
  await storage.write(scope, `collections/news/${slug}.json`, JSON.stringify(item));
  return item;
}

const createPageVersion = (slug, body, query, storageOverride) =>
  call(pageController.createPageLanguageVersion, { params: { id: slug }, body, query, storage: storageOverride });

const createItemVersion = (slug, body, query, storageOverride) =>
  call(collectionController.createItemLanguageVersion, {
    params: { collectionType: "news", itemSlug: slug },
    body,
    query,
    storage: storageOverride,
  });

/** A storage view whose read throws for the key matching `match`. */
const unreadable = (match) => ({
  ...storage,
  read: async (scope, key) => {
    if (key.includes(match)) throw new Error("corrupt file");
    return storage.read(scope, key);
  },
  write: async (scope, key, content) => storage.write(scope, key, content),
  list: async (scope, dir) => storage.list(scope, dir),
  exists: async (scope, key) => storage.exists(scope, key),
  delete: async (scope, key) => storage.delete(scope, key),
});

describe("create a page's version in another language", () => {
  it("copies it into the language folder and joins both to one group", async () => {
    const source = await seedPage();
    const res = await createPageVersion("about", { targetLanguage: "el" });

    assert.equal(res._status, 201);
    assert.equal(res._json.language, "el");
    assert.equal(res._json.slug, "about", "the slug is the source's — slugs are unique per language");
    assert.notEqual(res._json.uuid, source.uuid);
    assert.equal(res._json.translationGroupId, source.uuid, "the group is named after the page that had none");

    const onDisk = await readPage("about", "el");
    assert.equal(onDisk.uuid, res._json.uuid);
    assert.equal("language" in onDisk, false, "the folder says the language, the file never does");

    // The source is NOT rewritten: it already answers to its own uuid, and
    // saving a snapshot read earlier would undo an edit made in between.
    assert.deepEqual(await readPage("about"), source);
  });

  it("takes a different slug when one is given, and keeps it unique in that folder", async () => {
    await seedPage();
    const first = await createPageVersion("about", { targetLanguage: "el", slug: "sxetika" });
    assert.equal(first._json.slug, "sxetika");

    // A second, unrelated Greek page already holding that slug pushes the next one aside.
    await seedPage("careers");
    const second = await createPageVersion("careers", { targetLanguage: "el", slug: "sxetika" });
    assert.equal(second._json.slug, "sxetika-1");
  });

  it("refuses a second version in a language the group already has", async () => {
    await seedPage();
    assert.equal((await createPageVersion("about", { targetLanguage: "el" }))._status, 201);

    const again = await createPageVersion("about", { targetLanguage: "el" });
    assert.equal(again._status, 409);
    assert.match(again._json.message, /already exists/);
  });

  it("creates from a translation as readily as from the source, joining the same group", async () => {
    const source = await seedPage();
    await createPageVersion("about", { targetLanguage: "el" });

    // Now translate the GREEK one into Italian: same group, three members.
    const italian = await createPageVersion("about", { targetLanguage: "it" }, { language: "el" });
    assert.equal(italian._status, 201);
    assert.equal(italian._json.translationGroupId, source.uuid);
  });

  it("refuses its own language, an unknown one, and a missing page", async () => {
    await seedPage();
    assert.equal((await createPageVersion("about", { targetLanguage: "en" }))._status, 400);
    assert.equal((await createPageVersion("about", { targetLanguage: "fr" }))._status, 400);
    assert.equal((await createPageVersion("ghost", { targetLanguage: "el" }))._status, 404);
  });

  it("keeps a listing anchor, unlike a duplicate", async () => {
    await seedPage("blog", { widgets: { w1: { type: "news-grid", settings: { listing_anchor: true } } } });
    const res = await createPageVersion("blog", { targetLanguage: "el" });
    assert.equal(res._json.widgets.w1.settings.listing_anchor, true);
  });
});

describe("create an item's version in another language", () => {
  it("copies the settings, joins the group, and appends to that language's order", async () => {
    const source = await seedItem();
    const res = await createItemVersion("story", { targetLanguage: "el" });

    assert.equal(res._status, 201);
    assert.equal(res._json.language, "el");
    assert.equal(res._json.slug, "story");
    assert.equal(res._json.translationGroupId, source.uuid);
    assert.deepEqual(res._json.settings.title, "Story");

    const onDisk = await readItem("story", "el");
    assert.equal("language" in onDisk, false);
    assert.deepEqual(await readItem("story"), source, "the source is left exactly as it was");

    const order = await fs.readJSON(path.join(projectBase(), "collections", "news", "el", "_order.json"));
    assert.deepEqual(order.order, ["story"]);
  });

  it("refuses a second version in a language the group already has", async () => {
    await seedItem();
    assert.equal((await createItemVersion("story", { targetLanguage: "el" }))._status, 201);
    const again = await createItemVersion("story", { targetLanguage: "el" });
    assert.equal(again._status, 409);
  });

  it("refuses its own language, an unknown one, and a missing item", async () => {
    await seedItem();
    assert.equal((await createItemVersion("story", { targetLanguage: "en" }))._status, 400);
    assert.equal((await createItemVersion("story", { targetLanguage: "fr" }))._status, 400);
    assert.equal((await createItemVersion("ghost", { targetLanguage: "el" }))._status, 404);
  });
});

describe("a duplicate is never a translation", () => {
  it("gives a duplicated page and item a group of their own", async () => {
    await seedPage();
    await seedItem();
    await createPageVersion("about", { targetLanguage: "el" });

    const page = await call(pageController.duplicatePage, { params: { id: "about" } });
    assert.equal(page._status, 201);
    assert.equal(page._json.translationGroupId, page._json.uuid);
    assert.notEqual(page._json.translationGroupId, "u-about");

    const item = await call(collectionController.duplicateItem, {
      params: { collectionType: "news", itemSlug: "story" },
    });
    assert.equal(item._status, 201);
    assert.equal(item._json.translationGroupId, item._json.uuid);
  });
});

describe("reading a group", () => {
  const groupOf = (groupId) => call(translationController.getTranslationGroup, { params: { groupId } });

  it("lists every language a page exists in, and an item group separately", async () => {
    await seedPage();
    await seedItem();
    await createPageVersion("about", { targetLanguage: "el", slug: "sxetika" });
    await createPageVersion("about", { targetLanguage: "it" });
    await createItemVersion("story", { targetLanguage: "el", slug: "istoria" });

    const pages = await groupOf("u-about");
    assert.deepEqual(
      pages._json.members.map((m) => [m.kind, m.language, m.slug]),
      [
        ["page", "en", "about"],
        ["page", "el", "sxetika"],
        ["page", "it", "about"],
      ],
    );

    const items = await groupOf("u-item-story");
    assert.deepEqual(
      items._json.members.map((m) => [m.kind, m.collectionType, m.language, m.slug]),
      [
        ["item", "news", "en", "story"],
        ["item", "news", "el", "istoria"],
      ],
    );
  });

  it("survives the deletion of any member — the rest stay joined", async () => {
    await seedPage();
    await createPageVersion("about", { targetLanguage: "el" });
    await createPageVersion("about", { targetLanguage: "it" });

    // Delete the English page the group happens to be named after.
    const deleted = await call(pageController.deletePage, { params: { id: "about" } });
    assert.equal(deleted._status, 200);

    const group = await groupOf("u-about");
    assert.deepEqual(
      group._json.members.map((m) => m.language),
      ["el", "it"],
      "the group is a shared id, not a pointer to one page",
    );
  });

  it("returns an empty list for a group nothing belongs to", async () => {
    const res = await groupOf("nobody");
    assert.deepEqual(res._json, { groupId: "nobody", members: [] });
  });
});

describe("one version per language, under pressure", () => {
  it("lets only one of two simultaneous page versions into a language", async () => {
    await seedPage();
    const results = await Promise.all([
      createPageVersion("about", { targetLanguage: "el", slug: "first" }),
      createPageVersion("about", { targetLanguage: "el", slug: "second" }),
    ]);

    assert.deepEqual(results.map((r) => r._status).sort(), [201, 409]);
    const greek = await fs.readdir(path.join(projectBase(), "pages", "el"));
    assert.equal(greek.length, 1, `exactly one Greek page, got ${greek.join(", ")}`);
  });

  it("lets only one of two simultaneous item versions into a language", async () => {
    await seedItem();
    const results = await Promise.all([
      createItemVersion("story", { targetLanguage: "el", slug: "first" }),
      createItemVersion("story", { targetLanguage: "el", slug: "second" }),
    ]);

    assert.deepEqual(results.map((r) => r._status).sort(), [201, 409]);
    const greek = (await fs.readdir(path.join(projectBase(), "collections", "news", "el"))).filter(
      (name) => name !== "_order.json",
    );
    assert.equal(greek.length, 1, `exactly one Greek item, got ${greek.join(", ")}`);
  });

  it("refuses when it cannot read a file that might already be the group's member", async () => {
    await seedPage();
    await seedItem();
    assert.equal((await createPageVersion("about", { targetLanguage: "el" }))._status, 201);
    assert.equal((await createItemVersion("story", { targetLanguage: "el" }))._status, 201);

    // The existing Greek member is unreadable: "absent" would be a guess, and a
    // wrong one would put a second member in the same language.
    const page = await createPageVersion("about", { targetLanguage: "el", slug: "other" }, {}, unreadable("pages/el/"));
    assert.equal(page._status, 500);
    assert.match(page._json.message, /could not be read/);
    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el", "other.json")), false);

    const item = await createItemVersion(
      "story",
      { targetLanguage: "el", slug: "other" },
      {},
      unreadable("collections/news/el/"),
    );
    assert.equal(item._status, 500);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "other.json")), false);
  });
});

describe("content written before uuids existed", () => {
  it("refuses to translate a page with no stable id, twice over", async () => {
    // No uuid and no group: any id named after it would differ per request, so
    // the versions could never find each other or enforce one-per-language.
    await storage.write(scope, "pages/legacy.json", JSON.stringify({ id: "legacy", slug: "legacy", widgets: {} }));

    const first = await createPageVersion("legacy", { targetLanguage: "el", slug: "one" });
    assert.equal(first._status, 409);
    assert.match(first._json.message, /no stable id/);

    const second = await createPageVersion("legacy", { targetLanguage: "el", slug: "two" });
    assert.equal(second._status, 409);
    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el")), false, "nothing was created");
  });

  it("refuses to translate an item with no stable id", async () => {
    await storage.write(
      scope,
      "collections/news/legacy.json",
      JSON.stringify({ id: "legacy", slug: "legacy", schemaVersion: 1, settings: { title: "Legacy" } }),
    );

    const first = await createItemVersion("legacy", { targetLanguage: "el", slug: "one" });
    assert.equal(first._status, 409);
    assert.match(first._json.message, /no stable id/);

    const second = await createItemVersion("legacy", { targetLanguage: "el", slug: "two" });
    assert.equal(second._status, 409);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el")), false);
  });

  it("translates it once it has been saved and stamped", async () => {
    await storage.write(scope, "pages/legacy.json", JSON.stringify({ id: "legacy", slug: "legacy", widgets: {} }));
    assert.equal((await createPageVersion("legacy", { targetLanguage: "el" }))._status, 409);

    // An ordinary save is what gives it a uuid.
    const saved = await call(pageController.savePageContent, {
      params: { id: "legacy" },
      body: { slug: "legacy", name: "Legacy", widgets: {} },
    });
    assert.equal(saved._status, 200);

    const res = await createPageVersion("legacy", { targetLanguage: "el" });
    assert.equal(res._status, 201);
    assert.equal(res._json.translationGroupId, (await readPage("legacy")).uuid);
  });
});

describe("a translation is an item like any other", () => {
  it("counts against the collection's item limit, across languages", async () => {
    await seedItem();
    itemLimit = 1;

    const res = await createItemVersion("story", { targetLanguage: "el" });
    assert.equal(res._status, 422);
    assert.match(res._json.error, /item limit \(1\)/);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el")), false);

    itemLimit = 2;
    assert.equal((await createItemVersion("story", { targetLanguage: "el" }))._status, 201);
  });

  it("never takes a reserved slug", async () => {
    await seedItem();
    const res = await createItemVersion("story", { targetLanguage: "el", slug: "index" });
    assert.equal(res._status, 201);
    assert.notEqual(res._json.slug, "index", "index is the collection's own address");
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "index.json")), false);

    const paged = await createItemVersion("story", { targetLanguage: "it", slug: "page" });
    assert.notEqual(paged._json.slug, "page", "page is the pagination segment");
  });
});
