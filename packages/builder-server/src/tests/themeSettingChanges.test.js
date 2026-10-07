/**
 * Change-only theme-settings saves.
 *
 * PATCH /api/themes/project/:projectId carries only the settings the editor
 * changed, each with the value it started from, and merges them into the file
 * held now. A screen holding an older copy (loaded before a theme update, or
 * before another screen saved) can then never put back a version, structure or
 * values it did not change. The whole-file POST keeps working, but refuses a
 * file from an older theme version.
 *
 * Run with: node --test src/tests/themeSettingChanges.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-changes-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectThemeJsonPath } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { saveProjectThemeSettings, saveProjectThemeSettingChanges } = await import(
  "../controllers/themeController.js"
);
const { mergeThemeSettingChanges, readThemeSettingChanges } = await import("../services/themeSettingChanges.js");
const { recordDeletedMediaPaths, clearDeletedMediaPaths } = await import("../services/contentCoordination.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "theme-changes-uuid";
const FOLDER = "theme-changes-project";
const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const SCOPE = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: FOLDER };
const themePath = () => getProjectThemeJsonPath(FOLDER, "local");

// The 0.9.9 → 0.9.10 shape of the reproduced bug: the update bumps the version
// and adds a setting the stale screen never saw.
const OLD_THEME = {
  name: "Arch",
  version: "0.9.9",
  settings: {
    global: {
      general: [
        { id: "enable_animations", type: "checkbox", label: "Animations", default: true, value: true },
        { id: "site_logo", type: "image", label: "Logo", default: "/default-logo.png" },
      ],
      colors: [
        { id: "accent", type: "color", label: "Accent", default: "#000000", value: "#ff0000" },
        { id: "photos", type: "gallery", label: "Photos" },
      ],
    },
  },
};
const updated = () => {
  const theme = JSON.parse(JSON.stringify(OLD_THEME));
  theme.version = "0.9.10";
  theme.settings.global.general.push({ id: "show_breadcrumbs", type: "checkbox", label: "Breadcrumbs", default: false });
  return theme;
};

async function call(fn, body) {
  const req = { params: { projectId: PROJECT_ID }, body, scope: SCOPE, adapters: { storage, assetStorage: null } };
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
  await fn(req, res);
  return res;
}

const writeTheme = (theme) => fs.outputJson(themePath(), theme, { spaces: 2 });
const readTheme = () => fs.readJson(themePath());
const item = (theme, id) => Object.values(theme.settings.global).flat().find((s) => s.id === id);

before(async () => {
  await fs.ensureDir(TEST_THEMES_DIR);
  await projectRepo.writeProjectsData({
    projects: [{ id: PROJECT_ID, folderName: FOLDER, name: "Theme changes", theme: "arch", created: new Date().toISOString() }],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(FOLDER, "local"));
});

after(async () => {
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  clearDeletedMediaPaths();
  await writeTheme(OLD_THEME);
});

describe("mergeThemeSettingChanges", () => {
  it("applies a change whose setting still holds its starting value", () => {
    const { theme, warnings, conflicts } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "colors", id: "accent", baseValue: "#ff0000", value: "#0000ff" },
    ]);
    assert.deepEqual(conflicts, []);
    assert.deepEqual(warnings, []);
    assert.equal(item(theme, "accent").value, "#0000ff");
    assert.equal(item(OLD_THEME, "accent").value, "#ff0000", "the input is not mutated");
  });

  it("reports a conflict when the setting was changed elsewhere", () => {
    const { conflicts } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "colors", id: "accent", baseValue: "#00ff00", value: "#0000ff" },
    ]);
    assert.deepEqual(conflicts, ["accent"]);
  });

  it("is not a conflict when the setting was changed elsewhere to the same value", () => {
    const { theme, conflicts } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "colors", id: "accent", baseValue: "#00ff00", value: "#ff0000" },
    ]);
    assert.deepEqual(conflicts, []);
    assert.equal(item(theme, "accent").value, "#ff0000");
  });

  it("removes the value for a change back to the default, without sanitizing one in", () => {
    const withValues = JSON.parse(JSON.stringify(OLD_THEME));
    item(withValues, "site_logo").value = "/uploads/images/logo.png";
    item(withValues, "photos").value = ["/uploads/images/a.png"];
    const { theme } = mergeThemeSettingChanges(withValues, [
      { group: "colors", id: "accent", baseValue: "#ff0000" },
      { group: "general", id: "site_logo", baseValue: "/uploads/images/logo.png" },
      { group: "colors", id: "photos", baseValue: ["/uploads/images/a.png"] },
    ]);
    for (const id of ["accent", "site_logo", "photos"]) {
      assert.equal("value" in item(theme, id), false, `${id} keeps no value`);
    }
  });

  it("matches a setting that uses its default against a change that started from the default", () => {
    const { theme, conflicts } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "general", id: "site_logo", value: "/uploads/images/logo.png" },
    ]);
    assert.deepEqual(conflicts, []);
    assert.equal(item(theme, "site_logo").value, "/uploads/images/logo.png");
  });

  it("skips a setting that is gone with a warning and applies the rest", () => {
    const { theme, warnings, conflicts } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "general", id: "retired", baseValue: 1, value: 2 },
      { group: "colors", id: "accent", baseValue: "#ff0000", value: "#0000ff" },
    ]);
    assert.deepEqual(conflicts, []);
    assert.deepEqual(warnings, [{ code: "SETTING_REMOVED", id: "retired" }]);
    assert.equal(item(theme, "accent").value, "#0000ff");
  });

  it("sanitizes only the changed setting and reports a correction", () => {
    const { theme, warnings } = mergeThemeSettingChanges(OLD_THEME, [
      { group: "colors", id: "accent", baseValue: "#ff0000", value: "not-a-color" },
    ]);
    assert.deepEqual(warnings, [{ code: "VALUE_CORRECTED", id: "accent", label: "Accent" }]);
    assert.notEqual(item(theme, "accent").value, "not-a-color");
  });
});

describe("readThemeSettingChanges", () => {
  it("accepts the same id in two groups but not the same (group, id) twice", () => {
    assert.ok(readThemeSettingChanges({ changes: [{ group: "a", id: "x" }, { group: "b", id: "x" }] }));
    assert.equal(readThemeSettingChanges({ changes: [{ group: "a", id: "x" }, { group: "a", id: "x" }] }), null);
  });

  it("refuses bodies that are not a list of { group, id } entries", () => {
    for (const body of [null, {}, { changes: {} }, { changes: [null] }, { changes: [{ id: "x" }] }, { changes: [{ group: "a", id: "" }] }, { settings: { global: {} } }]) {
      assert.equal(readThemeSettingChanges(body), null, JSON.stringify(body));
    }
  });
});

describe("PATCH theme settings", () => {
  // GH147: a screen loaded before the update saves one setting afterwards.
  it("keeps a theme update when a screen loaded before it saves a change", async () => {
    await writeTheme(updated());
    const res = await call(saveProjectThemeSettingChanges, {
      changes: [{ group: "general", id: "enable_animations", baseValue: true, value: false }],
    });
    assert.equal(res._status, 200);
    const saved = await readTheme();
    assert.equal(saved.version, "0.9.10");
    assert.ok(item(saved, "show_breadcrumbs"), "the setting the update added is still there");
    assert.equal(item(saved, "enable_animations").value, false);
    assert.deepEqual(res._json.theme, saved);
    assert.deepEqual(res._json.warnings, []);
  });

  it("keeps changes to different settings from two screens", async () => {
    await call(saveProjectThemeSettingChanges, {
      changes: [{ group: "colors", id: "accent", baseValue: "#ff0000", value: "#0000ff" }],
    });
    // The second screen loaded before the first saved; it changed another setting.
    const res = await call(saveProjectThemeSettingChanges, {
      changes: [{ group: "general", id: "enable_animations", baseValue: true, value: false }],
    });
    assert.equal(res._status, 200);
    const saved = await readTheme();
    assert.equal(item(saved, "accent").value, "#0000ff");
    assert.equal(item(saved, "enable_animations").value, false);
  });

  it("refuses the whole save when a changed setting was changed elsewhere, writing nothing", async () => {
    const before = await fs.readFile(themePath(), "utf8");
    const res = await call(saveProjectThemeSettingChanges, {
      changes: [
        { group: "general", id: "enable_animations", baseValue: true, value: false },
        { group: "colors", id: "accent", baseValue: "#00ff00", value: "#0000ff" },
      ],
    });
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "THEME_SETTINGS_CHANGED");
    assert.deepEqual(res._json.conflicts, ["accent"]);
    assert.equal(await fs.readFile(themePath(), "utf8"), before);
  });

  it("refuses a malformed body with nothing written", async () => {
    const before = await fs.readFile(themePath(), "utf8");
    const res = await call(saveProjectThemeSettingChanges, OLD_THEME);
    assert.equal(res._status, 400);
    assert.equal(res._json.code, "INVALID_CHANGES");
    assert.equal(await fs.readFile(themePath(), "utf8"), before);
  });

  it("answers an empty change list with the current file and does not write", async () => {
    const before = (await fs.stat(themePath())).mtimeMs;
    const res = await call(saveProjectThemeSettingChanges, { changes: [] });
    assert.equal(res._status, 200);
    assert.deepEqual(res._json.theme, OLD_THEME);
    assert.equal((await fs.stat(themePath())).mtimeMs, before);
  });

  it("answers a coded 404 when the theme file is missing", async () => {
    await fs.remove(themePath());
    const res = await call(saveProjectThemeSettingChanges, { changes: [] });
    assert.equal(res._status, 404);
    assert.equal(res._json.code, "THEME_SETTINGS_NOT_FOUND");
  });

  it("refuses to introduce an image deleted while the screen was open", async () => {
    recordDeletedMediaPaths(PROJECT_ID, ["/uploads/images/gone.png"]);
    const res = await call(saveProjectThemeSettingChanges, {
      changes: [{ group: "general", id: "site_logo", value: "/uploads/images/gone.png" }],
    });
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");
    assert.equal("value" in item(await readTheme(), "site_logo"), false);
  });
});

describe("POST theme settings (whole file)", () => {
  it("refuses a file from an older theme version, writing nothing", async () => {
    await writeTheme(updated());
    const before = await fs.readFile(themePath(), "utf8");
    const res = await call(saveProjectThemeSettings, OLD_THEME);
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "THEME_VERSION_CHANGED");
    assert.equal(await fs.readFile(themePath(), "utf8"), before);
  });

  it("still saves a file of the same version, or one without a version, with the old response shape", async () => {
    const same = JSON.parse(JSON.stringify(OLD_THEME));
    item(same, "accent").value = "#0000ff";
    const res = await call(saveProjectThemeSettings, same);
    assert.equal(res._status, 200);
    assert.deepEqual(Object.keys(res._json), ["message"]);

    const { version: _omit, ...unversioned } = same;
    const res2 = await call(saveProjectThemeSettings, unversioned);
    assert.equal(res2._status, 200);
  });
});
