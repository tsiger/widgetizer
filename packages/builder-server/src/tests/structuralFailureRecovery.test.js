/**
 * What is left behind when a structural operation fails partway (R6).
 *
 * Creating from a preset, duplicating, and applying a theme update each cross
 * the filesystem and SQLite. These force a failure inside each one and assert
 * the three things a response message cannot show: which files exist
 * afterwards, what the project row records, and whether trying again works.
 *
 * Run with: node --test packages/builder-server/src/tests/structuralFailureRecovery.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-structural-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getThemeDir, getProjectDir } = await import("../config.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const { createProject, duplicateProject, applyProjectThemeUpdate } = await import(
  "../controllers/projectController.js"
);
const { invalidateThemeSourceCache } = await import("../controllers/themeController.js");
const { closeDb } = await import("../db/index.js");
const projectRepo = await import("../db/repositories/projectRepository.js");

const THEME = "__structural_theme__";
const UNREADABLE = 0o000;

function mockReq({ params = {}, body = {} } = {}) {
  return {
    params,
    body,
    app: { locals: {} },
    adapters: {
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR }),
      storage: new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR }),
    },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = {
    _status: 200, _json: null, headersSent: false,
    status(c) { res._status = c; return res; },
    json(d) { res._json = d; res.headersSent = true; return res; },
    setHeader() { return res; },
  };
  return res;
}

/** Run `body` with `target` unreadable, restoring the mode whatever happens. */
async function withUnreadable(target, mode, body) {
  await fs.chmod(target, UNREADABLE);
  try {
    return await body();
  } finally {
    await fs.chmod(target, mode);
  }
}

async function writeTheme(version) {
  const dir = getThemeDir(THEME);
  await fs.ensureDir(path.join(dir, "templates"));
  await fs.ensureDir(path.join(dir, "assets"));
  await fs.writeJson(path.join(dir, "theme.json"), { name: "Structural", version, settings: { global: {} } });
  await fs.writeFile(path.join(dir, "layout.liquid"), `<html data-v="${version}"></html>`);
  await fs.writeFile(path.join(dir, "assets", "site.css"), `/* v${version} */`);
  await fs.writeJson(path.join(dir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });
  // Preset items only seed against a collection type the THEME defines.
  await fs.outputJson(path.join(dir, "collection-types", "news", "schema.json"), {
    type: "news", schemaVersion: 1, displayName: "News", displayNamePlural: "News",
    hasItemPages: false, slugPrefix: "news", defaultSort: "manual",
    settings: [{ type: "text", id: "title", label: "Title", usedAsTitle: true }],
  });
  invalidateThemeSourceCache(THEME);
}

async function writePreset(name, { menus = true, collections = true } = {}) {
  const dir = path.join(getThemeDir(THEME), "presets", name);
  await fs.ensureDir(path.join(dir, "templates"));
  await fs.writeJson(path.join(dir, "templates", "index.json"), { name: "Preset Home", slug: "index", widgets: {} });
  if (menus) {
    await fs.ensureDir(path.join(dir, "menus"));
    await fs.writeJson(path.join(dir, "menus", "preset-menu.json"), { id: "preset-menu", name: "Preset", items: [] });
  }
  if (collections) {
    await fs.ensureDir(path.join(dir, "collections", "news"));
    await fs.writeJson(path.join(dir, "collections", "news", "hello.json"), { slug: "hello", settings: { title: "Hello" } });
  }
  invalidateThemeSourceCache(THEME);
  return dir;
}

async function create(name, body = {}) {
  const res = mockRes();
  await createProject(mockReq({ body: { name, theme: THEME, ...body } }), res);
  return res;
}

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
  await writeTheme("1.0.0");
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await projectRepo.writeProjectsData({ projects: [], activeProjectId: null });
  await writeTheme("1.0.0");
});

// ---------------------------------------------------------------------------
// Theme update
// ---------------------------------------------------------------------------

