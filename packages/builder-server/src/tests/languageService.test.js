/**
 * Adding a site language.
 *
 * Seeding order is the whole point: menus are copied first with fresh uuids,
 * then the header and footer are copied with their MENU references repointed at
 * those copies. The page references inside menu items are inherited untouched —
 * at this moment the new language has no pages to point at.
 *
 * Run with: node --test packages/builder-server/src/tests/languageService.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-language-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const { addLanguage, removeLanguage, countLanguageContent } = await import("../services/languageService.js");
const languageController = await import("../controllers/languageController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const {
  updateGlobalWidgetMediaUsage,
  getMediaUsage,
  syncPageMediaUsageOnWrite,
  updateCollectionItemMediaUsage,
} = await import("../services/mediaUsageService.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "language-test-uuid";
const PROJECT_FOLDER = "language-test-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const projectBase = () => getProjectDir(PROJECT_FOLDER);

const HEADER_SCHEMA = {
  type: "header",
  settings: [
    { type: "text", id: "logoText" },
    { type: "menu", id: "headerNavigation" },
  ],
  blocks: [{ type: "column", settings: [{ type: "menu", id: "columnMenu" }] }],
};

const project = () => projectRepo.getProjectById(PROJECT_ID);

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
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

async function seedProject() {
  await fs.remove(projectBase());
  projectRepo.updateProject(PROJECT_ID, { languages: [], defaultLanguage: "en" });

  await storage.write(
    scope,
    "menus/main.json",
    JSON.stringify({ id: "main", uuid: "menu-main", name: "Main", items: [{ id: "i1", label: "About", link: "about.html", pageUuid: "page-about" }] }),
  );
  await storage.write(
    scope,
    "menus/legal.json",
    JSON.stringify({ id: "legal", uuid: "menu-legal", name: "Legal", items: [] }),
  );
  await storage.write(scope, "widgets/global/header/schema.json", JSON.stringify(HEADER_SCHEMA));
  await storage.write(
    scope,
    "pages/global/header.json",
    JSON.stringify({
      type: "header",
      settings: { logoText: "Arch", headerNavigation: "menu-main" },
      blocks: { b1: { type: "column", settings: { columnMenu: "menu-legal" } } },
    }),
  );
  await storage.write(scope, "pages/global/footer.json", JSON.stringify({ type: "footer", settings: {} }));
  await storage.write(scope, "pages/index.json", JSON.stringify({ slug: "index", uuid: "page-home", widgets: {} }));
}

before(async () => {
  projectRepo.createProject({
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Language Test",
    theme: "__t__",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(seedProject);

describe("addLanguage — seeding", () => {
  it("copies menus with fresh uuids and repoints the globals at them, pages untouched", async () => {
    const { languages } = await addLanguage({ storage, scope, project: project(), code: "el" });
    assert.deepEqual(languages, ["el"]);

    const greekMain = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));
    const greekLegal = await fs.readJSON(path.join(projectBase(), "menus", "el", "legal.json"));
    assert.equal(greekMain.id, "main", "the id (and so the filename) is unique per folder, so it is kept");
    assert.notEqual(greekMain.uuid, "menu-main");
    assert.notEqual(greekLegal.uuid, "menu-legal");
    assert.notEqual(greekMain.uuid, greekLegal.uuid);

    const greekHeader = await fs.readJSON(path.join(projectBase(), "pages", "el", "global", "header.json"));
    assert.equal(greekHeader.settings.headerNavigation, greekMain.uuid, "the Greek header points at the Greek menu");
    assert.equal(greekHeader.blocks.b1.settings.columnMenu, greekLegal.uuid, "block menu settings follow too");
    assert.equal(greekHeader.settings.logoText, "Arch", "everything else is copied as-is");
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "global", "footer.json")));

    const englishHeader = await fs.readJSON(path.join(projectBase(), "pages", "global", "header.json"));
    assert.equal(englishHeader.settings.headerNavigation, "menu-main", "the source language is left alone");
  });

  it("leaves the page references inside menu items exactly as inherited", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    const greekMain = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));
    assert.deepEqual(greekMain.items, [{ id: "i1", label: "About", link: "about.html", pageUuid: "page-about" }]);
  });

  it("copies no pages: the new language holds only its globals", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    const entries = await fs.readdir(path.join(projectBase(), "pages", "el"));
    assert.deepEqual(entries, ["global"]);
  });

  // Seeding creates what is missing and replaces nothing. A second run happens
  // after a first one stopped partway, or over content a restore brought back —
  // in both cases what is already in the language is the site's, not ours.
  it("re-running over a finished seed changes nothing", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    // Stand in for translated work done after the language was added.
    const menuPath = path.join(projectBase(), "menus", "el", "main.json");
    const headerPath = path.join(projectBase(), "pages", "el", "global", "header.json");
    const translated = { ...(await fs.readJSON(menuPath)), name: "Κύριο" };
    await fs.writeJSON(menuPath, translated);
    const headerBefore = await fs.readJSON(headerPath);

    // The row was never written (the caller does that), so the code is still addable.
    await addLanguage({ storage, scope, project: project(), code: "el" });

    assert.deepEqual(await fs.readJSON(menuPath), translated, "the translated menu is untouched");
    assert.deepEqual(await fs.readJSON(headerPath), headerBefore, "so is the header");
  });

  it("re-running after a half-finished seed creates only what is missing, and connects it to what is there", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    const menuPath = path.join(projectBase(), "menus", "el", "main.json");
    const seededMenu = await fs.readJSON(menuPath);
    // The shape a run that stopped between the menus and the globals leaves behind.
    await fs.remove(path.join(projectBase(), "pages", "el", "global"));

    await addLanguage({ storage, scope, project: project(), code: "el" });

    assert.deepEqual(await fs.readJSON(menuPath), seededMenu, "the menu that survived keeps its identity");
    const header = await fs.readJSON(path.join(projectBase(), "pages", "el", "global", "header.json"));
    assert.equal(header.settings.headerNavigation, seededMenu.uuid, "the new header points at it, not at a fresh copy");
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "global", "footer.json")));
  });

  // The case R8 found: a restore leaves translated content on disk while the
  // project row lists no languages, so the user adds the language back.
  it("never replaces translated content that is already in the language", async () => {
    const menuPath = path.join(projectBase(), "menus", "el", "main.json");
    const headerPath = path.join(projectBase(), "pages", "el", "global", "header.json");
    await fs.outputJSON(menuPath, { id: "main", uuid: "restored-menu", name: "Κύριο", items: [] });
    await fs.outputJSON(headerPath, { type: "header", settings: { logoText: "ΕΛΛΗΝΙΚΑ" } });

    await addLanguage({ storage, scope, project: project(), code: "el" });

    assert.equal((await fs.readJSON(menuPath)).name, "Κύριο");
    assert.equal((await fs.readJSON(headerPath)).settings.logoText, "ΕΛΛΗΝΙΚΑ");
    // The footer it had no copy of is created, and points at the restored menu.
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "global", "footer.json")));
  });

  // The destinations are only half the story: a corrupt file the seed copies
  // FROM fails just as late, after the menus have already been created.
  it("stops before writing anything when the header it would copy cannot be read", async () => {
    await fs.outputFile(path.join(projectBase(), "pages", "global", "header.json"), "{ not json");

    await assert.rejects(
      () => addLanguage({ storage, scope, project: project(), code: "el" }),
      (error) => error.name === "LanguageError" && /could not be read/.test(error.message),
    );

    assert.equal(await fs.pathExists(path.join(projectBase(), "menus", "el")), false, "no menus were created");
    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el", "global")), false);
  });

  it("stops before writing anything when a global widget's schema cannot be read", async () => {
    await fs.outputFile(path.join(projectBase(), "widgets", "global", "header", "schema.json"), "{ not json");

    await assert.rejects(
      () => addLanguage({ storage, scope, project: project(), code: "el" }),
      (error) => error.name === "LanguageError" && /schema/.test(error.message),
    );

    assert.equal(await fs.pathExists(path.join(projectBase(), "menus", "el")), false, "no menus were created");
  });

  it("stops before writing anything when a menu it would copy cannot be read", async () => {
    await fs.outputFile(path.join(projectBase(), "menus", "main.json"), "{ not json");

    await assert.rejects(
      () => addLanguage({ storage, scope, project: project(), code: "el" }),
      (error) => error.name === "LanguageError" && /could not be read/.test(error.message),
    );

    assert.equal(await fs.pathExists(path.join(projectBase(), "menus", "el")), false, "not even the readable ones");
  });

  it("stops before writing anything when content already in the language cannot be read", async () => {
    const menuPath = path.join(projectBase(), "menus", "el", "main.json");
    await fs.outputFile(menuPath, "{ this is not json");

    await assert.rejects(
      () => addLanguage({ storage, scope, project: project(), code: "el" }),
      (error) => error.name === "LanguageError" && /could not be read/.test(error.message),
    );

    assert.equal(await fs.readFile(menuPath, "utf8"), "{ this is not json", "the unreadable file is left as it was");
    assert.equal(
      await fs.pathExists(path.join(projectBase(), "menus", "el", "legal.json")),
      false,
      "and nothing else was created either",
    );
  });

  it("repoints a menu setting that names the menu by slug, not by uuid", async () => {
    await storage.write(
      scope,
      "pages/global/header.json",
      JSON.stringify({
        type: "header",
        settings: { headerNavigation: "main" },
        blocks: { b1: { type: "column", settings: { columnMenu: "legal" } } },
      }),
    );
    await addLanguage({ storage, scope, project: project(), code: "el" });

    const greekMain = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));
    const greekLegal = await fs.readJSON(path.join(projectBase(), "menus", "el", "legal.json"));
    const header = await fs.readJSON(path.join(projectBase(), "pages", "el", "global", "header.json"));
    // A slug resolves per language folder only for the root, so the copy must
    // carry the uuid or it would keep rendering the source language's menu.
    assert.equal(header.settings.headerNavigation, greekMain.uuid);
    assert.equal(header.blocks.b1.settings.columnMenu, greekLegal.uuid);
  });

  it("gives the copied globals their own media usage rows", async () => {
    await writeMediaFile(PROJECT_ID, {
      files: [{ id: "img1", filename: "logo.png", path: "/uploads/images/logo.png", type: "image/png", usedIn: [] }],
    });
    await storage.write(
      scope,
      "pages/global/header.json",
      JSON.stringify({ type: "header", settings: { headerNavigation: "menu-main", logoImage: "/uploads/images/logo.png" } }),
    );
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", {
      settings: { logoImage: "/uploads/images/logo.png" },
    });

    await addLanguage({ storage, scope, project: project(), code: "el" });
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn.sort(), ["global:el:header", "global:root:header"]);

    // Clearing the source's logo must not mark an image the copy still shows as unused.
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", { settings: {} });
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, ["global:el:header"]);
  });

  it("works when the header declares no menu setting at all", async () => {
    await storage.write(scope, "widgets/global/header/schema.json", JSON.stringify({ type: "header", settings: [] }));
    await addLanguage({ storage, scope, project: project(), code: "it" });
    const header = await fs.readJSON(path.join(projectBase(), "pages", "it", "global", "header.json"));
    assert.equal(header.settings.headerNavigation, "menu-main", "an undeclared setting is copied verbatim");
  });
});

describe("addLanguage — refusals", () => {
  const rejects = (code, match) =>
    assert.rejects(() => addLanguage({ storage, scope, project: project(), code }), match);

  it("refuses a code this version cannot publish, and an empty one", async () => {
    await rejects("ar", /can publish/);
    await rejects("not-a-language", /can publish/);
    await rejects("", /required/);
  });

  it("refuses a right-to-left language, including one whose shape hides its direction", async () => {
    // pa-pk carries no script subtag, but Punjabi is written in Arabic there.
    for (const code of ["ks", "pa-arab", "pa-pk", "ar-1994"]) await rejects(code, /can publish/);
    const { languages } = await addLanguage({ storage, scope, project: project(), code: "pa-in" });
    assert.deepEqual(languages, ["pa-in"], "the same language stays available where it is left-to-right");
  });

  it("stores the code lowercased", async () => {
    const { languages } = await addLanguage({ storage, scope, project: project(), code: " EL " });
    assert.deepEqual(languages, ["el"]);
    assert.ok(await fs.pathExists(path.join(projectBase(), "menus", "el", "main.json")));
  });

  it("refuses the default language and one already added", async () => {
    await rejects("en", /already the site's default/);
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] });
    await rejects("el", /already one of the site's languages/);
  });

  it("refuses a code that a root page already publishes", async () => {
    await storage.write(scope, "pages/el.json", JSON.stringify({ slug: "el", uuid: "page-el", widgets: {} }));
    await rejects("el", /already the slug of a page/);
    assert.equal(await fs.pathExists(path.join(projectBase(), "menus", "el")), false, "nothing is seeded on refusal");
  });

  it("refuses a code that a collection publishes as its URL prefix", async () => {
    await storage.write(
      scope,
      "collection-types/nea/schema.json",
      JSON.stringify({
        type: "nea",
        schemaVersion: 1,
        hasItemPages: true,
        slugPrefix: "el",
        settings: [{ id: "title", type: "text", usedAsTitle: true }],
      }),
    );
    await rejects("el", /URL prefix/);
  });
});

describe("POST /languages", () => {
  const call = async (body) => {
    const res = mockRes();
    await languageController.createLanguage(
      { scope, activeProject: project(), adapters: { storage }, body },
      res,
    );
    return res;
  };

  it("records the language only after the seed succeeds", async () => {
    const res = await call({ code: "el" });
    assert.equal(res._status, 201);
    assert.deepEqual(res._json.languages, ["el"]);
    assert.deepEqual(project().languages, ["el"]);
  });

  it("leaves the row alone when the code is refused", async () => {
    await storage.write(scope, "pages/el.json", JSON.stringify({ slug: "el", uuid: "page-el", widgets: {} }));
    const res = await call({ code: "el" });
    assert.equal(res._status, 400);
    assert.deepEqual(project().languages, []);
  });

  it("reports an already-added language as a conflict", async () => {
    await call({ code: "el" });
    const again = await call({ code: "el" });
    assert.equal(again._status, 409);
  });

  // Check, seed and record are one operation per project.
  it("keeps both languages when two are added at once", async () => {
    const [first, second] = await Promise.all([call({ code: "el" }), call({ code: "it" })]);
    assert.equal(first._status, 201);
    assert.equal(second._status, 201);
    assert.deepEqual([...project().languages].sort(), ["el", "it"]);
    for (const code of ["el", "it"]) {
      assert.ok(await fs.pathExists(path.join(projectBase(), "menus", code, "main.json")));
    }
  });

  it("lets only one of two simultaneous adds of the same code through", async () => {
    const results = await Promise.all([call({ code: "el" }), call({ code: "el" })]);
    assert.deepEqual(results.map((res) => res._status).sort(), [201, 409]);
    assert.deepEqual(project().languages, ["el"]);

    // The winner's menu uuid is the one the Greek header points at.
    const greekMain = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));
    const header = await fs.readJSON(path.join(projectBase(), "pages", "el", "global", "header.json"));
    assert.equal(header.settings.headerNavigation, greekMain.uuid);
  });
});

// ============================================================================
// Removing a language
// ============================================================================

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  settings: [
    { id: "title", type: "text", usedAsTitle: true },
    { id: "hero", type: "image" },
  ],
};

const EL = { language: "el", defaultLanguage: "en" };

/** Add `el`, then give both languages a page, an item and an image, as a real site would have. */
async function seedGreekContent() {
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  await writeMediaFile(PROJECT_ID, {
    files: [
      { id: "img1", filename: "a.png", path: "/uploads/images/a.png", type: "image/png", usedIn: [] },
      { id: "img2", filename: "b.png", path: "/uploads/images/b.png", type: "image/png", usedIn: [] },
    ],
  });

  const english = { slug: "about", uuid: "u-en-about", widgets: { w1: { settings: { hero: "/uploads/images/a.png" } } } };
  await storage.write(scope, "pages/about.json", JSON.stringify(english));
  await syncPageMediaUsageOnWrite(PROJECT_ID, english);

  await addLanguage({ storage, scope, project: project(), code: "el" });
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] });

  const greekPage = {
    slug: "sxetika",
    uuid: "u-el-about",
    widgets: { w1: { settings: { hero: "/uploads/images/a.png" } } },
  };
  await storage.write(scope, "pages/el/sxetika.json", JSON.stringify(greekPage));
  await syncPageMediaUsageOnWrite(PROJECT_ID, greekPage, EL);

  const greekItem = { id: "nea", uuid: "u-el-item", slug: "nea", settings: { title: "Nea", hero: "/uploads/images/b.png" } };
  await storage.write(scope, "collections/news/el/nea.json", JSON.stringify(greekItem));
  await storage.write(scope, "collections/news/el/_order.json", JSON.stringify({ order: ["nea"] }));
  await updateCollectionItemMediaUsage(PROJECT_ID, greekItem, "news", EL);

  const englishItem = {
    id: "story",
    uuid: "u-en-item",
    slug: "story",
    settings: { title: "Story", hero: "/uploads/images/b.png" },
  };
  await storage.write(scope, "collections/news/story.json", JSON.stringify(englishItem));
  await updateCollectionItemMediaUsage(PROJECT_ID, englishItem, "news");
}

