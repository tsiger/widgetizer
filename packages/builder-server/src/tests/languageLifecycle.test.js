/**
 * Language lifecycle against concurrent content writes.
 *
 * Removing a language deletes its content and then rewrites the project row. A
 * request validates its language when it arrives, against the row the middleware
 * loaded then — so a request that validated first and writes second used to recreate
 * a page, menu or item in a language the site no longer has. The orphan is invisible
 * to the editor and to export (both read the row) but visible to the media usage
 * rebuild (which scans the folders on disk), where it can hold an image hostage:
 * undeletable, blamed on content nobody can reach.
 *
 * Both orderings are tested for every write path, because which one is safe is not
 * obvious from the code:
 *
 *   - save finishes BEFORE removal — the save is ordinary, and removal must then
 *     clean up what it wrote.
 *   - removal finishes BEFORE the save lands — the save must be refused, having
 *     written nothing, so the editor can keep the work and stop retrying.
 *
 * A request that validated before removal is modelled by passing the project row as
 * it was then, which is exactly what `resolveActiveProject` leaves on the request.
 *
 * Run with: node --test packages/builder-server/src/tests/languageLifecycle.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-language-lifecycle-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { savePageContent, createPageLanguageVersion } = await import("../controllers/pageController.js");
const { saveGlobalWidget } = await import("../controllers/previewController.js");
const { updateMenu, getAllMenus } = await import("../controllers/menuController.js");
const collectionController = await import("../controllers/collectionController.js");
const { deleteLanguage } = await import("../controllers/languageController.js");
const { withContentWriteLock } = await import("../services/contentCoordination.js");
const { closeDb } = await import("../db/index.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "lang-lifecycle-uuid";
const PROJECT_FOLDER = "lang-lifecycle-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const limits = { getLimit: async () => Infinity };
const scope = { projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ id: "title", type: "text", usedAsTitle: true, required: true }],
};

after(async () => {
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

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
    setHeader() {
      return res;
    },
    set() {
      return res;
    },
  };
  return res;
}

async function call(fn, { params = {}, body = {}, query = {}, activeProject } = {}) {
  const res = mockRes();
  await fn(
    {
      params,
      body,
      query,
      scope,
      activeProject: activeProject ?? projectRepo.getProjectById(PROJECT_ID),
      adapters: { storage, assetStorage, limits },
      app: { locals: {} },
      [Symbol.for("express-validator#contexts")]: [],
    },
    res,
  );
  return res;
}

/**
 * A storage adapter with one method swapped out.
 *
 * Must be a Proxy with bound methods, NOT `Object.create(adapter)`: the local
 * adapter uses private class fields, so an inherited method called on a derived
 * object throws "Receiver must be an instance of class". Several callers swallow
 * read errors, so that failure does not surface — it just makes the code under
 * test quietly take an early exit, and the test passes while proving nothing.
 */