describe("a theme update that cannot be applied", () => {
  async function projectOnOldTheme() {
    const res = await create("Update Target", { receiveThemeUpdates: true });
    assert.equal(res._status, 201, JSON.stringify(res._json));
    return res._json;
  }

  it("leaves every theme file as it was, rather than a mixture of old and new", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    await writeTheme("2.0.0");

    const res = mockRes();
    await withUnreadable(path.join(getThemeDir(THEME), "layout.liquid"), 0o644, () =>
      applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res),
    );

    assert.equal(res._status, 500, JSON.stringify(res._json));
    // The file the old code deleted before failing to replace it.
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), true, "the layout must still be there");
    assert.match(await fs.readFile(path.join(dir, "layout.liquid"), "utf8"), /data-v="1\.0\.0"/);
    // And nothing else moved either: half-updated is its own kind of broken.
    assert.match(await fs.readFile(path.join(dir, "assets", "site.css"), "utf8"), /v1\.0\.0/);
  });

  it("says plainly that nothing changed, and keeps the paths and errno out of it", async () => {
    const project = await projectOnOldTheme();
    await writeTheme("2.0.0");

    const res = mockRes();
    await withUnreadable(path.join(getThemeDir(THEME), "layout.liquid"), 0o644, () =>
      applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res),
    );

    const message = res._json.error;
    assert.match(message, /nothing in the project was changed/i);
    // What the user is shown is a sentence, not a filesystem error. The path
    // and the errno belong in the log, where someone diagnosing it will look.
    assert.doesNotMatch(message, /EACCES|ENOENT|EPERM|errno/i, "no filesystem error codes");
    assert.doesNotMatch(message, /[/\\]/, "no paths");
    assert.doesNotMatch(message, /\.liquid|\.json/i, "no filenames");
    assert.doesNotMatch(message, /check|inspect|repair|manually/i, "nothing for a desktop user to go and do by hand");
  });

  it("does not record the new version, so the update is still offered", async () => {
    const project = await projectOnOldTheme();
    await writeTheme("2.0.0");

    const res = mockRes();
    await withUnreadable(path.join(getThemeDir(THEME), "layout.liquid"), 0o644, () =>
      applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res),
    );

    const row = projectRepo.getProjectById(project.id);
    assert.equal(row.themeVersion, "1.0.0", "a failed update must not claim the version it did not reach");
    assert.equal(row.lastThemeUpdateVersion, undefined);
  });

  it("can be retried once the cause is gone, and then actually updates", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    await writeTheme("2.0.0");

    const failed = mockRes();
    await withUnreadable(path.join(getThemeDir(THEME), "layout.liquid"), 0o644, () =>
      applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), failed),
    );
    assert.equal(failed._status, 500);

    const retry = mockRes();
    await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), retry);

    assert.equal(retry._status, 200, JSON.stringify(retry._json));
    assert.equal(retry._json.success, true);
    assert.match(await fs.readFile(path.join(dir, "layout.liquid"), "utf8"), /data-v="2\.0\.0"/);
    assert.match(await fs.readFile(path.join(dir, "assets", "site.css"), "utf8"), /v2\.0\.0/);
    assert.equal(projectRepo.getProjectById(project.id).themeVersion, "2.0.0");
  });

  it("leaves no working directories behind", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    await writeTheme("2.0.0");

    const res = mockRes();
    await withUnreadable(path.join(getThemeDir(THEME), "layout.liquid"), 0o644, () =>
      applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res),
    );

    assert.equal(await fs.pathExists(path.join(dir, ".theme-update-stage")), false);
    assert.equal(await fs.pathExists(path.join(dir, ".theme-update-backup")), false);
  });

  /**
   * The shape a process killed mid-swap leaves behind: the plan it wrote before
   * starting, the files it had displaced, and whatever it had already added.
   */
  async function leaveInterruptedUpdate(dir, { added = [], placedWhereAbsent = [] } = {}) {
    const backup = path.join(dir, ".theme-update-backup");
    await fs.ensureDir(backup);
    await fs.writeJson(path.join(backup, ".in-progress"), { added, placedWhereAbsent });
    await fs.move(path.join(dir, "layout.liquid"), path.join(backup, "layout.liquid"));
    return backup;
  }

  it("puts back files that an interrupted run had moved aside", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    const backup = await leaveInterruptedUpdate(dir);
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), false, "precondition");

    await writeTheme("2.0.0");
    const res = mockRes();
    await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), true);
    assert.equal(await fs.pathExists(backup), false);
  });

  // Putting back what was displaced is only half of it. An update also ADDS
  // pages, menus and theme paths the project did not have, and a crash has to
  // take those away again or the "previous state" is not the previous state.
  it("removes what an interrupted run had added", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    await fs.outputJson(path.join(dir, "menus", "new-menu.json"), { uuid: "new", name: "New", items: [] });
    await fs.outputJson(path.join(dir, "pages", "new-page.json"), { slug: "new-page", name: "New" });
    await fs.outputFile(path.join(dir, "snippets", "new.liquid"), "added");
    await leaveInterruptedUpdate(dir, {
      added: [path.join("menus", "new-menu.json"), path.join("pages", "new-page.json")],
      placedWhereAbsent: ["snippets"],
    });

    await writeTheme("2.0.0");
    const res = mockRes();
    await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal(await fs.pathExists(path.join(dir, "menus", "new-menu.json")), false, "an added menu");
    assert.equal(await fs.pathExists(path.join(dir, "pages", "new-page.json")), false, "an added page");
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), true, "and the displaced file is back");
  });

  // The plan is written atomically, so this should not occur — but guessing is
  // the one thing recovery must not do.
  it("stops rather than guessing when an interrupted run's plan cannot be read", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    const backup = path.join(dir, ".theme-update-backup");
    await fs.ensureDir(backup);
    await fs.writeFile(path.join(backup, ".in-progress"), "{ truncated");
    await fs.move(path.join(dir, "layout.liquid"), path.join(backup, "layout.liquid"));

    await writeTheme("2.0.0");
    const res = mockRes();
    await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.error, /could not be completed/i);
    // This is the branch where what the project now holds is NOT known, so the
    // message must not claim it was left alone — and must not send someone to
    // go and look at files they have no way to read.
    assert.doesNotMatch(res._json.error, /nothing (in the project )?was changed|left as it was/i);
    assert.doesNotMatch(res._json.error, /check|inspect|repair|manually|theme files/i);
    // It still put back what it could before stopping.
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), true);
    assert.equal(projectRepo.getProjectById(project.id).themeVersion, "1.0.0");
  });

  // The rollback list has to be built before each write, not after it. A write
  // that creates the file and then fails leaves a half-written one behind, and
  // a list of "what succeeded" has no entry for it.
  it("removes a new file that was only half written before the update failed", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    // A menu the theme adds, so the update has an addition to make.
    await fs.outputJson(path.join(getThemeDir(THEME), "menus", "added-menu.json"), { name: "Added", items: [] });
    await writeTheme("2.0.0");

    const realOutputJson = fs.outputJson;
    let broke = false;
    fs.outputJson = async (file, data, options) => {
      if (!broke && String(file).endsWith("added-menu.json")) {
        broke = true;
        await fs.outputFile(file, '{ "half written'); // the file now exists, truncated
        throw new Error("disk went away");
      }
      return realOutputJson(file, data, options);
    };

    const res = mockRes();
    try {
      await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);
    } finally {
      fs.outputJson = realOutputJson;
      await fs.remove(path.join(getThemeDir(THEME), "menus"));
    }

    assert.ok(broke, "the failure must actually have been staged");
    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.equal(
      await fs.pathExists(path.join(dir, "menus", "added-menu.json")),
      false,
      "a half-written file is not 'the project was left as it was'",
    );
    assert.match(await fs.readFile(path.join(dir, "layout.liquid"), "utf8"), /data-v="1\.0\.0"/);
    assert.equal(projectRepo.getProjectById(project.id).themeVersion, "1.0.0");
  });

  // Two updates of one project would each find the other's working directories
  // and read them as their own: the second takes the first's backup for an
  // interrupted run and undoes a swap that is still in progress.
  it("does not let a second update undo one that is still running", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    await writeTheme("2.0.0");

    const realMove = fs.move;
    let reachedSwap;
    const atSwap = new Promise((resolve) => { reachedSwap = resolve; });
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    let paused = false;

    fs.move = async (from, to, options) => {
      const result = await realMove(from, to, options);
      // Mid-swap: the plan is written, the layout is in place, the backup is
      // still there. Exactly when a second request must not touch anything.
      if (!paused && from === path.join(dir, ".theme-update-stage", "layout.liquid")) {
        paused = true;
        reachedSwap();
        await held;
      }
      return result;
    };

    try {
      const first = applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), mockRes());
      await atSwap;
      const secondRes = mockRes();
      const second = applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), secondRes);
      // Let the second request get as far as it can while the first is held.
      // Serialized, it parks on the queue and does nothing; unserialized, this
      // is where it runs its recovery over the first request's working files.
      for (let i = 0; i < 100; i += 1) await new Promise((resolve) => setImmediate(resolve));
      release();
      await Promise.all([first, second]);
    } finally {
      fs.move = realMove;
    }

    assert.ok(paused, "the race must actually have been staged");
    assert.equal(await fs.pathExists(path.join(dir, "layout.liquid")), true, "the layout must survive both");
    assert.match(await fs.readFile(path.join(dir, "layout.liquid"), "utf8"), /data-v="2\.0\.0"/);
    assert.equal(projectRepo.getProjectById(project.id).themeVersion, "2.0.0");
    assert.equal(await fs.pathExists(path.join(dir, ".theme-update-backup")), false);
  });

  // When the undo of an interrupted run cannot finish either, the recovery
  // files stay put for the next attempt — and the message says only that it
  // failed, because at that point what the project holds is not known.
  it("keeps the recovery files and claims nothing when the undo cannot finish", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    const backup = await leaveInterruptedUpdate(dir);
    // Recovery runs as part of an update, so there has to be one to apply.
    await writeTheme("2.0.0");

    const realMove = fs.move;
    let blocked = false;
    fs.move = async (from, to, options) => {
      if (String(from).includes(".theme-update-backup")) {
        blocked = true;
        throw new Error("disk went away");
      }
      return realMove(from, to, options);
    };

    const res = mockRes();
    try {
      await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);
    } finally {
      fs.move = realMove;
    }

    assert.ok(blocked, "the failure must actually have been staged");
    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.error, /could not be completed/i);
    assert.doesNotMatch(res._json.error, /has not been changed|left as it was/i, "that is not known here");
    assert.doesNotMatch(res._json.error, /check|inspect|repair|manually|theme files/i);
    assert.equal(await fs.pathExists(path.join(backup, "layout.liquid")), true, "the only copy of the file stays");
    assert.equal(projectRepo.getProjectById(project.id).themeVersion, "1.0.0");
  });

  // Without the marker the swap had finished, so the backup is stale and
  // restoring it would undo a good update.
  it("discards a leftover backup from a run that had already finished", async () => {
    const project = await projectOnOldTheme();
    const dir = getProjectDir(project.folderName);
    const backup = path.join(dir, ".theme-update-backup");

    await fs.ensureDir(backup); // no plan file: the swap had removed it
    await fs.writeFile(path.join(backup, "layout.liquid"), "<html data-v=\"0.0.1\"></html>");

    await writeTheme("2.0.0");
    const res = mockRes();
    await applyProjectThemeUpdate(mockReq({ params: { id: project.id } }), res);

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.match(await fs.readFile(path.join(dir, "layout.liquid"), "utf8"), /data-v="2\.0\.0"/);
    assert.equal(await fs.pathExists(backup), false);
  });
});

