/**
 * Clearing references to content that has been deleted.
 *
 * One policy, whichever way the content went: when a page, collection item or menu
 * is CONFIRMED deleted, everything still pointing at it loses the destination.
 * Deleting one Greek page used to scrub the English link to it while removing the
 * whole Greek language left that same link dangling — the same loss, two different
 * outcomes, depending on how you got there.
 *
 * Retaining a reference only helps when the target might come back. It cannot here:
 * re-adding a language does not restore its pages, and new content gets new uuids,
 * so a reference into a removed language is permanently dead rather than
 * temporarily unresolvable. The exception is a removal that FAILED partway, which
 * is retryable — there the surviving targets are still there and their references
 * must be left alone.
 *
 * Run with: node --test packages/builder-server/src/tests/deletedReferenceCleanup.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-ref-cleanup-${Date.now()}`);
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
const { deleteLanguage } = await import("../controllers/languageController.js");
const { deleteMenu } = await import("../controllers/menuController.js");
const { deletePage, bulkDeletePages } = await import("../controllers/pageController.js");
const { deleteItem, bulkDeleteItems } = await import("../controllers/collectionController.js");
const { withContentWriteLock } = await import("../services/contentCoordination.js");
const { closeDb } = await import("../db/index.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "ref-cleanup-uuid";
const PROJECT_FOLDER = "ref-cleanup-project";
const EL_ABOUT = "u-el-about";
const EL_NEWS = "u-el-news";
const EL_MENU = "m-el-main";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const limits = { getLimit: async () => Infinity };
const scope = { projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

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

async function call(fn, { params = {}, body = {}, query = {}, storageOverride = null } = {}) {
  const res = mockRes();
  await fn(
    {
      params,
      body,
      query,
      scope,
      activeProject: projectRepo.getProjectById(PROJECT_ID),
      adapters: { storage: storageOverride || storage, assetStorage, limits },
      app: { locals: {} },
      [Symbol.for("express-validator#contexts")]: [],
    },
    res,
  );
  return res;
}

/**
 * A storage adapter with one method swapped. Must be a Proxy with bound methods:
 * the local adapter uses private class fields, so an inherited method called on an
 * `Object.create` derivative throws "Receiver must be an instance of class".
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

const enPage = (slug) => path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`);
const enMenu = (id) => path.join(getProjectDir(PROJECT_FOLDER), "menus", `${id}.json`);

/**
 * English content pointing at Greek content, four ways — all reachable, because the
 * link picker deliberately offers targets in every language.
 */
async function seedCrossLanguageProject() {
  await fs.remove(getProjectDir(PROJECT_FOLDER));
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el"] });

  await fs.outputJson(
    enPage("index"),
    {
      uuid: "u-en-index",
      slug: "index",
      name: "Index",
      widgets: {
        w1: {
          type: "hero",
          settings: {
            // An explicit reference to a Greek page.
            cta: { href: "el/about.html", text: "Read in Greek", target: "_blank", pageUuid: EL_ABOUT },
            // A hand-typed URL that happens to point at the same place.
            typed: { href: "/el/about.html", text: "Typed by hand", target: "_self" },
            body: `<p>See <a href="el/about.html" data-page-uuid="${EL_ABOUT}">the Greek page</a> now</p>`,
            // A menu selection, stored as the menu's uuid.
            nav: EL_MENU,
          },
        },
      },
      widgetsOrder: ["w1"],
    },
    { spaces: 2 },
  );

  await fs.outputJson(
    enPage("child"),
    { uuid: "u-en-child", slug: "child", name: "Child", parentPageUuid: EL_ABOUT, widgets: {} },
    { spaces: 2 },
  );

  await fs.outputJson(
    enMenu("main-menu"),
    {
      uuid: "m-en-main",
      id: "main-menu",
      name: "Main",
      items: [
        { id: "i1", label: "Greek about", link: "el/about.html", pageUuid: EL_ABOUT },
        { id: "i2", label: "Home", link: "index.html", pageUuid: "u-en-index" },
      ],
    },
    { spaces: 2 },
  );

  // The Greek side that is about to be removed.
  await fs.outputJson(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "about.json"),
    { uuid: EL_ABOUT, slug: "about", name: "About", widgets: {} },
    { spaces: 2 },
  );
  await fs.outputJson(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "news.json"),
    { uuid: EL_NEWS, slug: "news", name: "News", widgets: {} },
    { spaces: 2 },
  );
  await fs.outputJson(
    path.join(getProjectDir(PROJECT_FOLDER), "menus", "el", "main-menu.json"),
    { uuid: EL_MENU, id: "main-menu", name: "Κύριο", items: [] },
    { spaces: 2 },
  );
}

