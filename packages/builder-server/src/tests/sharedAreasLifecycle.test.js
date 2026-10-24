/**
 * Shared areas through a project's life: created from a theme or preset, given to
 * a new language and taken away with it, copied with the project, and brought in
 * by a theme update without replacing what the owner has.
 *
 * Run with: node --test packages/builder-server/src/tests/sharedAreasLifecycle.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-areas-lifecycle-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const { getThemeDir, getProjectDir } = await import("../config.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const { createProject, duplicateProject, applyProjectThemeUpdate } = await import("../controllers/projectController.js");
const { createLanguage, deleteLanguage } = await import("../controllers/languageController.js");
const { invalidateThemeSourceCache } = await import("../controllers/themeController.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");

const THEME = "__areas_lifecycle_theme__";
const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });

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
  };
  return res;
}

async function call(fn, { params = {}, body = {}, project = null } = {}) {
  const res = mockRes();
  await fn(
    {
      params,
      body,
      query: {},
      app: { locals: {} },
      adapters: { storage, assetStorage, limits: { getLimit: async () => Infinity } },
      ...(project
        ? { scope: { projectId: project.id, folderName: project.folderName }, activeProject: projectRepo.getProjectById(project.id) }
        : {}),
      [Symbol.for("express-validator#contexts")]: [],
    },
    res,
  );
  return res;
}

const areaPath = (project, language = "", id = "before_footer") =>
  path.join(getProjectDir(project.folderName), "pages", language, "global", "areas", `${id}.json`);

/** A widget with a menu setting and a link, so copies can be checked for both. */
const NAV_SCHEMA = {
  settings: [
    { id: "menu", type: "menu", label: "Menu" },
    { id: "cta", type: "link", label: "Link" },
    { id: "image", type: "image", label: "Image" },
  ],
};

async function writeTheme(version, { areaTemplate } = {}) {
  const dir = getThemeDir(THEME);
  await fs.remove(dir);
  await fs.outputJson(path.join(dir, "theme.json"), {
    name: "Areas",
    version,
    sharedAreas: [{ id: "before_footer", label: "Before footer" }],
    settings: { global: {} },
  });
  await fs.outputFile(path.join(dir, "layout.liquid"), "<html>{{ main_content | raw }}{{ shared_areas.before_footer | raw }}</html>");
  await fs.outputJson(path.join(dir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });
  await fs.outputJson(path.join(dir, "templates", "about.json"), { name: "About", slug: "about", widgets: {} });
  await fs.outputJson(path.join(dir, "menus", "main-menu.json"), {
    id: "main-menu",
    name: "Main",
    items: [{ id: "i1", label: "About", link: "about.html" }],
  });
  await fs.outputJson(path.join(dir, "widgets", "nav", "schema.json"), NAV_SCHEMA);
  await fs.outputFile(path.join(dir, "widgets", "nav", "widget.liquid"), "<nav></nav>");
  if (areaTemplate) await fs.outputJson(path.join(dir, "templates", "global", "areas", "before_footer.json"), areaTemplate);
  invalidateThemeSourceCache(THEME);
}

const STARTING_AREA = {
  widgets: {
    n1: {
      type: "nav",
      settings: { menu: "main-menu", cta: { href: "about.html", text: "About us", target: "_self" } },
    },
    f1: { type: "core-form", settings: {} },
  },
  widgetsOrder: ["n1", "f1"],
};

async function createSite(name) {
  const res = await call(createProject, { body: { name, theme: THEME, receiveThemeUpdates: true } });
  assert.equal(res._status, 201, JSON.stringify(res._json));
  return res._json;
}

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
});

beforeEach(async () => {
  await projectRepo.writeProjectsData({ projects: [], activeProjectId: null });
  await writeTheme("1.0.0", { areaTemplate: STARTING_AREA });
});