// ---------------------------------------------------------------------------
// Duplication
// ---------------------------------------------------------------------------

describe("a duplicate whose references cannot be re-pointed", () => {
  async function sourceWithReferences() {
    const res = await create("Duplication Source");
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const project = res._json;
    const dir = getProjectDir(project.folderName);
    const aboutUuid = "11111111-1111-4111-8111-111111111111";
    await fs.outputJson(path.join(dir, "pages", "about.json"), {
      uuid: aboutUuid, id: "about", slug: "about", name: "About", widgets: {}, widgetsOrder: [],
    });
    await fs.outputJson(path.join(dir, "pages", "index.json"), {
      uuid: "22222222-2222-4222-8222-222222222222", id: "index", slug: "index", name: "Home", widgetsOrder: ["w1"],
      widgets: { w1: { type: "linker", settings: { cta: { pageUuid: aboutUuid, href: "about.html", text: "About", target: "_self" } } } },
    });
    await fs.outputJson(path.join(dir, "menus", "main.json"), {
      id: "main", uuid: "33333333-3333-4333-8333-333333333333", name: "Main",
      items: [{ id: "1", label: "About", pageUuid: aboutUuid }],
    });
    // Sorts last, so the identity pass finishes and the passes that re-point
    // links, menus and groups never run — the shape that used to ship.
    await fs.writeFile(path.join(dir, "pages", "zz-broken.json"), "{ this is not json");
    return { project, dir, aboutUuid };
  }

  it("is not created at all, rather than created with links into the original", async () => {
    const { project } = await sourceWithReferences();
    const before = projectRepo.getAllProjects().length;

    const res = mockRes();
    await duplicateProject(mockReq({ params: { id: project.id } }), res);

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.error, /no copy was made/i);
    assert.doesNotMatch(res._json.error, /EACCES|ENOENT|errno/i, "no filesystem error codes");
    assert.equal(projectRepo.getAllProjects().length, before, "no row for the copy");
    assert.equal(await fs.pathExists(getProjectDir("duplication-source-copy")), false, "no directory either");
  });

  it("leaves the original untouched", async () => {
    const { project, dir, aboutUuid } = await sourceWithReferences();
    const res = mockRes();
    await duplicateProject(mockReq({ params: { id: project.id } }), res);
    assert.equal(res._status, 500);

    const index = await fs.readJson(path.join(dir, "pages", "index.json"));
    const menu = await fs.readJson(path.join(dir, "menus", "main.json"));
    assert.equal(index.widgets.w1.settings.cta.pageUuid, aboutUuid);
    assert.equal(menu.items[0].pageUuid, aboutUuid);
    assert.ok(projectRepo.getProjectById(project.id));
  });

  it("can be retried once the cause is gone, and then copies everything", async () => {
    const { project, dir, aboutUuid } = await sourceWithReferences();
    const failed = mockRes();
    await duplicateProject(mockReq({ params: { id: project.id } }), failed);
    assert.equal(failed._status, 500);

    await fs.remove(path.join(dir, "pages", "zz-broken.json"));
    const retry = mockRes();
    await duplicateProject(mockReq({ params: { id: project.id } }), retry);

    assert.equal(retry._status, 201, JSON.stringify(retry._json));
    const copyDir = getProjectDir(retry._json.folderName);
    const about = await fs.readJson(path.join(copyDir, "pages", "about.json"));
    const index = await fs.readJson(path.join(copyDir, "pages", "index.json"));
    const menu = await fs.readJson(path.join(copyDir, "menus", "main.json"));
    assert.notEqual(about.uuid, aboutUuid, "the copy gets its own identities");
    assert.equal(index.widgets.w1.settings.cta.pageUuid, about.uuid, "and its links follow them");
    assert.equal(menu.items[0].pageUuid, about.uuid, "and so do its menus");
  });
});