const readIndex = () => fs.readJson(enPage("index"));
const readChild = () => fs.readJson(enPage("child"));
const readMenu = () => fs.readJson(enMenu("main-menu"));

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Reference Cleanup",
        theme: "__ref_cleanup_theme__",
        defaultLanguage: "en",
        languages: ["el"],
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
});

beforeEach(seedCrossLanguageProject);

// ============================================================================

describe("a successful language removal", () => {
  it("clears every kind of reference the surviving default language held", async () => {
    // The whole point of R2: deleting the Greek page alone already did all of this.
    // Removing the language that contained it must not be the lenient path.
    const removed = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(removed._status, 200);

    const index = await readIndex();
    assert.equal("pageUuid" in index.widgets.w1.settings.cta, false, "the widget link's reference");
    assert.equal(index.widgets.w1.settings.cta.href, "", "and its destination");
    assert.equal(index.widgets.w1.settings.body.includes(EL_ABOUT), false, "the richtext reference");
    assert.equal(index.widgets.w1.settings.nav, "", "the menu selection");
    assert.equal("parentPageUuid" in (await readChild()), false, "the parent reference");

    const menu = await readMenu();
    assert.equal("pageUuid" in menu.items[0], false, "the menu item's reference");
    assert.equal(menu.items[0].link, "", "and its destination");
  });

  it("keeps what the author wrote — labels, text and targets", async () => {
    await call(deleteLanguage, { params: { code: "el" } });

    const index = await readIndex();
    assert.equal(index.widgets.w1.settings.cta.text, "Read in Greek", "the button keeps its label");
    assert.equal(index.widgets.w1.settings.cta.target, "_blank", "and where it opens");
    assert.match(index.widgets.w1.settings.body, /See the Greek page now/, "the sentence keeps its words");
    assert.equal((await readMenu()).items[0].label, "Greek about", "the menu item keeps its label");
  });

  it("leaves a hand-typed URL alone, even pointing at the same deleted page", async () => {
    // This policy is about explicit references to content Widgetizer manages. A URL
    // someone typed is theirs; rewriting it would be editing their content.
    await call(deleteLanguage, { params: { code: "el" } });

    const typed = (await readIndex()).widgets.w1.settings.typed;
    assert.equal(typed.href, "/el/about.html", "the typed address is untouched");
    assert.equal(typed.text, "Typed by hand");
  });

  it("leaves references to content that survived", async () => {
    await call(deleteLanguage, { params: { code: "el" } });

    const menu = await readMenu();
    assert.equal(menu.items[1].pageUuid, "u-en-index", "the English page is still there");
    assert.equal(menu.items[1].link, "index.html");
  });
});

describe("deleting a menu", () => {
  it("clears the selections that pointed at it", async () => {
    // Nothing used to do this on any path: a widget kept displaying a selection for
    // a menu that no longer existed.
    await fs.outputJson(
      enPage("index"),
      { ...(await readIndex()), widgets: { w1: { type: "hero", settings: { nav: "m-en-main" } } } },
      { spaces: 2 },
    );

    const res = await call(deleteMenu, { params: { id: "main-menu" } });
    assert.equal(res._status, 200);

    assert.equal((await readIndex()).widgets.w1.settings.nav, "", "the selection is cleared");
  });

  it("leaves a selection of a different menu alone", async () => {
    await fs.outputJson(
      path.join(getProjectDir(PROJECT_FOLDER), "menus", "footer-menu.json"),
      { uuid: "m-en-footer", id: "footer-menu", name: "Footer", items: [] },
      { spaces: 2 },
    );
    await fs.outputJson(
      enPage("index"),
      { ...(await readIndex()), widgets: { w1: { type: "hero", settings: { nav: "m-en-footer" } } } },
      { spaces: 2 },
    );

    await call(deleteMenu, { params: { id: "main-menu" } });

    assert.equal((await readIndex()).widgets.w1.settings.nav, "m-en-footer");
  });
});