function storageWith(overrides) {
  return new Proxy(storage, {
    get(target, prop) {
      if (prop in overrides) return overrides[prop];
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function callWith(storageOverride, fn, { params = {}, body = {}, query = {}, activeProject } = {}) {
  const res = mockRes();
  await fn(
    {
      params,
      body,
      query,
      scope,
      activeProject: activeProject ?? projectRepo.getProjectById(PROJECT_ID),
      adapters: { storage: storageOverride, assetStorage, limits },
      app: { locals: {} },
      [Symbol.for("express-validator#contexts")]: [],
    },
    res,
  );
  return res;
}

const elPage = (slug) => path.join(getProjectPagesDir(PROJECT_FOLDER), "el", `${slug}.json`);
const elMenu = (id) => path.join(getProjectDir(PROJECT_FOLDER), "menus", "el", `${id}.json`);
const elItemDir = () => path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "el");
const elGlobal = (type) => path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "global", `${type}.json`);

/** Put the project back to en + el with content in both, and return the enabled row. */
async function seedBilingualProject() {
  await fs.remove(getProjectDir(PROJECT_FOLDER));
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el"] });

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));

  // Default-language sources, so translations have something to be a version of.
  await fs.outputJson(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json"),
    { uuid: "u-en-index", slug: "index", name: "Index", widgets: {}, translationGroupId: "u-en-index" },
    { spaces: 2 },
  );

  // Greek content of every shape the removal will have to clean up.
  await fs.outputJson(
    elPage("about"),
    { uuid: "u-el-about", slug: "about", name: "About", widgets: {} },
    { spaces: 2 },
  );
  await fs.outputJson(elGlobal("header"), { type: "theme-header", settings: { title: "Κεφαλίδα" } }, { spaces: 2 });
  await fs.outputJson(elMenu("main-menu"), { uuid: "m-el", id: "main-menu", name: "Κύριο", items: [] }, { spaces: 2 });

  return projectRepo.getProjectById(PROJECT_ID);
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Language Lifecycle",
        theme: "__lang_lifecycle_theme__",
        defaultLanguage: "en",
        languages: ["el"],
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
});

let enabledRow;
beforeEach(async () => {
  enabledRow = await seedBilingualProject();
});

// ============================================================================
// Ordering one: the save finishes first, and removal cleans up after it.
// ============================================================================

describe("a save that finishes before the language is removed", () => {
  it("saves normally, and removal then takes the content with it", async () => {
    const saved = await call(savePageContent, {
      params: { id: "about" },
      query: { language: "el" },
      body: { uuid: "u-el-about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] },
    });
    assert.equal(saved._status, 200, "an ordinary save in an enabled language must succeed");

    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    assert.equal(await fs.pathExists(elPage("about")), false, "removal must clean up what the save wrote");
    assert.deepEqual(projectRepo.getProjectById(PROJECT_ID).languages, []);
  });

  it("reports what it deleted, so nothing is silently left behind", async () => {
    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);
    assert.equal(removed._json.deleted.pages, 1, "the Greek page");
    assert.equal(removed._json.deleted.menus, 1, "the Greek menu");
  });
});

// ============================================================================
// Ordering two: removal finishes first, and the save lands afterwards.
// ============================================================================