describe("countLanguageContent", () => {
  it("counts what removal would delete, before anything is touched", async () => {
    await seedGreekContent();
    const counts = await countLanguageContent({ storage, scope, project: project(), code: "el" });
    // Two menus came with the language; globals are not counted, they are always a pair.
    assert.deepEqual(counts, { pages: 1, items: 1, menus: 2 });
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")), "counting deletes nothing");
  });

  it("refuses the default language and an unknown one", async () => {
    await assert.rejects(
      () => countLanguageContent({ storage, scope, project: project(), code: "en" }),
      /default language cannot be removed/,
    );
    await assert.rejects(
      () => countLanguageContent({ storage, scope, project: project(), code: "it" }),
      /not one of the site's languages/,
    );
  });
});

describe("removeLanguage", () => {
  it("deletes the language's pages, items, menus and globals, and nothing else", async () => {
    await seedGreekContent();
    const { languages, deleted } = await removeLanguage({ storage, scope, project: project(), code: "el" });

    assert.deepEqual(languages, []);
    assert.deepEqual(deleted, { pages: 1, items: 1, menus: 2 });

    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")), false);
    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el", "global", "header.json")), false);
    assert.equal(await fs.pathExists(path.join(projectBase(), "menus", "el", "main.json")), false);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "nea.json")), false);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "_order.json")), false);

    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "about.json")), "English pages stay");
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "global", "header.json")));
    assert.ok(await fs.pathExists(path.join(projectBase(), "menus", "main.json")));
    assert.ok(await fs.pathExists(path.join(projectBase(), "collections", "news", "story.json")));
  });

  it("clears the usage rows of everything it deleted, leaving the siblings' rows", async () => {
    await seedGreekContent();
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn.sort(), ["page:u-el-about", "page:u-en-about"]);

    await removeLanguage({ storage, scope, project: project(), code: "el" });

    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, ["page:u-en-about"]);
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img2")).usedIn, ["collection:u-en-item"]);
  });

  it("drops the Greek globals' usage without touching the English ones", async () => {
    await writeMediaFile(PROJECT_ID, {
      files: [{ id: "img1", filename: "logo.png", path: "/uploads/images/logo.png", type: "image/png", usedIn: [] }],
    });
    await storage.write(
      scope,
      "pages/global/header.json",
      JSON.stringify({ type: "header", settings: { logoImage: "/uploads/images/logo.png" } }),
    );
    await updateGlobalWidgetMediaUsage(PROJECT_ID, "header", { settings: { logoImage: "/uploads/images/logo.png" } });
    await addLanguage({ storage, scope, project: project(), code: "el" });
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] });
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn.sort(), ["global:el:header", "global:root:header"]);

    await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, ["global:root:header"]);
  });

  it("leaves the uploaded binaries alone — they are shared", async () => {
    await seedGreekContent();
    const upload = path.join(projectBase(), "uploads", "images", "a.png");
    await fs.outputFile(upload, "binary");
    await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.ok(await fs.pathExists(upload));
    assert.equal((await getMediaUsage(PROJECT_ID, "img1")).isInUse, true, "still used by the English page");
  });

  it("refuses the default language and an unknown one, deleting nothing", async () => {
    await seedGreekContent();
    await assert.rejects(
      () => removeLanguage({ storage, scope, project: project(), code: "en" }),
      /default language cannot be removed/,
    );
    await assert.rejects(
      () => removeLanguage({ storage, scope, project: project(), code: "it" }),
      /not one of the site's languages/,
    );
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")));
  });

  it("clears a uuid-less page's row, which was keyed by its folder and slug", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] });
    await writeMediaFile(PROJECT_ID, {
      files: [{ id: "img1", filename: "a.png", path: "/uploads/images/a.png", type: "image/png", usedIn: [] }],
    });
    const legacy = { slug: "legacy", widgets: { w1: { settings: { hero: "/uploads/images/a.png" } } } };
    await storage.write(scope, "pages/el/legacy.json", JSON.stringify(legacy));
    await syncPageMediaUsageOnWrite(PROJECT_ID, legacy, EL);
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, ["page:slug:el/legacy"]);

    await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, []);
  });
});

