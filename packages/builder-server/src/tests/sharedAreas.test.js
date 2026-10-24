/**
 * Shared areas: reading and saving an area's content per language.
 *
 * Run with: node --test packages/builder-server/src/tests/sharedAreas.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-shared-areas-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const { getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { getSharedAreas, saveSharedArea } = await import("../controllers/sharedAreaController.js");
const { refreshAllMediaUsageFromDir } = await import("../services/mediaUsageService.js");
const { closeDb } = await import("../db/index.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "shared-areas-uuid";
const PROJECT_FOLDER = "shared-areas-project";
const IMAGE_ID = "img-hero";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
let widgetLimit = Infinity;
const limits = { getLimit: async () => widgetLimit };

const projectDir = () => getProjectDir(PROJECT_FOLDER);
const areaFile = (id, language = "") => path.join(projectDir(), "pages", language, "global", "areas", `${id}.json`);

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
    },
    res,
  );
  return res;
}

const widget = (type, settings = {}) => ({ type, settings, blocks: {}, blocksOrder: [] });
const area = (widgets) => ({ widgets, widgetsOrder: Object.keys(widgets) });

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Shared Areas",
        theme: "__shared_areas_theme__",
        defaultLanguage: "en",
        languages: ["el"],
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
});

beforeEach(async () => {
  widgetLimit = Infinity;
  await fs.remove(projectDir());
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: ["el"] });
  await fs.outputJson(path.join(projectDir(), "theme.json"), {
    name: "Areas",
    version: "1.0.0",
    sharedAreas: [{ id: "before_footer", label: "Before footer" }],
    settings: { global: {} },
  });
  await writeMediaFile(PROJECT_ID, {
    files: [{ id: IMAGE_ID, filename: "hero.jpg", path: "/uploads/images/hero.jpg", type: "image/jpeg", usedIn: [] }],
  });
});

after(async () => {
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("reading shared areas", () => {
  it("lists a declared area that was never saved as empty", async () => {
    const res = await call(getSharedAreas);
    assert.equal(res._status, 200);
    assert.deepEqual(res._json, {
      declared: [{ id: "before_footer", label: "Before footer" }],
      retained: [],
      areas: { before_footer: { widgets: {}, widgetsOrder: [] } },
    });
  });

  it("lists saved content the theme no longer declares as retained", async () => {
    await fs.outputJson(areaFile("old_banner"), area({ w1: widget("rich-text") }));
    const res = await call(getSharedAreas);
    assert.deepEqual(res._json.retained, [{ id: "old_banner" }]);
    assert.deepEqual(res._json.areas.old_banner.widgetsOrder, ["w1"]);
  });

  it("refuses to read an unreadable area as empty", async () => {
    await fs.outputFile(areaFile("before_footer"), "{ not json");
    const res = await call(getSharedAreas);
    assert.equal(res._status, 500);
    assert.equal(res._json.code, "AREA_UNREADABLE");
  });
});

describe("saving a shared area", () => {
  it("saves one language without touching the other", async () => {
    const english = area({ w1: widget("rich-text", { heading: "Hello" }) });
    const saved = await call(saveSharedArea, { params: { id: "before_footer" }, body: english });
    assert.equal(saved._status, 200, JSON.stringify(saved._json));

    const greek = area({ w2: widget("rich-text", { heading: "Γεια" }) });
    await call(saveSharedArea, { params: { id: "before_footer" }, body: greek, query: { language: "el" } });

    assert.deepEqual(await fs.readJson(areaFile("before_footer")), english);
    assert.deepEqual(await fs.readJson(areaFile("before_footer", "el")), greek);
    const res = await call(getSharedAreas, { query: { language: "el" } });
    assert.deepEqual(res._json.areas.before_footer, greek);
  });

  it("refuses an area the theme does not declare, including a retained one", async () => {
    await fs.outputJson(areaFile("old_banner"), area({}));
    for (const id of ["after_header", "old_banner", "../pages"]) {
      const res = await call(saveSharedArea, { params: { id }, body: area({}) });
      assert.equal(res._status, 404, id);
      assert.equal(res._json.code, "AREA_NOT_DECLARED");
    }
  });

  it("refuses a form and the page-only listing roles", async () => {
    const cases = [
      area({ f: widget("core-form") }),
      area({ n: widget("news-grid", { listing_anchor: true }) }),
      area({ n: widget("news-grid", { paginate: true }) }),
    ];
    for (const body of cases) {
      const res = await call(saveSharedArea, { params: { id: "before_footer" }, body });
      assert.equal(res._status, 422, JSON.stringify(body));
    }
    assert.equal(await fs.pathExists(areaFile("before_footer")), false);
  });

  it("refuses an order that names a widget the area does not hold", async () => {
    const res = await call(saveSharedArea, {
      params: { id: "before_footer" },
      body: { widgets: { w1: widget("rich-text") }, widgetsOrder: ["w1", "ghost"] },
    });
    assert.equal(res._status, 400);
  });

  it("applies the widget ceiling to the area alone", async () => {
    widgetLimit = 1;
    const res = await call(saveSharedArea, {
      params: { id: "before_footer" },
      body: area({ w1: widget("rich-text"), w2: widget("rich-text") }),
    });
    assert.equal(res._status, 422);
    assert.match(res._json.error, /maximum is 1/);
  });

  it("does not overwrite an unreadable area", async () => {
    await fs.outputFile(areaFile("before_footer"), "{ not json");
    const res = await call(saveSharedArea, { params: { id: "before_footer" }, body: area({}) });
    assert.equal(res._status, 500);
    assert.equal(await fs.readFile(areaFile("before_footer"), "utf8"), "{ not json");
  });

  it("is refused for a language removed while the save waited", async () => {
    const staleRow = projectRepo.getProjectById(PROJECT_ID);
    projectRepo.updateProject(PROJECT_ID, { languages: [] });
    const res = await call(saveSharedArea, {
      params: { id: "before_footer" },
      body: area({}),
      query: { language: "el" },
      activeProject: staleRow,
    });
    assert.equal(res._json.code, "LANGUAGE_REMOVED");
    assert.equal(await fs.pathExists(areaFile("before_footer", "el")), false);
  });
});

describe("images in a shared area", () => {
  const withImage = () => area({ w1: widget("image", { image: "/uploads/images/hero.jpg" }) });
  const usedIn = () => mediaRepo.getMediaFileById(PROJECT_ID, IMAGE_ID).usedIn;

  it("counts an image used only in an area as in use, per language", async () => {
    await call(saveSharedArea, { params: { id: "before_footer" }, body: withImage(), query: { language: "el" } });
    assert.deepEqual(usedIn(), ["area:el:before_footer"]);

    await call(saveSharedArea, { params: { id: "before_footer" }, body: area({}), query: { language: "el" } });
    assert.deepEqual(usedIn(), []);
  });

  it("keeps it in use through a full usage refresh, retained areas included", async () => {
    await fs.outputJson(areaFile("old_banner"), withImage());
    const result = await refreshAllMediaUsageFromDir({ projectId: PROJECT_ID, projectDir: projectDir() });
    assert.deepEqual(result.skipped ?? [], []);
    assert.deepEqual(usedIn(), ["area:root:old_banner"]);
  });
});