describe("a language removal that fails partway", () => {
  /** Fail the delete of one Greek page, leaving the rest of the removal to proceed. */
  const failingOn = (failKey) =>
    storageWith({
      delete: async (scope, key) => {
        if (key === failKey) throw new Error("disk said no");
        return storage.delete(scope, key);
      },
    });

  it("clears references only to what it confirmed deleting, and keeps the rest", async () => {
    // The retryable case, and the one place retention is right: a target whose
    // delete threw may still be there, so its references must survive.
    await fs.outputJson(
      enMenu("main-menu"),
      {
        uuid: "m-en-main",
        id: "main-menu",
        name: "Main",
        items: [
          { id: "i1", label: "Greek about", link: "el/about.html", pageUuid: EL_ABOUT },
          { id: "i2", label: "Greek news", link: "el/news.html", pageUuid: EL_NEWS },
        ],
      },
      { spaces: 2 },
    );

    const res = await call(deleteLanguage, {
      params: { code: "el" },
      storageOverride: failingOn("pages/el/news.json"),
    });
    assert.notEqual(res._status, 200, "the removal reports its failure");

    const menu = await readMenu();
    assert.equal("pageUuid" in menu.items[0], false, "about was deleted, so its reference goes");
    assert.equal(menu.items[1].pageUuid, EL_NEWS, "news survived, so its reference stays");
    assert.equal(menu.items[1].link, "el/news.html", "destination and all");
    assert.deepEqual(projectRepo.getProjectById(PROJECT_ID).languages, ["el"], "and the language stays listed");
  });

  it("clears the rest once the retry succeeds", async () => {
    await fs.outputJson(
      enMenu("main-menu"),
      {
        uuid: "m-en-main",
        id: "main-menu",
        name: "Main",
        items: [
          { id: "i1", label: "Greek about", link: "el/about.html", pageUuid: EL_ABOUT },
          { id: "i2", label: "Greek news", link: "el/news.html", pageUuid: EL_NEWS },
        ],
      },
      { spaces: 2 },
    );

    await call(deleteLanguage, { params: { code: "el" }, storageOverride: failingOn("pages/el/news.json") });
    assert.equal((await readMenu()).items[1].pageUuid, EL_NEWS, "precondition: still referenced");

    const retry = await call(deleteLanguage, { params: { code: "el" } });
    assert.equal(retry._status, 200, "the retry finishes the job");

    const menu = await readMenu();
    assert.equal("pageUuid" in menu.items[1], false, "and now news loses its reference too");
    assert.equal(menu.items[1].label, "Greek news", "with its label intact");
    assert.deepEqual(projectRepo.getProjectById(PROJECT_ID).languages, []);
  });
});

// ============================================================================
// Regressions from code review. Each is a way the sweep could act on the wrong
// set, skip itself entirely, or claim to have finished when it had not.
// ============================================================================

describe("the sweep acts only on what this request deleted", () => {
  it("does not clear links to a page that was renamed instead of deleted", async () => {
    // A rename keeps the uuid and moves the file. Reading the identity before
    // taking the lock meant the delete could find nothing while the sweep still
    // cleared every link to a page that is very much still there.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );
    await fs.outputJson(
      enMenu("main-menu"),
      {
        uuid: "m-en-main",
        id: "main-menu",
        name: "Main",
        items: [{ id: "i1", label: "Doomed", link: "doomed.html", pageUuid: "u-en-doomed" }],
      },
      { spaces: 2 },
    );

    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let sectionHeld = false;

    // Hold the section, and rename the page while the delete waits for it.
    const blocker = withContentWriteLock(PROJECT_ID, async () => {
      sectionHeld = true;
      await gate;
      await fs.move(
        path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
        path.join(getProjectPagesDir(PROJECT_FOLDER), "renamed.json"),
      );
      await fs.outputJson(
        path.join(getProjectPagesDir(PROJECT_FOLDER), "renamed.json"),
        { uuid: "u-en-doomed", slug: "renamed", name: "Renamed", widgets: {} },
        { spaces: 2 },
      );
    });
    while (!sectionHeld) await new Promise((r) => setTimeout(r, 5));

    const deletion = call(deletePage, { params: { id: "doomed" } });
    await new Promise((r) => setTimeout(r, 50)); // let it queue on the section
    releaseGate();
    await blocker;
    const res = await deletion;

    assert.equal(res._status, 404, "there is nothing at that slug any more");
    const menu = await readMenu();
    assert.equal(menu.items[0].pageUuid, "u-en-doomed", "the surviving page keeps its link");
    assert.equal(menu.items[0].link, "doomed.html");
  });
});