describe("removeLanguage — partial failures", () => {
  /** A storage view whose read or delete throws once, for the key matching `match`. */
  function failingOnce(kind, match) {
    let fired = false;
    return {
      ...storage,
      read: async (scope, key) => storage.read(scope, key),
      write: async (scope, key, content) => storage.write(scope, key, content),
      list: async (scope, dir) => storage.list(scope, dir),
      exists: async (scope, key) => storage.exists(scope, key),
      delete: async (scope, key) => {
        if (kind === "delete" && !fired && key.includes(match)) {
          fired = true;
          throw new Error("disk gone");
        }
        return storage.delete(scope, key);
      },
      ...(kind === "read"
        ? {
            read: async (scope, key) => {
              if (!fired && key.includes(match)) {
                fired = true;
                throw new Error("corrupt file");
              }
              return storage.read(scope, key);
            },
          }
        : {}),
    };
  }

  it("keeps a survivor's usage accurate when a delete fails, and still retries clean", async () => {
    await seedGreekContent();
    const flaky = failingOnce("delete", "collections/news/el/nea.json");

    await assert.rejects(() => removeLanguage({ storage: flaky, scope, project: project(), code: "el" }), /disk gone/);

    // The item is still on disk and still shows its image, so the image must not
    // be reported unused — media deletion would otherwise take a binary that
    // surviving content references.
    assert.ok(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "nea.json")));
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img2")).usedIn.sort(), [
      "collection:u-el-item",
      "collection:u-en-item",
    ]);
    assert.equal((await getMediaUsage(PROJECT_ID, "img1")).isInUse, true, "the Greek page survived too");

    const { deleted } = await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.equal(deleted.items, 1);
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img2")).usedIn, ["collection:u-en-item"]);
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "nea.json")), false);
  });

  it("restores a page's usage when a later delete fails", async () => {
    await seedGreekContent();
    // Menus are deleted last, after every page row has been cleared.
    const flaky = failingOnce("delete", "menus/el/main.json");

    await assert.rejects(() => removeLanguage({ storage: flaky, scope, project: project(), code: "el" }), /disk gone/);

    assert.equal(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")), false, "the page did go");
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn, ["page:u-en-about"], "so its row stays cleared");

    // The first attempt deleted one menu before failing on the other, so the
    // retry only has that one left to count.
    const { deleted } = await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.equal(deleted.menus, 1);
    assert.deepEqual(await fs.readdir(path.join(projectBase(), "menus", "el")), []);
  });

  it("refuses to delete a file it cannot read, leaving everything in place", async () => {
    await seedGreekContent();
    const flaky = failingOnce("read", "collections/news/el/nea.json");

    await assert.rejects(
      () => removeLanguage({ storage: flaky, scope, project: project(), code: "el" }),
      /could not be read/,
    );
    // Nothing was deleted, and no row was cleared on a guess about the uuid.
    assert.ok(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "nea.json")));
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")));
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img2")).usedIn.sort(), [
      "collection:u-el-item",
      "collection:u-en-item",
    ]);
  });

  it("refuses to delete an unreadable page the same way", async () => {
    await seedGreekContent();
    const flaky = failingOnce("read", "pages/el/sxetika.json");

    await assert.rejects(
      () => removeLanguage({ storage: flaky, scope, project: project(), code: "el" }),
      /could not be read/,
    );
    assert.ok(await fs.pathExists(path.join(projectBase(), "pages", "el", "sxetika.json")));
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "img1")).usedIn.sort(), ["page:u-el-about", "page:u-en-about"]);
  });

  it("deletes a collection folder that holds only its order file", async () => {
    await seedGreekContent();
    await storage.delete(scope, "collections/news/el/nea.json");

    const { deleted } = await removeLanguage({ storage, scope, project: project(), code: "el" });
    assert.equal(deleted.items, 0, "there were no items left to count");
    assert.equal(await fs.pathExists(path.join(projectBase(), "collections", "news", "el", "_order.json")), false);
  });
});

