/**
 * Page and menu slugs and theme ids from a request become storage keys or folders
 * (`pages/<slug>.json`, `themes/<id>`), so the routes accept only a single name.
 * Express decodes `%2F` in route params, so without the check
 * `DELETE /api/pages/..%2Ftheme` deleted the project's theme.json and
 * `DELETE /api/themes/..%2Fprojects` every project.
 *
 * Runs the real routers and controllers against an isolated data root.
 *
 * Run with: node --test packages/builder-server/src/tests/requestSlugs.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-request-slugs-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { default: express } = await import("express");
const { getProjectDir, getProjectPagesDir, getThemeDir } = await import("../config.js");
const { default: pagesRouter } = await import("../routes/pages.js");
const { default: menusRouter } = await import("../routes/menus.js");
const { default: themesRouter } = await import("../routes/themes.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb, getDb } = await import("../db/index.js");
const { LocalStorageAdapter, LocalScopeResolver, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT = {
  id: "request-slugs-project",
  folderName: "request-slugs-project",
  name: "Request Slugs",
  theme: "__request_slugs_theme__",
  themeVersion: "1.0.0",
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
};

let server;
let base;
const projectDir = () => getProjectDir(PROJECT.folderName);
const themeJson = () => path.join(projectDir(), "theme.json");
const pageFile = (...parts) => path.join(getProjectPagesDir(PROJECT.folderName), ...parts);

const send = (method, url, body) =>
  fetch(`${base}${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

before(async () => {
  await projectRepo.writeProjectsData({ projects: [PROJECT], activeProjectId: PROJECT.id });
  const adapters = {
    storage: new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR }),
    assetStorage: new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR }),
    scopeResolver: new LocalScopeResolver(getDb()),
  };
  const app = express();
  app.use((req, _res, next) => {
    req.adapters = adapters;
    next();
  });
  app.use("/api/pages", pagesRouter);
  app.use("/api/menus", menusRouter);
  app.use("/api/themes", themesRouter);
  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await fs.remove(projectDir());
  await fs.outputJson(themeJson(), { name: "Theme", version: "1.0.0", settings: {} });
  await fs.outputJson(pageFile("global", "header.json"), { type: "header", widgets: {} });
  await fs.outputJson(pageFile("global", "footer.json"), { type: "footer", widgets: {} });
  await fs.outputJson(pageFile("about.json"), { id: "about", slug: "about", name: "About", uuid: "u-about", widgets: {}, widgetsOrder: [] });
  await fs.outputJson(path.join(projectDir(), "menus", "main.json"), { id: "main", uuid: "u-main", name: "Main", items: [] });
});

describe("page slugs from a request", () => {
  it("refuses a page id that steps outside the pages folder", async () => {
    for (const [method, url, body] of [
      ["GET", "/pages/..%2Ftheme"],
      ["DELETE", "/pages/..%2Ftheme"],
      ["POST", "/pages/..%2Ftheme/duplicate", {}],
      ["PUT", "/pages/..%2Ftheme", { name: "Theme" }],
      ["POST", "/pages/bulk-delete", { pageIds: ["../theme"] }],
      ["POST", "/pages/bulk-delete", { pageIds: ["about", "el/about"] }],
    ]) {
      const response = await send(method, url, body);
      assert.equal(response.status, 400, `${method} ${url} ${JSON.stringify(body ?? "")}`);
    }
    assert.equal(await fs.pathExists(themeJson()), true);
    assert.equal(await fs.pathExists(pageFile("about.json")), true);
  });

  it("refuses a save whose body slug names another folder", async () => {
    for (const slug of ["el/foo", "../escaped", "..", "", 42]) {
      const response = await send("POST", "/pages/about/content", { slug, name: "About", widgets: {}, widgetsOrder: [] });
      assert.equal(response.status, 400, JSON.stringify(slug));
    }
    assert.equal(await fs.pathExists(pageFile("el", "foo.json")), false);
    assert.equal(await fs.pathExists(path.join(projectDir(), "escaped.json")), false);
    assert.equal(await fs.pathExists(pageFile("about.json")), true);
  });

  it("still reads, saves, renames and deletes ordinary pages", async () => {
    assert.equal((await send("GET", "/pages/about")).status, 200);

    const save = await send("POST", "/pages/about/content", { slug: "about", name: "About", widgets: {}, widgetsOrder: [] });
    assert.equal(save.status, 200);

    const rename = await send("POST", "/pages/about/content", { slug: "about-us", name: "About", widgets: {}, widgetsOrder: [] });
    assert.equal(rename.status, 200);
    assert.equal(await fs.pathExists(pageFile("about-us.json")), true);

    assert.equal((await send("DELETE", "/pages/about-us")).status, 200);
    assert.equal(await fs.pathExists(pageFile("about-us.json")), false);
  });

  // A theme's own page files keep their names, so a page need not be in the strict
  // form the editor generates to be read, saved and deleted.
  it("still manages a page a theme named outside the generated form", async () => {
    await fs.outputJson(pageFile("About_Us.json"), { id: "About_Us", slug: "About_Us", name: "About", uuid: "u-au", widgets: {}, widgetsOrder: [] });
    assert.equal((await send("GET", "/pages/About_Us")).status, 200);
    const save = await send("POST", "/pages/About_Us/content", { slug: "About_Us", name: "About", widgets: {}, widgetsOrder: [] });
    assert.equal(save.status, 200);
    assert.equal((await send("DELETE", "/pages/About_Us")).status, 200);
  });
});

describe("theme ids from a request", () => {
  it("refuses a theme id that steps outside the themes folder", async () => {
    const victim = path.join(path.dirname(getThemeDir("x")), "..", "victim-folder");
    await fs.outputFile(path.join(victim, "keep.txt"), "keep");
    for (const [method, url] of [
      ["DELETE", "/themes/..%2Fvictim-folder"],
      ["GET", "/themes/..%2Fvictim-folder"],
      ["GET", "/themes/..%2Fvictim-folder/widgets"],
      ["POST", "/themes/..%2Fvictim-folder/update"],
    ]) {
      const response = await send(method, url, method === "POST" ? {} : undefined);
      assert.equal(response.status, 400, `${method} ${url}`);
    }
    assert.equal(await fs.pathExists(path.join(victim, "keep.txt")), true);
  });
});

describe("menu ids from a request", () => {
  it("refuses a menu id that steps outside the menus folder", async () => {
    for (const [method, url, body] of [
      ["GET", "/menus/..%2Ftheme"],
      ["DELETE", "/menus/..%2Ftheme"],
      ["PUT", "/menus/..%2Ftheme", { name: "Theme", items: [] }],
      ["POST", "/menus/..%2Ftheme/duplicate", {}],
    ]) {
      const response = await send(method, url, body);
      assert.equal(response.status, 400, `${method} ${url}`);
    }
    assert.equal(await fs.pathExists(themeJson()), true);
  });

  it("still reads and deletes an ordinary menu", async () => {
    assert.equal((await send("GET", "/menus/main")).status, 200);
    assert.equal((await send("DELETE", "/menus/main")).status, 200);
    assert.equal(await fs.pathExists(path.join(projectDir(), "menus", "main.json")), false);
  });
});