describe("a delete whose bookkeeping fails afterwards", () => {
  /** Let the item file go, then fail the order rewrite that follows it. */
  const failingOrderWrite = (orderKey) =>
    storageWith({
      write: async (scope, key, value) => {
        if (key === orderKey) throw new Error("order file is read-only");
        return storage.write(scope, key, value);
      },
    });

  async function seedItemAndReference() {
    await storage.write(
      scope,
      "collection-types/news/schema.json",
      JSON.stringify(
        { type: "news", schemaVersion: 1, hasItemPages: true, slugPrefix: "news", defaultSort: "manual", settings: [{ id: "title", type: "text", usedAsTitle: true, required: true }] },
        null,
        2,
      ),
    );
    await storage.write(
      scope,
      "collections/news/story.json",
      JSON.stringify({ uuid: "u-item-story", slug: "story", settings: { title: "Story" } }, null, 2),
    );
    await fs.outputJson(
      enMenu("main-menu"),
      {
        uuid: "m-en-main",
        id: "main-menu",
        name: "Main",
        items: [{ id: "i1", label: "Story", link: "news/story.html", collectionItemUuid: "u-item-story", collectionType: "news" }],
      },
      { spaces: 2 },
    );
  }

  it("still clears references when the single delete's order rewrite fails", async () => {
    // The item is gone for good: a retry finds nothing to delete, so if the sweep
    // is skipped here the dead reference survives forever.
    await seedItemAndReference();

    const res = await call(deleteItem, {
      params: { collectionType: "news", itemSlug: "story" },
      storageOverride: failingOrderWrite("collections/news/_order.json"),
    });

    assert.notEqual(res._status, 200, "the request reports the bookkeeping failure");
    assert.equal(await storage.exists(scope, "collections/news/story.json"), false, "the item did go");
    const menu = await readMenu();
    assert.equal("collectionItemUuid" in menu.items[0], false, "and its reference went with it");
    assert.equal(menu.items[0].label, "Story", "label kept");
  });

  it("still clears references when the bulk delete's order rewrite fails", async () => {
    await seedItemAndReference();

    const res = await call(bulkDeleteItems, {
      params: { collectionType: "news" },
      body: { itemSlugs: ["story"] },
      storageOverride: failingOrderWrite("collections/news/_order.json"),
    });

    assert.notEqual(res._status, 200);
    assert.equal(await storage.exists(scope, "collections/news/story.json"), false);
    assert.equal("collectionItemUuid" in (await readMenu()).items[0], false);
  });
});

describe("a sweep that cannot finish", () => {
  it("cleans the files it can reach and reports the ones it cannot", async () => {
    // One unwritable page used to stop the walk before the menus behind it, and
    // the removal still answered a flat success.
    const res = await call(deleteLanguage, {
      params: { code: "el" },
      storageOverride: storageWith({
        write: async (scope, key, value) => {
          if (key === "pages/index.json") throw new Error("page is read-only");
          return storage.write(scope, key, value);
        },
      }),
    });

    assert.equal(res._status, 200, "the language WAS removed; this is not a failed deletion");
    assert.ok(res._json.warnings?.length, "but it must not claim a clean sweep");
    assert.equal(res._json.warnings[0].code, "REFERENCE_CLEANUP_INCOMPLETE");
    assert.ok(
      res._json.warnings[0].paths.includes("pages/index.json"),
      "naming the content still pointing at what went",
    );

    // The walk continued past the unwritable page.
    const menu = await readMenu();
    assert.equal("pageUuid" in menu.items[0], false, "the menu behind it was still cleaned");
    const index = await readIndex();
    assert.equal(index.widgets.w1.settings.cta.pageUuid, EL_ABOUT, "and the page it could not write is unchanged");
  });
});