describe("DELETE /languages/:code and its summary", () => {
  const callRemove = async (code) => {
    const res = mockRes();
    await languageController.deleteLanguage(
      { scope, activeProject: project(), adapters: { storage }, params: { code } },
      res,
    );
    return res;
  };

  it("reports the counts, then removes and records it", async () => {
    await seedGreekContent();

    const summaryRes = mockRes();
    await languageController.getLanguageSummary(
      { scope, activeProject: project(), adapters: { storage }, params: { code: "el" } },
      summaryRes,
    );
    assert.deepEqual(summaryRes._json, { code: "el", pages: 1, items: 1, menus: 2 });

    const res = await callRemove("el");
    assert.equal(res._status, 200);
    assert.deepEqual(res._json.languages, []);
    assert.deepEqual(res._json.deleted, { pages: 1, items: 1, menus: 2 });
    assert.deepEqual(project().languages, []);
  });

  it("leaves the row listing the language when removal is refused", async () => {
    await seedGreekContent();
    const res = await callRemove("en");
    assert.equal(res._status, 400);
    assert.deepEqual(project().languages, ["el"]);
  });

  it("lets only one of two simultaneous removals through", async () => {
    await seedGreekContent();
    const results = await Promise.all([callRemove("el"), callRemove("el")]);
    assert.deepEqual(results.map((r) => r._status).sort(), [200, 404]);
    assert.deepEqual(project().languages, []);
  });
});