// ---------------------------------------------------------------------------
// Creating from a preset
// ---------------------------------------------------------------------------

describe("a preset that cannot be applied", () => {
  it("fails the creation instead of making a project that claims the preset", async () => {
    const presetDir = await writePreset("fancy");
    const before = projectRepo.getAllProjects().length;

    const res = await withUnreadable(path.join(presetDir, "menus"), 0o755, () => create("Preset Target", { preset: "fancy" }));

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.error, /nothing was created|could not be/i);
    assert.equal(projectRepo.getAllProjects().length, before, "no row");
    assert.equal(await fs.pathExists(getProjectDir("preset-target")), false, "no directory");
  });

  it("fails when the preset's collection items cannot be seeded", async () => {
    const presetDir = await writePreset("fancy");
    const before = projectRepo.getAllProjects().length;

    const res = await withUnreadable(path.join(presetDir, "collections", "news", "hello.json"), 0o644, () =>
      create("Preset Items", { preset: "fancy" }),
    );

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.equal(projectRepo.getAllProjects().length, before, "no row");
    assert.equal(await fs.pathExists(getProjectDir("preset-items")), false, "no directory");
  });

  it("can be retried once the cause is gone, and then applies the whole preset", async () => {
    const presetDir = await writePreset("fancy");
    const failed = await withUnreadable(path.join(presetDir, "menus"), 0o755, () =>
      create("Preset Retry", { preset: "fancy" }),
    );
    assert.equal(failed._status, 500);

    const res = await create("Preset Retry", { preset: "fancy" });

    assert.equal(res._status, 201, JSON.stringify(res._json));
    const dir = getProjectDir(res._json.folderName);
    assert.equal(await fs.pathExists(path.join(dir, "menus", "preset-menu.json")), true, "the preset's menu");
    assert.equal(await fs.pathExists(path.join(dir, "collections", "news", "hello.json")), true, "and its items");
    assert.equal(projectRepo.getProjectById(res._json.id).preset, "fancy");
  });

  // resolvePresetPaths runs after the theme has been copied, so a preset whose
  // settings file is present but unreadable fails with a directory already on
  // disk.
  it("leaves nothing behind when the preset's settings file cannot be read", async () => {
    const presetDir = await writePreset("broken");
    await fs.outputFile(path.join(presetDir, "preset.json"), "{ not json");
    const before = projectRepo.getAllProjects().length;

    const res = await create("Broken Settings", { preset: "broken" });

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.equal(projectRepo.getAllProjects().length, before, "no row");
    assert.equal(await fs.pathExists(getProjectDir("broken-settings")), false, "no directory");

    // And it can be retried once the preset is fixed.
    await fs.outputJson(path.join(presetDir, "preset.json"), { settings: { primary: "#123456" } });
    const retry = await create("Broken Settings", { preset: "broken" });
    assert.equal(retry._status, 201, JSON.stringify(retry._json));
    assert.equal(projectRepo.getProjectById(retry._json.id).preset, "broken");
  });

  // Not every preset has every component. Absent is not the same as broken.
  it("still creates a project from a preset that simply has no menus or collections", async () => {
    await writePreset("plain", { menus: false, collections: false });

    const res = await create("Plain Preset", { preset: "plain" });

    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.equal(projectRepo.getProjectById(res._json.id).preset, "plain");
  });
});
