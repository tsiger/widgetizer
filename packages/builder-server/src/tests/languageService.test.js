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
const { addLanguage } = await import("../services/languageService.js");
const languageController = await import("../controllers/languageController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { updateGlobalWidgetMediaUsage, getMediaUsage } = await import("../services/mediaUsageService.js");
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

  it("re-running after a half-finished seed converges, menus and globals together", async () => {
    await addLanguage({ storage, scope, project: project(), code: "el" });
    const first = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));

    // The row was never written (the caller does that), so the code is still addable.
    await addLanguage({ storage, scope, project: project(), code: "el" });
    const second = await fs.readJSON(path.join(projectBase(), "menus", "el", "main.json"));
    const header = await fs.readJSON(path.join(projectBase(), "pages", "el", "global", "header.json"));
    assert.notEqual(second.uuid, first.uuid);
    assert.equal(header.settings.headerNavigation, second.uuid, "the globals follow the newest copies");
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
