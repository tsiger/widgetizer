/**
 * The not-found page's address: a page gets `404` only when it is created (a new
 * page, or a translation of a page at `404`) and never changes after. Every
 * path that sets or changes an address refuses with a 409 and a code instead of
 * moving a page onto or off `404`.
 *
 * Run with: node --test packages/builder-server/src/tests/notFoundPages.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-not-found-pages-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir } = await import("../config.js");
const pageController = await import("../controllers/pageController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "not-found-pages-uuid";
const PROJECT_FOLDER = "not-found-pages-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const projectBase = () => getProjectDir(PROJECT_FOLDER);
const project = () => projectRepo.getProjectById(PROJECT_ID);

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

const call = async (fn, { params = {}, body = {}, query = {} } = {}) => {
  const res = mockRes();
  await fn({ scope, activeProject: project(), adapters: { storage, assetStorage }, params, body, query, app: { locals: {} } }, res);
  return res;
};

const pageFile = (slug, language) => path.join(projectBase(), "pages", ...(language ? [language] : []), `${slug}.json`);

async function seedPage(slug, name, extra = {}) {
  const language = extra.language;
  const page = { id: slug, slug, uuid: `u-${language || "en"}-${slug}`, name, widgets: {}, widgetsOrder: [], ...extra };
  await storage.write(scope, `pages/${language ? `${language}/` : ""}${slug}.json`, JSON.stringify(page));
  return page;
}

before(() => {
  projectRepo.createProject({
    id: PROJECT_ID,
    folderName: PROJECT_FOLDER,
    name: "Not Found Pages",
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
  await fs.remove(projectBase());
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el"] });
  await fs.ensureDir(path.join(projectBase(), "pages", "global"));
  await seedPage("index", "Home");
  await seedPage("about", "About");
  await seedPage("404", "Page not found");
});

const assertLocked = (res, code = "NOT_FOUND_ADDRESS_LOCKED") => {
  assert.equal(res._status, 409, JSON.stringify(res._json));
  assert.equal(res._json.code, code);
};

describe("the 404 address in settings and content saves", () => {
  it('PUT /pages/404 with slug "oops" is refused and the file stays', async () => {
    const res = await call(pageController.updatePage, { params: { id: "404" }, body: { name: "Page not found", slug: "oops" } });
    assertLocked(res);
    assert.ok(await fs.pathExists(pageFile("404")));
    assert.ok(!(await fs.pathExists(pageFile("oops"))));
  });

  it('PUT /pages/about with slug "404" is refused', async () => {
    await fs.remove(pageFile("404"));
    const res = await call(pageController.updatePage, { params: { id: "about" }, body: { name: "About", slug: "404" } });
    assertLocked(res);
  });

  it('PUT /pages/about with an empty slug and the name "404" is refused', async () => {
    await fs.remove(pageFile("404"));
    const res = await call(pageController.updatePage, { params: { id: "about" }, body: { name: "404", slug: "" } });
    assertLocked(res);
  });

  it('POST /pages/about/content with slug "404" is refused', async () => {
    await fs.remove(pageFile("404"));
    const res = await call(pageController.savePageContent, {
      params: { id: "about" },
      body: { name: "About", slug: "404", widgets: {}, widgetsOrder: [] },
    });
    assertLocked(res);
  });

  it('POST /pages/404/content with slug "oops" is refused', async () => {
    const res = await call(pageController.savePageContent, {
      params: { id: "404" },
      body: { name: "Page not found", slug: "oops", widgets: {}, widgetsOrder: [] },
    });
    assertLocked(res);
  });

  it("PUT /pages/404 keeping its address saves", async () => {
    const res = await call(pageController.updatePage, { params: { id: "404" }, body: { name: "Lost?", slug: "404" } });
    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal((await fs.readJSON(pageFile("404"))).name, "Lost?");
  });

  it("a content save that writes a missing 404 page back keeps its address", async () => {
    await fs.remove(pageFile("404"));
    const res = await call(pageController.savePageContent, {
      params: { id: "404" },
      body: { name: "Page not found", slug: "404", uuid: "u-en-404", widgets: {}, widgetsOrder: [] },
    });
    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.ok(await fs.pathExists(pageFile("404")));
  });

  it("POST /pages creates a page at 404", async () => {
    await fs.remove(pageFile("404"));
    const res = await call(pageController.createPage, { body: { name: "Not found", slug: "404" } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.ok(await fs.pathExists(pageFile("404")));
  });
});

describe("translating the 404 page", () => {
  it("a translation of the 404 page is created at el/404", async () => {
    const res = await call(pageController.createPageLanguageVersion, { params: { id: "404" }, body: { targetLanguage: "el" } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.ok(await fs.pathExists(pageFile("404", "el")));
  });

  it("a translation of the 404 page with another address is refused", async () => {
    const res = await call(pageController.createPageLanguageVersion, {
      params: { id: "404" },
      body: { targetLanguage: "el", slug: "selida" },
    });
    assertLocked(res, "NOT_FOUND_TRANSLATION_ADDRESS");
    assert.ok(!(await fs.pathExists(pageFile("selida", "el"))));
  });

  it("a translation of an ordinary page at 404 is refused", async () => {
    const res = await call(pageController.createPageLanguageVersion, {
      params: { id: "about" },
      body: { targetLanguage: "el", slug: "404" },
    });
    assertLocked(res, "NOT_FOUND_TRANSLATION_ADDRESS");
  });

  it("translating into a language that already has a 404 page is refused, naming it", async () => {
    await seedPage("404", "Den vrethike", { language: "el" });
    const res = await call(pageController.createPageLanguageVersion, { params: { id: "404" }, body: { targetLanguage: "el" } });
    assertLocked(res, "NOT_FOUND_EXISTS");
    assert.match(res._json.message, /Greek already has a not-found page \("Den vrethike"\)/);
    assert.match(res._json.message, /delete it first/);
  });
});