after(async () => {
  console.warn = _origWarn;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("a new project", () => {
  it("gets the theme's starting content as an area, not a page, with its links stamped", async () => {
    const project = await createSite("Starting");
    const area = await fs.readJson(areaPath(project));

    assert.deepEqual(Object.keys(area).sort(), ["widgets", "widgetsOrder"]);
    assert.deepEqual(area.widgetsOrder, ["n1"], "the form the area cannot hold is left out");
    const about = await fs.readJson(path.join(getProjectDir(project.folderName), "pages", "about.json"));
    assert.equal(area.widgets.n1.settings.cta.pageUuid, about.uuid, "the link follows the page");
    const menu = await fs.readJson(path.join(getProjectDir(project.folderName), "menus", "main-menu.json"));
    assert.equal(area.widgets.n1.settings.menu, menu.uuid, "the menu is selected by its identity");
  });
});

describe("a language", () => {
  it("gets its own copy of each area, pointed at its own menus", async () => {
    const project = await createSite("Bilingual");
    const res = await call(createLanguage, { body: { code: "el" }, project });
    assert.equal(res._status, 201, JSON.stringify(res._json));

    const greek = await fs.readJson(areaPath(project, "el"));
    const greekMenu = await fs.readJson(path.join(getProjectDir(project.folderName), "menus", "el", "main-menu.json"));
    assert.equal(greek.widgets.n1.settings.menu, greekMenu.uuid);
    assert.equal(greek.widgets.n1.settings.cta.text, "About us", "words are copied, not translated");
  });

  it("does not get a file for an area never filled in the default language", async () => {
    await writeTheme("1.0.0");
    const project = await createSite("Empty area");
    await call(createLanguage, { body: { code: "el" }, project });
    assert.equal(await fs.pathExists(areaPath(project, "el")), false);
  });

  it("takes its areas and their image usage with it when removed", async () => {
    const project = await createSite("Removal");
    await writeMediaFile(project.id, {
      files: [{ id: "img", filename: "a.jpg", path: "/uploads/images/a.jpg", type: "image/jpeg", usedIn: [] }],
    });
    await call(createLanguage, { body: { code: "el" }, project });
    const greek = await fs.readJson(areaPath(project, "el"));
    greek.widgets.n1.settings.image = "/uploads/images/a.jpg";
    await fs.outputJson(areaPath(project, "el"), greek);
    // Saved content of an area the theme no longer shows goes too.
    await fs.outputJson(areaPath(project, "el", "old_banner"), { widgets: {}, widgetsOrder: [] });
    mediaRepo.updateMediaUsageForSource(project.id, "area:el:before_footer", ["img"]);

    const res = await call(deleteLanguage, { params: { code: "el" }, project });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    assert.equal(await fs.pathExists(areaPath(project, "el")), false);
    assert.equal(await fs.pathExists(areaPath(project, "el", "old_banner")), false);
    assert.deepEqual(mediaRepo.getMediaFileById(project.id, "img").usedIn, []);
    assert.equal(await fs.pathExists(areaPath(project)), true, "the default language keeps its area");
  });
});

describe("a duplicated project", () => {
  it("has its own areas, with links pointing at its own pages", async () => {
    const project = await createSite("Original");
    const res = await call(duplicateProject, { params: { id: project.id } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const copy = res._json;

    const area = await fs.readJson(areaPath(copy));
    const copyAbout = await fs.readJson(path.join(getProjectDir(copy.folderName), "pages", "about.json"));
    assert.equal(area.widgets.n1.settings.cta.pageUuid, copyAbout.uuid);

    area.widgets.n1.settings.cta.text = "Changed in the copy";
    await fs.outputJson(areaPath(copy), area);
    assert.equal((await fs.readJson(areaPath(project))).widgets.n1.settings.cta.text, "About us");
  });
});

describe("a theme update", () => {
  it("brings in a new area's starting content in every language", async () => {
    await writeTheme("1.0.0");
    const project = await createSite("Update");
    await call(createLanguage, { body: { code: "el" }, project });
    assert.equal(await fs.pathExists(areaPath(project)), false);

    await writeTheme("2.0.0", { areaTemplate: STARTING_AREA });
    const res = await call(applyProjectThemeUpdate, { params: { id: project.id } });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    for (const language of ["", "el"]) {
      const area = await fs.readJson(areaPath(project, language));
      assert.deepEqual(area.widgetsOrder, ["n1"], language || "default");
    }
  });

  it("never refills an area the owner emptied", async () => {
    const project = await createSite("Emptied");
    await fs.outputJson(areaPath(project), { widgets: {}, widgetsOrder: [] });

    await writeTheme("2.0.0", { areaTemplate: STARTING_AREA });
    const res = await call(applyProjectThemeUpdate, { params: { id: project.id } });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    assert.deepEqual(await fs.readJson(areaPath(project)), { widgets: {}, widgetsOrder: [] });
  });
});

describe("a preset", () => {
  async function writePreset(id, { areaTemplate } = {}) {
    const dir = path.join(getThemeDir(THEME), "presets", id);
    await fs.outputJson(path.join(getThemeDir(THEME), "presets", "presets.json"), { presets: [{ id, name: id }] });
    await fs.outputJson(path.join(dir, "templates", "index.json"), { name: "Preset Home", slug: "index", widgets: {} });
    await fs.outputJson(path.join(dir, "templates", "about.json"), { name: "About", slug: "about", widgets: {} });
    if (areaTemplate) await fs.outputJson(path.join(dir, "templates", "global", "areas", "before_footer.json"), areaTemplate);
    invalidateThemeSourceCache(THEME);
  }

  it("with its own pages still starts the area with the theme's content", async () => {
    await writePreset("plain");
    const res = await call(createProject, { body: { name: "Preset plain", theme: THEME, preset: "plain" } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.deepEqual((await fs.readJson(areaPath(res._json))).widgetsOrder, ["n1"]);
  });

  it("with its own area content uses that instead", async () => {
    await writePreset("own", {
      areaTemplate: { widgets: { p1: { type: "nav", settings: {} } }, widgetsOrder: ["p1"] },
    });
    const res = await call(createProject, { body: { name: "Preset own", theme: THEME, preset: "own" } });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.deepEqual((await fs.readJson(areaPath(res._json))).widgetsOrder, ["p1"]);
  });
});

describe("a theme update into a site whose languages differ", () => {
  it("fills a language that has no area yet, and leaves the one that has", async () => {
    await writeTheme("1.0.0");
    const project = await createSite("Mixed");
    await call(createLanguage, { body: { code: "el" }, project });
    const owners = { widgets: { mine: { type: "nav", settings: {} } }, widgetsOrder: ["mine"] };
    await fs.outputJson(areaPath(project), owners);

    await writeTheme("2.0.0", { areaTemplate: STARTING_AREA });
    const res = await call(applyProjectThemeUpdate, { params: { id: project.id } });
    assert.equal(res._status, 200, JSON.stringify(res._json));

    assert.deepEqual(await fs.readJson(areaPath(project)), owners);
    assert.deepEqual((await fs.readJson(areaPath(project, "el"))).widgetsOrder, ["n1"]);
  });
});
