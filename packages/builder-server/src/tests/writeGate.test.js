/**
 * The write gate: every write to a site's content passes it inside the
 * content-write section, and a refusal reaches the caller as a 423 with nothing written.
 *
 * Run with: node --test packages/builder-server/src/tests/writeGate.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-write-gate-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

console.warn = () => {};
console.error = () => {};

const { createEditorApp } = await import("../createApp.js");
const { getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { closeDb, getDb } = await import("../db/index.js");
const { setWriteGate, runAsWriter, currentWriter } = await import("../services/writeGate.js");
const { withContentWriteLock } = await import("../services/contentCoordination.js");
const { SiteLockedError } = await import("@widgetizer/core/errors");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "write-gate-uuid";
const PROJECT_FOLDER = "write-gate-project";
const PROJECT_DIR = getProjectDir(PROJECT_FOLDER);
const ARCH_NEWS = path.resolve(import.meta.dirname, "../../../../themes/arch/collection-types/news");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let server;
let base;
let consulted;

async function writeJson(rel, value) {
  await fs.outputFile(path.join(PROJECT_DIR, rel), JSON.stringify(value, null, 2));
}

async function seedSite() {
  await fs.remove(PROJECT_DIR);
  projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Write Gate",
        theme: "__test_theme__",
        themeVersion: "1.0.0",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
  await writeJson("pages/index.json", { id: "index", slug: "index", name: "Home", uuid: "page-home", widgets: {}, widgetsOrder: [] });
  await writeJson("pages/about.json", { id: "about", slug: "about", name: "About", uuid: "page-about", widgets: {}, widgetsOrder: [] });
  await writeJson("pages/global/header.json", { type: "header", settings: {}, blocks: {}, blocksOrder: [] });
  await writeJson("menus/main-menu.json", { id: "main-menu", name: "Main", uuid: "menu-main", items: [] });
  await writeJson("menus/legacy.json", { id: "legacy", name: "Legacy", items: [] });
  await writeJson("theme.json", { name: "Test", version: "1.0.0", settings: { global: {} } });
  await fs.copy(ARCH_NEWS, path.join(PROJECT_DIR, "collection-types/news"));
  await writeJson("collections/news/first.json", { uuid: "item-first", slug: "first", title: "First", status: "published" });
  await fs.outputFile(path.join(TEST_DATA_DIR, "projects", PROJECT_FOLDER, "uploads/images/photo.png"), PNG);
  getDb().prepare("DELETE FROM media_files WHERE project_id = ?").run(PROJECT_ID);
  mediaRepo.addMediaFile(PROJECT_ID, {
    id: "media-photo",
    filename: "photo.png",
    originalName: "photo.png",
    type: "image/png",
    size: PNG.length,
    uploaded: new Date().toISOString(),
    path: "/uploads/images/photo.png",
    metadata: { alt: "Photo", title: "", caption: "" },
    sizes: {},
  });
}

async function fingerprintOfDisk() {
  const hash = crypto.createHash("sha256");
  const walk = async (dir) => {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else hash.update(`${path.relative(TEST_DATA_DIR, full)}\0`).update(await fs.readFile(full));
    }
  };
  await walk(path.join(TEST_DATA_DIR, "projects"));
  const db = getDb();
  hash.update(JSON.stringify(db.prepare("SELECT * FROM projects ORDER BY id").all()));
  hash.update(JSON.stringify(db.prepare("SELECT * FROM media_files ORDER BY id").all()));
  hash.update(JSON.stringify(db.prepare("SELECT * FROM media_file_translations ORDER BY media_file_id").all()));
  return hash.digest("hex");
}

function request(method, url, body, headers = {}) {
  const init = { method, headers: { "x-project-id": PROJECT_ID, ...headers } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return fetch(`${base}${url}`, init);
}

function upload() {
  const form = new FormData();
  form.append("files", new Blob([PNG], { type: "image/png" }), "new.png");
  return form;
}

const WRITES = [
  ["create page", "POST", "/api/pages", { name: "New", slug: "new" }],
  ["update page", "PUT", "/api/pages/about", { name: "About us", slug: "about" }],
  ["save page content", "POST", "/api/pages/about/content", { id: "about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] }],
  ["delete page", "DELETE", "/api/pages/about"],
  ["bulk delete pages", "POST", "/api/pages/bulk-delete", { pageIds: ["about"] }],
  ["duplicate page", "POST", "/api/pages/about/duplicate"],
  ["save header", "POST", "/api/preview/global-widgets/header", { type: "header", settings: {}, blocks: {}, blocksOrder: [] }],
  ["create menu", "POST", "/api/menus", { name: "Footer" }],
  ["update menu", "PUT", "/api/menus/main-menu", { name: "Main", items: [] }],
  ["duplicate menu", "POST", "/api/menus/main-menu/duplicate"],
  ["delete menu", "DELETE", "/api/menus/main-menu"],
  ["create item", "POST", "/api/collections/news", { slug: "second", settings: { title: "Second" } }],
  ["update item", "PUT", "/api/collections/news/first", { slug: "first", settings: { title: "First!" } }],
  ["delete item", "DELETE", "/api/collections/news/first"],
  ["duplicate item", "POST", "/api/collections/news/first/duplicate"],
  ["reorder items", "POST", "/api/collections/news/reorder", { order: ["first"] }],
  ["save theme settings", "POST", `/api/themes/project/${PROJECT_ID}`, { settings: { global: {} } }],
  ["change theme settings", "PATCH", `/api/themes/project/${PROJECT_ID}`, { changes: [] }],
  ["upload media", "POST", "/api/media", upload],
  ["update media metadata", "PUT", `/api/media/projects/${PROJECT_ID}/media/media-photo/metadata`, { alt: "Changed" }],
  ["delete media", "DELETE", "/api/media/media-photo"],
  ["bulk delete media", "POST", "/api/media/bulk-delete", { fileIds: ["media-photo"] }],
  ["refresh media usage", "POST", "/api/media/refresh-usage"],
  ["add language", "POST", "/api/languages", { code: "el" }],
  ["update project", "PUT", `/api/projects/${PROJECT_ID}`, { name: "Renamed", siteTitle: "New title" }],
  ["delete project", "DELETE", `/api/projects/${PROJECT_ID}`],
  ["apply theme update", "POST", `/api/projects/${PROJECT_ID}/theme-updates/apply`],
  ["toggle theme updates", "PUT", `/api/projects/${PROJECT_ID}/theme-updates`, { enabled: true }],
];

before(async () => {
  await fs.ensureDir(TEST_THEMES_DIR);
  const db = getDb();
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR }),
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR }),
      publish: new LocalPublishAdapter({ dataRoot: TEST_DATA_DIR, db }),
      limits: new LocalLimitsAdapter(db),
    },
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  setWriteGate(null);
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  setWriteGate(null);
  await seedSite();
  consulted = [];
});

function refuseEditors() {
  setWriteGate({
    check(projectId, writer) {
      consulted.push({ projectId, writer });
      if (writer.kind !== "test") throw new SiteLockedError("The assistant is working on this site.");
    },
  });
}

describe("while the gate refuses", () => {
  for (const [name, method, url, body] of WRITES) {
    it(`${name} answers 423 and writes nothing`, async () => {
      const before = await fingerprintOfDisk();
      refuseEditors();
      const response = await request(method, url, typeof body === "function" ? body() : body);
      const payload = await response.json().catch(() => ({}));
      assert.equal(response.status, 423, `${name}: ${JSON.stringify(payload)}`);
      assert.equal(payload.code, "SITE_LOCKED");
      assert.ok(consulted.some((call) => call.projectId === PROJECT_ID), "the gate was asked inside the section");
      setWriteGate(null);
      assert.equal(await fingerprintOfDisk(), before, `${name} changed the site`);
    });
  }

  it("a menu listing still answers, without backfilling a missing uuid", async () => {
    refuseEditors();
    const response = await request("GET", "/api/menus");
    assert.equal(response.status, 200);
    assert.ok((await response.json()).some((menu) => menu.id === "legacy"));
    assert.equal(consulted.at(-1).writer.kind, "maintenance");
    const saved = await fs.readJson(path.join(PROJECT_DIR, "menus/legacy.json"));
    assert.equal(saved.uuid, undefined);
  });

  it("the media library still answers", async () => {
    refuseEditors();
    const response = await request("GET", "/api/media");
    assert.equal(response.status, 200);
  });
});

describe("the writer a request carries", () => {
  it("reaches the gate from a JSON save and from a multipart upload", async () => {
    setWriteGate({ check: (projectId, writer) => void consulted.push(writer) });
    const headers = { "x-site-generation": "7" };
    assert.equal((await request("POST", "/api/pages/about/content", WRITES[2][3], headers)).status, 200);
    assert.equal((await request("POST", "/api/media", upload(), headers)).status, 201);
    assert.deepEqual(
      consulted.map((writer) => writer.baseline),
      ["7", "7"],
    );
    assert.ok(consulted.every((writer) => writer.kind === "editor"));
  });

  it("is an editor with no baseline when the header is absent", async () => {
    setWriteGate({ check: (projectId, writer) => void consulted.push(writer) });
    await request("POST", "/api/pages/about/content", WRITES[2][3]);
    assert.deepEqual(consulted, [{ kind: "editor", baseline: null }]);
  });

  it("runAsWriter names a writer for code that writes on its own behalf", async () => {
    setWriteGate({ check: (projectId, writer) => void consulted.push(writer) });
    await runAsWriter({ kind: "test", jobId: "j1" }, () => withContentWriteLock(PROJECT_ID, async () => currentWriter()));
    assert.deepEqual(consulted, [{ kind: "test", jobId: "j1" }]);
  });

  it("a write queued behind the section is refused once the gate closes", async () => {
    let release;
    const held = withContentWriteLock(PROJECT_ID, () => new Promise((resolve) => (release = resolve)));
    const queued = request("POST", "/api/pages/about/content", WRITES[2][3]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    refuseEditors();
    release();
    await held;
    assert.equal((await queued).status, 423);
  });
});

describe("deleting media whose copy can't be kept", () => {
  it("keeps the media record and says it failed", async () => {
    const db = getDb();
    const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
    assetStorage.prepareDelete = async () => {
      throw Object.assign(new Error("ENOSPC: no space left"), { code: "ENOSPC" });
    };
    const app = await createEditorApp({
      adapters: {
        scopeResolver: new LocalScopeResolver(db),
        previewScopeResolver: new LocalPreviewScopeResolver(db),
        storage: new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR }),
        assetStorage,
        publish: new LocalPublishAdapter({ dataRoot: TEST_DATA_DIR, db }),
        limits: new LocalLimitsAdapter(db),
      },
    });
    const local = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => local.once("listening", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${local.address().port}/api/media/media-photo`, {
        method: "DELETE",
        headers: { "x-project-id": PROJECT_ID },
      });
      assert.equal(response.status, 500);
      assert.ok(mediaRepo.getMediaFileById(PROJECT_ID, "media-photo"));

      mediaRepo.addMediaFile(PROJECT_ID, { ...mediaRepo.getMediaFileById(PROJECT_ID, "media-photo"), id: "media-second" });
      const bulk = await fetch(`http://127.0.0.1:${local.address().port}/api/media/bulk-delete`, {
        method: "POST",
        headers: { "x-project-id": PROJECT_ID, "content-type": "application/json" },
        body: JSON.stringify({ fileIds: ["media-photo", "media-second"] }),
      });
      assert.equal(bulk.status, 500);
      assert.ok(mediaRepo.getMediaFileById(PROJECT_ID, "media-photo"));
      assert.ok(mediaRepo.getMediaFileById(PROJECT_ID, "media-second"));
      assert.ok(await fs.pathExists(path.join(PROJECT_DIR, "uploads/images/photo.png")));
    } finally {
      await new Promise((resolve) => local.close(resolve));
    }
  });
});

describe("writes that waited for the section", () => {
  it("a menu uuid backfill keeps a save that landed after the listing read the menu", async () => {
    let release;
    const held = withContentWriteLock(PROJECT_ID, () => new Promise((resolve) => (release = resolve)));
    const listing = request("GET", "/api/menus");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeJson("menus/legacy.json", { id: "legacy", name: "Saved later", items: [{ label: "New" }] });
    release();
    await held;
    const menus = await (await listing).json();
    const saved = await fs.readJson(path.join(PROJECT_DIR, "menus/legacy.json"));
    assert.equal(saved.name, "Saved later");
    assert.equal(saved.items.length, 1);
    assert.ok(saved.uuid);
    assert.equal(menus.find((menu) => menu.id === "legacy").uuid, saved.uuid);
  });

  it("a menu uuid backfill doesn't bring back a menu deleted after the listing read it", async () => {
    let release;
    const held = withContentWriteLock(PROJECT_ID, () => new Promise((resolve) => (release = resolve)));
    const listing = request("GET", "/api/menus");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await fs.remove(path.join(PROJECT_DIR, "menus/legacy.json"));
    release();
    await held;
    assert.equal((await listing).status, 200);
    assert.equal(await fs.pathExists(path.join(PROJECT_DIR, "menus/legacy.json")), false);
  });

  it("a media description for a language removed meanwhile is refused, not recreated", async () => {
    getDb().prepare("UPDATE projects SET languages = ? WHERE id = ?").run(JSON.stringify(["el"]), PROJECT_ID);
    let release;
    const held = withContentWriteLock(PROJECT_ID, () => new Promise((resolve) => (release = resolve)));
    const save = request("PUT", `/api/media/projects/${PROJECT_ID}/media/media-photo/metadata?language=el`, { alt: "Φωτό" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    getDb().prepare("UPDATE projects SET languages = ? WHERE id = ?").run(JSON.stringify([]), PROJECT_ID);
    release();
    await held;
    const response = await save;
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "LANGUAGE_REMOVED");
    const rows = getDb().prepare("SELECT * FROM media_file_translations WHERE media_file_id = ?").all("media-photo");
    assert.deepEqual(rows, []);
  });
});