describe("a save that lands after the language was removed", () => {
  /** Remove the language, and hand back the row as the late request still sees it. */
  async function removeLanguageUnderneath() {
    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200, "precondition: the language is gone");
    return enabledRow;
  }

  it("refuses a page content save, and writes nothing", async () => {
    const stale = await removeLanguageUnderneath();

    const res = await call(savePageContent, {
      params: { id: "about" },
      query: { language: "el" },
      activeProject: stale,
      body: { uuid: "u-el-about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(res._json.language, "el", "the editor needs to be able to name the language");
    assert.equal(await fs.pathExists(elPage("about")), false, "nothing may have been written");
  });

  it("refuses a page language version", async () => {
    const stale = await removeLanguageUnderneath();

    const res = await call(createPageLanguageVersion, {
      params: { id: "index" },
      activeProject: stale,
      body: { targetLanguage: "el", sourceLanguage: "en" },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(elPage("index")), false);
  });

  it("refuses a header save", async () => {
    const stale = await removeLanguageUnderneath();

    const res = await call(saveGlobalWidget, {
      params: { type: "header" },
      query: { language: "el" },
      activeProject: stale,
      body: { type: "theme-header", settings: { title: "Back again" } },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(elGlobal("header")), false);
  });

  it("refuses a menu save", async () => {
    const stale = await removeLanguageUnderneath();

    const res = await call(updateMenu, {
      params: { id: "main-menu" },
      query: { language: "el" },
      activeProject: stale,
      body: { id: "main-menu", name: "Κύριο", items: [{ id: "i1", label: "Αρχική", link: "index.html" }] },
    });

    assert.notEqual(res._status, 200, "a removed language's menu must not come back");
    assert.equal(await fs.pathExists(elMenu("main-menu")), false);
  });

  it("refuses creating a collection item", async () => {
    const stale = await removeLanguageUnderneath();

    const res = await call(collectionController.createItem, {
      params: { collectionType: "news" },
      query: { language: "el" },
      activeProject: stale,
      body: { settings: { title: "Νέο" } },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(elItemDir()), false);
  });

  it("refuses reordering a collection, which writes an order file of its own", async () => {
    // Created while the language still existed, so the order file has something to
    // name — reorder is a content write even though it touches no item.
    const created = await call(collectionController.createItem, {
      params: { collectionType: "news" },
      query: { language: "el" },
      body: { settings: { title: "Πρώτο" } },
    });
    assert.equal(created._status, 201);
    const stale = await removeLanguageUnderneath();

    const res = await call(collectionController.reorderItems, {
      params: { collectionType: "news" },
      query: { language: "el" },
      activeProject: stale,
      body: { order: [created._json.slug] },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    // Removal empties the folder but leaves the (now empty) directory, so the
    // question is whether the order file came back, not whether the folder is gone.
    assert.equal(
      await fs.pathExists(path.join(elItemDir(), "_order.json")),
      false,
      "not even an order file may reappear",
    );
  });

  it("refuses a collection item language version", async () => {
    const source = await call(collectionController.createItem, {
      params: { collectionType: "news" },
      body: { settings: { title: "Source" } },
    });
    assert.equal(source._status, 201);
    const stale = await removeLanguageUnderneath();

    const res = await call(collectionController.createItemLanguageVersion, {
      params: { collectionType: "news", itemSlug: source._json.slug },
      activeProject: stale,
      body: { targetLanguage: "el", sourceLanguage: "en" },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(elItemDir()), false);
  });
});

// ============================================================================
// The ordering itself, rather than its two endpoints.
// ============================================================================

describe("a save already queued when the removal runs", () => {
  it("waits for the removal and is then refused, instead of interleaving with it", async () => {
    // The save reaches the section while removal holds it. This is the case a
    // freshness check alone cannot cover: the request validated its language before
    // waiting, so only a re-read inside the section can catch it.
    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let removalRan = false;

    const blocker = withContentWriteLock(PROJECT_ID, async () => {
      await gate;
      // What the removal does, from inside the section it holds.
      await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el"));
      projectRepo.updateProject(PROJECT_ID, { languages: [] });
      removalRan = true;
    });

    const queuedSave = call(savePageContent, {
      params: { id: "about" },
      query: { language: "el" },
      activeProject: enabledRow,
      body: { uuid: "u-el-about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] },
    });

    releaseGate();
    await blocker;
    const res = await queuedSave;

    assert.equal(removalRan, true, "the removal must actually have run first");
    assert.equal(res._status, 409, "the queued save must be refused, not written");
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(elPage("about")), false);
  });

  it("still allows a save in a language that survived the removal", async () => {
    // The check must refuse the removed language, not every language.
    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    const res = await call(savePageContent, {
      params: { id: "index" },
      body: { uuid: "u-en-index", slug: "index", name: "Index", widgets: {}, widgetsOrder: [] },
    });

    assert.equal(res._status, 200, "the default language is unaffected");
  });
});

// ============================================================================
// Regressions from code review. Each is a write that escaped the section by
// sitting just outside it, or a refusal the editor could not act on.
// ============================================================================

describe("writes that used to escape the section", () => {
  it("does not let the listing-anchor sweep recreate a page after removal", async () => {
    // The save itself held the section, but the sweep that clears the anchor off
    // OTHER pages ran after it had been released. A removal landing in that gap
    // deleted the language while the sweep was still going, and the sweep then
    // wrote a Greek page straight back.
    //
    // So the save here must SUCCEED and the sweep must be what is delayed — a save
    // that gets refused never sweeps, and proves nothing about this.
    await storage.write(
      scope,
      "widgets/news-list/schema.json",
      JSON.stringify({ collection: { type: "news" }, settings: [] }, null, 2),
    );
    const anchored = (uuid, slug) => ({
      uuid,
      slug,
      name: slug,
      widgets: { w1: { type: "news-list", settings: { listing_anchor: true } } },
      widgetsOrder: ["w1"],
    });
    // Holds the anchor today, so saving "about" with it sweeps this page and writes.
    await fs.outputJson(elPage("blog"), anchored("u-el-blog", "blog"), { spaces: 2 });

    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let sweptWrite = false;
    const blogKey = "pages/el/blog.json";
    const pausingStorage = storageWith({
      write: async (scope, key, value) => {
        if (key === blogKey && !sweptWrite) {
          sweptWrite = true;
          await gate; // the sweep is now mid-flight
        }
        return storage.write(scope, key, value);
      },
    });

    assert.ok(await storage.read(scope, "widgets/news-list/schema.json"), "schema must be readable");
    assert.equal(
      (await fs.readJson(elPage("blog"))).widgets.w1.settings.listing_anchor,
      true,
      "blog must hold the anchor",
    );

    const save = callWith(pausingStorage, savePageContent, {
      params: { id: "about" },
      query: { language: "el" },
      body: { ...anchored("u-el-about", "about"), language: "el" },
    });
    // Let the save reach the paused sweep before removal is asked for. Bounded, so
    // a setup that never sweeps fails loudly instead of hanging the suite.
    for (let waited = 0; !sweptWrite && waited < 2000; waited += 5) {
      await new Promise((r) => setTimeout(r, 5));
    }
    if (!sweptWrite) {
      releaseGate();
      { const r = await save; assert.fail(`sweep never wrote ${blogKey}; save ${r._status} ${JSON.stringify(r._json)}`); }
    }

    // The real removal, which must wait for the section rather than cut into it.
    const removal = call(deleteLanguage, { params: { code: "el" } });

    // Give the removal a real chance to run BEFORE the sweep is resumed. This is
    // what makes the test mean something: with the sweep inside the section the
    // removal cannot get in and is still pending here, whereas with the sweep left
    // outside it runs to completion now — and the resumed sweep then writes a Greek
    // page back into the language that was just deleted.
    let removalFinished = false;
    removal.then(() => {
      removalFinished = true;
    });
    await Promise.race([removal, new Promise((r) => setTimeout(r, 250))]);
    assert.equal(removalFinished, false, "the removal must be waiting on the section, not cutting into it");

    releaseGate();
    const [saveRes, removeRes] = await Promise.all([save, removal]);
    assert.equal(saveRes._status, 200, "the save itself was legitimate and must succeed");
    assert.equal(removeRes._status, 200);

    // Removal empties the folder but leaves empty directories (global/) behind, so
    // the question is which PAGES survive, not whether the folder is gone.
    const elDir = path.join(getProjectPagesDir(PROJECT_FOLDER), "el");
    const left = ((await fs.pathExists(elDir)) ? await fs.readdir(elDir) : []).filter((n) => n.endsWith(".json"));
    assert.deepEqual(left, [], "no Greek page may survive the removal, sweep included");
  });

  it("skips the menu uuid backfill rather than writing a removed language's menu back", async () => {
    // A listing is a read, and must not fail because a language went away — but its
    // lazy backfill is a write, and that write restored a deleted menu file.
    await fs.outputJson(elMenu("legacy-menu"), { id: "legacy-menu", name: "Χωρίς uuid", items: [] }, { spaces: 2 });
    const stale = projectRepo.getProjectById(PROJECT_ID);

    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    const listed = await call(getAllMenus, { activeProject: stale });

    assert.equal(listed._status, 200, "a read must still answer");
    assert.equal(await fs.pathExists(elMenu("legacy-menu")), false, "but must not write the menu back");
  });

  it("does not restore a menu when removal lands between the backfill's check and its write", async () => {
    // The gap that mattered was between the check and the write, not before the
    // check — so the pause has to sit on the WRITE, at which point the backfill has
    // already decided the language is fine. With both in one section the removal
    // cannot get in; without it, the removal completes and the write puts the
    // deleted menu back.
    await fs.outputJson(elMenu("legacy-menu"), { id: "legacy-menu", name: "Χωρίς uuid", items: [] }, { spaces: 2 });
    const stale = projectRepo.getProjectById(PROJECT_ID);

    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let backfillWriting = false;
    const legacyKey = "menus/el/legacy-menu.json";
    const pausingStorage = storageWith({
      write: async (scope, key, value) => {
        if (key === legacyKey && !backfillWriting) {
          backfillWriting = true;
          await gate; // the check has passed; the write is about to land
        }
        return storage.write(scope, key, value);
      },
    });

    const listing = callWith(pausingStorage, getAllMenus, { activeProject: stale });
    for (let waited = 0; !backfillWriting && waited < 2000; waited += 5) {
      await new Promise((r) => setTimeout(r, 5));
    }
    if (!backfillWriting) {
      releaseGate();
      assert.fail(`the backfill never wrote ${legacyKey}; listing answered ${(await listing)._status}`);
    }

    const removal = call(deleteLanguage, { params: { code: "el" } });
    let removalFinished = false;
    removal.then(() => {
      removalFinished = true;
    });
    await Promise.race([removal, new Promise((r) => setTimeout(r, 250))]);
    assert.equal(removalFinished, false, "the removal must be waiting on the section, not cutting into it");

    releaseGate();
    const [listed] = await Promise.all([listing, removal]);

    assert.equal(listed._status, 200, "the listing must still answer");
    assert.equal(
      await fs.pathExists(elMenu("legacy-menu")),
      false,
      "the deleted menu must not have been written back",
    );
  });

  it("does not recreate a collection order file when deleting from a removed language", async () => {
    const created = await call(collectionController.createItem, {
      params: { collectionType: "news" },
      query: { language: "el" },
      body: { settings: { title: "Προς διαγραφή" } },
    });
    assert.equal(created._status, 201);
    const stale = projectRepo.getProjectById(PROJECT_ID);

    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    const res = await call(collectionController.deleteItem, {
      params: { collectionType: "news", itemSlug: created._json.slug },
      query: { language: "el" },
      activeProject: stale,
      body: {},
    });

    assert.notEqual(res._status, 200);
    assert.equal(
      await fs.pathExists(path.join(elItemDir(), "_order.json")),
      false,
      "pruning the order file must not put it back",
    );
  });
});

describe("a save that starts after the removal, with a fresh project row", () => {
  it("is refused with the same machine-readable code as the queued case", async () => {
    // The common ordering, and the one that used to answer a bare 400: the request
    // arrives after the removal, so its project row is already correct and the
    // in-section check never fires. Without a code the editor could not tell this
    // from an ordinary failure — no curtain, and autosave kept retrying.
    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    const res = await call(savePageContent, {
      params: { id: "about" },
      query: { language: "el" },
      // Deliberately NOT the stale row: this is a request that never saw "el".
      body: { uuid: "u-el-about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] },
    });

    assert.equal(res._json.code, "LANGUAGE_REMOVED", "the editor reacts to the code, not the status");
    assert.equal(res._json.language, "el");
    assert.equal(await fs.pathExists(elPage("about")), false);
  });

  it("still refuses a malformed language code as a plain client error", async () => {
    // A typo is not a removed language, and must not raise the editor's curtain.
    const res = await call(savePageContent, {
      params: { id: "about" },
      query: { language: "not-a-language" },
      body: { uuid: "u-x", slug: "about", name: "About", widgets: {}, widgetsOrder: [] },
    });

    assert.equal(res._status, 400);
    assert.equal(res._json.code, undefined, "no recovery code: nothing was removed");
  });
});
