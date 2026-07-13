/**
 * Dir-explicit project-content readers.
 *
 * These are pure FS transforms over a caller-supplied project working directory
 * (no DATA_DIR reach-through, no SQLite, no scope). They back the scope-free
 * render path (engine deps, preview/export) and are the OSS-internal counterparts
 * to the request-boundary StorageAdapter reads. The tests run against a scratch
 * directory only — no isolated DATA_ROOT / DB bootstrap needed, which is the
 * whole point of the dir-explicit contract.
 *
 * Behaviour must match the folderName-based readers they replace
 * (listProjectPagesData / readGlobalWidgetData in pageController, and the strict
 * theme read in readProjectThemeData).
 *
 * Run with: node --test packages/builder-server/src/tests/projectContentFs.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

import { listPagesFromDir, readGlobalWidgetFromDir, readThemeDataFromDir } from "../utils/projectContentFs.js";

let root;
let projectDir; // a fully-populated project working dir
let emptyDir; // exists, but has no pages/ subdir and no theme.json

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "widgetizer-content-fs-"));
  projectDir = path.join(root, "project");
  emptyDir = path.join(root, "empty");

  // pages/<slug>.json — two valid, one malformed (must be skipped), one non-JSON
  // (must be ignored), plus the global/ subdir (must not be listed as a page).
  await fs.ensureDir(path.join(projectDir, "pages", "global"));
  await fs.writeJSON(path.join(projectDir, "pages", "home.json"), { id: "stale", name: "Home", widgets: [] });
  await fs.writeJSON(path.join(projectDir, "pages", "about.json"), { name: "About", widgets: [] });
  await fs.writeFile(path.join(projectDir, "pages", "broken.json"), "{ not valid json");
  await fs.writeFile(path.join(projectDir, "pages", "notes.txt"), "ignore me");

  // pages/global/{header,footer}.json
  await fs.writeJSON(path.join(projectDir, "pages", "global", "header.json"), { widgetType: "header-1" });
  await fs.writeJSON(path.join(projectDir, "pages", "global", "footer.json"), { widgetType: "footer-1" });

  // theme.json
  await fs.writeJSON(path.join(projectDir, "theme.json"), { settings: { global: { colors: [] } } });

  await fs.ensureDir(emptyDir);
});

after(async () => {
  await fs.remove(root);
});

describe("listPagesFromDir", () => {
  it("lists and parses page JSON files, injecting id from the filename", async () => {
    const pages = await listPagesFromDir(projectDir);

    // Two valid pages; broken.json skipped, notes.txt ignored, global/ not listed.
    assert.equal(pages.length, 2);

    const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
    assert.deepEqual(Object.keys(byId).sort(), ["about", "home"]);
    assert.equal(byId.home.name, "Home");
    assert.equal(byId.about.name, "About");
  });

  it("injects id from the filename, overriding any stale id in the file", async () => {
    const pages = await listPagesFromDir(projectDir);
    const home = pages.find((p) => p.name === "Home");
    assert.equal(home.id, "home"); // not the stale "id" baked into the file
  });

  it("returns an empty array when the pages directory is absent", async () => {
    const pages = await listPagesFromDir(emptyDir);
    assert.deepEqual(pages, []);
  });
});

describe("readGlobalWidgetFromDir", () => {
  it("reads the header global widget and injects its type", async () => {
    const header = await readGlobalWidgetFromDir(projectDir, "header");
    assert.ok(header);
    assert.equal(header.type, "header");
    assert.equal(header.widgetType, "header-1");
  });

  it("reads the footer global widget and injects its type", async () => {
    const footer = await readGlobalWidgetFromDir(projectDir, "footer");
    assert.ok(footer);
    assert.equal(footer.type, "footer");
  });

  it("returns null for an invalid widget type", async () => {
    const result = await readGlobalWidgetFromDir(projectDir, "sidebar");
    assert.equal(result, null);
  });

  it("returns null when the global widget file is missing", async () => {
    const result = await readGlobalWidgetFromDir(emptyDir, "header");
    assert.equal(result, null);
  });
});

describe("readThemeDataFromDir", () => {
  it("reads and parses theme.json", async () => {
    const data = await readThemeDataFromDir(projectDir);
    assert.ok(data.settings);
    assert.ok(data.settings.global);
  });

  it("throws (strict) when theme.json is missing", async () => {
    await assert.rejects(
      () => readThemeDataFromDir(emptyDir),
      (err) => err.message.includes("not found"),
    );
  });
});