describe("the sweep is actually batched", () => {
  it("reads a surviving page once, however many identities were deleted", async () => {
    // The parent-reference scan used to run once per deleted page, on top of the
    // widget walk: ten deleted pages read every surviving page eleven times. Both
    // now happen in one pass, with the whole deleted set.
    for (let i = 0; i < 10; i++) {
      await fs.outputJson(
        path.join(getProjectPagesDir(PROJECT_FOLDER), "el", `p${i}.json`),
        { uuid: `u-el-p${i}`, slug: `p${i}`, name: `P${i}`, widgets: {} },
        { spaces: 2 },
      );
    }

    const reads = [];
    const counting = storageWith({
      read: async (scope, key) => {
        reads.push(key);
        return storage.read(scope, key);
      },
    });

    const res = await call(deleteLanguage, { params: { code: "el" }, storageOverride: counting });
    assert.equal(res._status, 200);

    // The removal itself reads each page it deletes; what must not scale with that
    // is how often it re-reads the pages it is NOT deleting.
    const surviving = reads.filter((key) => key === "pages/index.json").length;
    assert.ok(
      surviving <= 2,
      `a surviving page should be read about once by the sweep, not once per deleted page (was ${surviving})`,
    );
  });
});

describe("what a delete reports when the sweep could not finish", () => {
  /** The whole collections tree becomes unlistable, so nothing in it can be cleaned. */
  const unlistableCollections = () =>
    storageWith({
      list: async (scope, dir) => {
        if (dir === "collections") throw new Error("collections are unreadable");
        return storage.list(scope, dir);
      },
    });

  it("records a collection folder it could not list, instead of skipping it quietly", async () => {
    // An unreadable collection used to be indistinguishable from a project that
    // has none: the walk moved on and the caller reported a clean sweep.
    //
    // Driven through a page delete rather than a language removal: removal reads
    // the collections itself to delete their items, so an unlistable collections
    // tree fails the removal outright, which is a different (and correct) outcome.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );
    const res = await call(deletePage, {
      params: { id: "doomed" },
      storageOverride: unlistableCollections(),
    });

    assert.equal(res._status, 200, "the page WAS deleted");
    assert.ok(res._json.warnings?.length, "and the unlisted folder is reported");
    assert.equal(res._json.warnings[0].code, "REFERENCE_CLEANUP_INCOMPLETE");
    assert.ok(
      res._json.warnings[0].paths.some((key) => key.startsWith("collections")),
      "naming the part of the project it could not reach",
    );
  });

  it("warns on page deletion without calling the deletion a failure", async () => {
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );

    const res = await call(deletePage, {
      params: { id: "doomed" },
      storageOverride: unlistableCollections(),
    });

    assert.equal(res._status, 200, "the page is gone; that is a success");
    assert.equal(res._json.success, true);
    assert.equal(res._json.warnings[0].code, "REFERENCE_CLEANUP_INCOMPLETE");
    assert.equal(await storage.exists(scope, "pages/doomed.json"), false);
  });

  it("warns on bulk page deletion too", async () => {
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );

    const res = await call(bulkDeletePages, {
      body: { pageIds: ["doomed"] },
      storageOverride: unlistableCollections(),
    });

    assert.equal(res._status, 200);
    assert.equal(res._json.warnings[0].code, "REFERENCE_CLEANUP_INCOMPLETE");
  });

  it("warns on menu deletion too", async () => {
    const res = await call(deleteMenu, {
      params: { id: "main-menu" },
      storageOverride: unlistableCollections(),
    });

    assert.equal(res._status, 200, "the menu is gone");
    assert.equal(res._json.warnings[0].code, "REFERENCE_CLEANUP_INCOMPLETE");
  });

  it("says nothing when the sweep completed", async () => {
    // The warning must mean something: a clean delete carries none.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );

    const res = await call(deletePage, { params: { id: "doomed" } });

    assert.equal(res._status, 200);
    assert.equal(res._json.warnings, undefined);
  });

  it("keeps storage keys out of what the message is built from", async () => {
    // The paths are for logs. The UI is given a count and phrases it in terms of
    // pages and menus, because "pages/el/index.json" is not something to act on.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "doomed.json"),
      { uuid: "u-en-doomed", slug: "doomed", name: "Doomed", widgets: {} },
      { spaces: 2 },
    );
    const res = await call(deletePage, {
      params: { id: "doomed" },
      storageOverride: unlistableCollections(),
    });

    const warning = res._json.warnings[0];
    assert.equal(typeof warning.count, "number", "a count the UI can phrase");
    assert.ok(warning.count > 0);
  });
});
