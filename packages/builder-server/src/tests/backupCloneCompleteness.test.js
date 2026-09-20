/**
 * Duplicating a project, and backing one up and restoring it (R8).
 *
 * Both workflows must hand back the whole project — every language, including
 * one the static site export would refuse to publish — while keeping their
 * different identity rules: a duplicate gets new content uuids, a restore keeps
 * the ones in the backup.
 *
 * Run with: node --test packages/builder-server/src/tests/backupCloneCompleteness.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-backup-clone-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { DATA_DIR, getThemeDir, getProjectDir } = await import("../config.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const { createProject, duplicateProject, exportProject, importProject } = await import(
  "../controllers/projectController.js"
);
const { closeDb } = await import("../db/index.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { PassThrough } = await import("stream");
const AdmZip = await import("adm-zip");
const archiver = (await import("archiver")).default;

const THEME = "__backup_clone_theme__";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function mockReq({ params = {}, body = {}, file = null } = {}) {
  return {
    params,
    body,
    file,
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
    _status: 200, _json: null, _headers: {}, headersSent: false,
    status(c) { res._status = c; return res; },
    json(d) { res._json = d; res.headersSent = true; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
  };
  return res;
}

function mockStreamRes() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (c) => chunks.push(c));
  return Object.assign(stream, {
    _status: 200, _json: null, _headers: {}, headersSent: false,
    status(c) { stream._status = c; return stream; },
    json(d) { stream._json = d; stream.headersSent = true; return stream; },
    setHeader(k, v) { stream._headers[k] = v; return stream; },
    getBuffer() { return Buffer.concat(chunks); },
  });
}

async function backup(projectId) {
  const res = mockStreamRes();
  const ended = new Promise((resolve) => res.on("end", resolve));
  await exportProject(mockReq({ params: { projectId } }), res);
  if (res._status !== 200) return { res, buffer: null };
  await ended;
  return { res, buffer: res.getBuffer() };
}

async function importBuffer(buffer) {
  const tmp = path.join(DATA_DIR, "temp", `restore-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
  await fs.ensureDir(path.dirname(tmp));
  await fs.writeFile(tmp, buffer);
  const res = mockRes();
  await importProject(mockReq({ file: { path: tmp, size: buffer.length } }), res);
  return res;
}

/** Rebuild a ZIP with entries replaced — adm-zip's in-place update corrupts it. */
function rebuildZip(zip, { replace = {} } = {}) {
  const out = new AdmZip.default();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    out.addFile(entry.entryName, replace[entry.entryName] ?? entry.getData());
  }
  return out.toBuffer();
}

/**
 * Build a ZIP through `archiver`, the library the backup itself uses, so an
 * entry name can legitimately appear twice. adm-zip replaces a repeated name
 * instead of adding it, which is exactly the shape under test.
 */
function zipWithRepeatedNames(entries) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks = [];
    archive.on("data", (c) => chunks.push(c));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    for (const [name, data] of entries) archive.append(data, { name });
    archive.finalize();
  });
}

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
  const themeDir = getThemeDir(THEME);
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "theme.json"), { name: "Backup Clone", version: "1.0.0", settings: { global: {} } });
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html></html>");
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await projectRepo.writeProjectsData({ projects: [], activeProjectId: null });
});

// ---------------------------------------------------------------------------
// One bilingual project carrying every kind of thing R8 asks about
// ---------------------------------------------------------------------------

const UU = {
  index: "u-index", about: "u-about", child: "u-child",
  elIndex: "u-el-index", elSxetika: "u-el-sxetika", elOrfano: "u-el-orfano",
  deUeber: "u-de-ueber",
  menuEn: "u-menu-en", menuEl: "u-menu-el",
  alpha: "u-alpha", beta: "u-beta", elAlpha: "u-el-alpha", deArtikel: "u-de-artikel",
};

const RICH = `<p>See <a href="about.html" data-page-uuid="${UU.about}">About</a> and <a href="news/alpha.html" data-collection-item-uuid="${UU.alpha}">Alpha</a>.</p>`;

const page = (uuid, slug, name, extra = {}) => ({
  uuid, id: slug, slug, name, seo: { title: name }, widgets: {}, widgetsOrder: [], ...extra,
});

const referenceWidget = (menuUuid) => ({
  w1: {
    type: "linker",
    settings: {
      cta: { pageUuid: UU.about, href: "about.html", text: "About", target: "_self" },
      item: { collectionItemUuid: UU.alpha, href: "news/alpha.html", text: "Alpha", target: "_self" },
      nav: menuUuid,
      body: RICH,
    },
  },
});

const MEDIA = {
  files: [{
    id: "m-1", filename: "photo.jpg", originalName: "photo.jpg", type: "image/jpeg", size: 100,
    uploaded: "2026-01-01T00:00:00.000Z", path: "/uploads/images/photo.jpg",
    metadata: { alt: "A photo", title: "Photo", caption: "Cap" }, width: 8, height: 6,
    sizes: { thumb: { path: "/uploads/images/photo-thumb.jpg", width: 2, height: 1 } },
    usedIn: ["page:u-index"],
    // null means "inherit", "" means deliberately blank. The difference is the point.
    translations: { el: { alt: "Mia fotografia", title: null, caption: "" } },
  }],
};

async function createSource(name = "Complete Site") {
  const res = mockRes();
  await createProject(mockReq({ body: { name, theme: THEME } }), res);
  assert.equal(res._status, 201, JSON.stringify(res._json));
  const project = res._json;

  projectRepo.updateProject(project.id, { languages: ["el", "de"] }, { seeded: true });
  projectRepo.updateProject(project.id, {
    siteIdentity: { logo: "/uploads/images/photo.jpg" },
    lastThemeUpdateAt: "2026-02-02T00:00:00.000Z",
    lastThemeUpdateVersion: "1.2.3",
  });

  const dir = getProjectDir(project.folderName);
  const pages = path.join(dir, "pages");
  await fs.remove(pages);

  await fs.outputJson(path.join(pages, "index.json"),
    page(UU.index, "index", "Home", { widgets: referenceWidget(UU.menuEn), widgetsOrder: ["w1"] }));
  await fs.outputJson(path.join(pages, "about.json"), page(UU.about, "about", "About"));
  await fs.outputJson(path.join(pages, "child.json"), page(UU.child, "child", "Child", { parentPageUuid: UU.about }));
  await fs.outputJson(path.join(pages, "el", "index.json"), page(UU.elIndex, "index", "Arxiki", { language: "el" }));
  await fs.outputJson(path.join(pages, "el", "sxetika.json"), page(UU.elSxetika, "sxetika", "Sxetika", {
    language: "el", translationGroupId: UU.about,
    widgets: referenceWidget(UU.menuEl), widgetsOrder: ["w1"],
  }));
  // A translation group whose original identifying member has been deleted.
  await fs.outputJson(path.join(pages, "el", "orfano.json"),
    page(UU.elOrfano, "orfano", "Orfano", { language: "el", translationGroupId: "u-deleted-original" }));
  // German has content but no homepage, so the static site export skips it.
  // Neither of these workflows may.
  await fs.outputJson(path.join(pages, "de", "ueber-uns.json"),
    page(UU.deUeber, "ueber-uns", "Ueber uns", { language: "de" }));

  await fs.outputJson(path.join(pages, "global", "header.json"), { type: "header", ...referenceWidget(UU.menuEn).w1 });
  await fs.outputJson(path.join(pages, "el", "global", "header.json"), { type: "header", ...referenceWidget(UU.menuEl).w1 });

  await fs.outputJson(path.join(dir, "menus", "main.json"), {
    id: "main", uuid: UU.menuEn, name: "Main",
    items: [{ id: "1", label: "About", pageUuid: UU.about }, { id: "2", label: "Alpha", collectionItemUuid: UU.alpha }],
  });
  await fs.outputJson(path.join(dir, "menus", "el", "main.json"), {
    id: "main", uuid: UU.menuEl, name: "Kyrio", items: [{ id: "1", label: "Sxetika", pageUuid: UU.elSxetika }],
  });
  await fs.outputJson(path.join(dir, "menus", "de", "haupt.json"), { id: "haupt", uuid: "u-menu-de", name: "Haupt", items: [] });

  await fs.outputJson(path.join(dir, "collection-types", "news", "schema.json"), {
    type: "news", schemaVersion: 1, displayName: "News", displayNamePlural: "News", hasItemPages: true,
    slugPrefix: "news", defaultSort: "manual",
    settings: [
      { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
      { type: "link", id: "more", label: "More" },
    ],
  });
  const news = path.join(dir, "collections", "news");
  await fs.outputJson(path.join(news, "alpha.json"), {
    id: "alpha", uuid: UU.alpha, slug: "alpha", schemaVersion: 1,
    settings: {
      title: "Alpha",
      more: { pageUuid: UU.about, href: "about.html", text: "About", target: "_self" },
      retiredField: "kept from an older schema",
    },
  });
  await fs.outputJson(path.join(news, "beta.json"), { id: "beta", uuid: UU.beta, slug: "beta", schemaVersion: 1, settings: { title: "Beta" } });
  await fs.outputJson(path.join(news, "_order.json"), ["beta", "alpha"]);
  await fs.outputJson(path.join(news, "el", "alpha.json"), {
    id: "alpha", uuid: UU.elAlpha, slug: "alpha-el", schemaVersion: 1, language: "el",
    translationGroupId: UU.alpha, settings: { title: "Alpha EL" },
  });
  await fs.outputJson(path.join(news, "el", "_order.json"), ["alpha"]);
  await fs.outputJson(path.join(news, "de", "artikel.json"), {
    id: "artikel", uuid: UU.deArtikel, slug: "artikel", schemaVersion: 1, language: "de",
    translationGroupId: "u-deleted-item", settings: { title: "Artikel" },
  });

  await fs.outputJson(path.join(dir, "theme.json"), {
    version: "1.0.0",
    settings: { global: { general: [
      { type: "link", id: "cta", value: { pageUuid: UU.about, href: "about.html", text: "About", target: "_self" } },
      { type: "menu", id: "nav", value: UU.menuEn },
      { type: "richtext", id: "blurb", value: RICH },
    ] } },
  });

  await fs.outputFile(path.join(dir, "uploads", "images", "photo.jpg"), "binary");
  mediaRepo.writeMediaData(project.id, structuredClone(MEDIA));
  return project;
}

const readIf = async (p) => ((await fs.pathExists(p)) ? fs.readJson(p) : null);

/**
 * Everything both workflows owe the user, asserted against whichever project
 * they produced. `identities` says which rule applies: a duplicate gets new
 * content uuids, a restore keeps the ones in the backup.
 */
async function assertCompleteProject(row, { identities }) {
  const dir = getProjectDir(row.folderName);
  const p = (...rel) => path.join(dir, ...rel);

  assert.equal(row.defaultLanguage, "en");
  assert.deepEqual(row.languages, ["el", "de"], "both additional languages stay enabled");
  assert.deepEqual(row.siteIdentity, { logo: "/uploads/images/photo.jpg" });

  const pages = {
    index: await readIf(p("pages", "index.json")),
    about: await readIf(p("pages", "about.json")),
    child: await readIf(p("pages", "child.json")),
    elIndex: await readIf(p("pages", "el", "index.json")),
    elSxetika: await readIf(p("pages", "el", "sxetika.json")),
    elOrfano: await readIf(p("pages", "el", "orfano.json")),
    deUeber: await readIf(p("pages", "de", "ueber-uns.json")),
    header: await readIf(p("pages", "global", "header.json")),
    elHeader: await readIf(p("pages", "el", "global", "header.json")),
  };
  for (const [key, value] of Object.entries(pages)) assert.ok(value, `page missing: ${key}`);

  const menus = {
    main: await readIf(p("menus", "main.json")),
    el: await readIf(p("menus", "el", "main.json")),
    de: await readIf(p("menus", "de", "haupt.json")),
  };
  for (const [key, value] of Object.entries(menus)) assert.ok(value, `menu missing: ${key}`);

  const items = {
    alpha: await readIf(p("collections", "news", "alpha.json")),
    beta: await readIf(p("collections", "news", "beta.json")),
    order: await readIf(p("collections", "news", "_order.json")),
    elAlpha: await readIf(p("collections", "news", "el", "alpha.json")),
    elOrder: await readIf(p("collections", "news", "el", "_order.json")),
    deArtikel: await readIf(p("collections", "news", "de", "artikel.json")),
  };
  for (const [key, value] of Object.entries(items)) assert.ok(value, `collection file missing: ${key}`);
  assert.ok(await fs.pathExists(p("collection-types", "news", "schema.json")));

  const about = pages.about.uuid;
  const alpha = items.alpha.uuid;
  const menuEn = menus.main.uuid;

  if (identities === "new") {
    assert.notEqual(about, UU.about, "a duplicate's pages get their own identities");
    assert.notEqual(alpha, UU.alpha, "and so do its collection items");
    assert.notEqual(menuEn, UU.menuEn, "and its menus");
  } else {
    assert.equal(about, UU.about, "a restore keeps the identities in the backup");
    assert.equal(alpha, UU.alpha);
    assert.equal(menuEn, UU.menuEn);
  }

  // Translation groups, parents and every reference name something in THIS project.
  assert.equal(pages.elSxetika.translationGroupId, about, "the Greek page stays in its group");
  assert.equal(items.elAlpha.translationGroupId, alpha, "so does the Greek article");
  assert.equal(pages.elOrfano.translationGroupId, "u-deleted-original",
    "a group whose original member was deleted keeps its label, so survivors stay related");
  assert.equal(items.deArtikel.translationGroupId, "u-deleted-item");
  assert.equal(pages.child.parentPageUuid, about);

  assert.equal(menus.main.items[0].pageUuid, about);
  assert.equal(menus.main.items[1].collectionItemUuid, alpha);
  assert.equal(menus.el.items[0].pageUuid, pages.elSxetika.uuid);

  for (const [label, holder] of [
    ["index", pages.index.widgets.w1],
    ["el page", pages.elSxetika.widgets.w1],
    ["header", pages.header],
    ["el header", pages.elHeader],
  ]) {
    const s = holder.settings;
    assert.equal(s.cta.pageUuid, about, `${label}: widget link`);
    assert.equal(s.item.collectionItemUuid, alpha, `${label}: widget item link`);
    assert.ok(s.body.includes(`data-page-uuid="${about}"`), `${label}: richtext page anchor`);
    assert.ok(s.body.includes(`data-collection-item-uuid="${alpha}"`), `${label}: richtext item anchor`);
  }

  const theme = await readIf(p("theme.json"));
  const byId = Object.fromEntries(theme.settings.global.general.map((x) => [x.id, x]));
  assert.equal(byId.cta.value.pageUuid, about, "theme link");
  assert.equal(byId.nav.value, menuEn, "theme menu");
  assert.ok(byId.blurb.value.includes(`data-page-uuid="${about}"`), "theme richtext");

  assert.equal(items.alpha.settings.more.pageUuid, about, "item link");
  assert.equal(items.alpha.settings.retiredField, "kept from an older schema",
    "an out-of-schema field is the author's, and survives");
  assert.deepEqual(items.order, ["beta", "alpha"], "manual order, default language");
  assert.deepEqual(items.elOrder, ["alpha"], "manual order, other language");

  const file = mediaRepo.getMediaFiles(row.id).files[0];
  assert.ok(file, "the media library came across");
  assert.deepEqual(file.metadata, { alt: "A photo", title: "Photo", caption: "Cap" });
  assert.equal(file.translations.el.alt, "Mia fotografia", "a per-language override");
  assert.equal(file.translations.el.title, null, "'inherit' is not the same as blank");
  assert.equal(file.translations.el.caption, "", "and blank is not the same as inherit");
  assert.ok(file.sizes.thumb, "size variants");
  assert.notEqual(file.id, "m-1", "media rows are re-keyed so both projects can hold the library");
}

// ---------------------------------------------------------------------------

describe("duplicating a complete bilingual project", () => {
  it("hands back every language, reference and override, under new identities", async () => {
    const source = await createSource();
    const res = mockRes();
    await duplicateProject(mockReq({ params: { id: source.id } }), res);
    assert.equal(res._status, 201, JSON.stringify(res._json));

    await assertCompleteProject(projectRepo.getProjectById(res._json.id), { identities: "new" });
  });

  it("keeps the theme-update provenance the source carried", async () => {
    const source = await createSource();
    const res = mockRes();
    await duplicateProject(mockReq({ params: { id: source.id } }), res);
    const row = projectRepo.getProjectById(res._json.id);
    assert.equal(row.lastThemeUpdateAt, "2026-02-02T00:00:00.000Z");
    assert.equal(row.lastThemeUpdateVersion, "1.2.3");
  });
});

describe("backing up a complete bilingual project and restoring it", () => {
  it("hands back every language, reference and override, under the backup's identities", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const res = await importBuffer(buffer);
    assert.equal(res._status, 201, JSON.stringify(res._json));

    await assertCompleteProject(projectRepo.getProjectById(res._json.id), { identities: "kept" });
  });

  // A language the static site export refuses to publish is still part of the
  // project, and a backup that dropped it would lose work with nothing said.
  it("carries a language that has content but no homepage", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const zip = new AdmZip.default(buffer);
    const names = zip.getEntries().map((e) => e.entryName);

    assert.ok(names.includes("pages/de/ueber-uns.json"));
    assert.ok(names.includes("menus/de/haupt.json"));
    assert.ok(names.includes("collections/news/de/artikel.json"));
  });

  it("carries the theme-update provenance, and still imports a backup written before it existed", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const zip = new AdmZip.default(buffer);
    const manifest = JSON.parse(zip.getEntry("project-export.json").getData().toString("utf8"));
    assert.equal(manifest.project.lastThemeUpdateAt, "2026-02-02T00:00:00.000Z");
    assert.equal(manifest.project.lastThemeUpdateVersion, "1.2.3");

    const restored = projectRepo.getProjectById((await importBuffer(buffer))._json.id);
    assert.equal(restored.lastThemeUpdateAt, "2026-02-02T00:00:00.000Z");
    assert.equal(restored.lastThemeUpdateVersion, "1.2.3");

    // An older backup names neither, and imports without them.
    delete manifest.project.lastThemeUpdateAt;
    delete manifest.project.lastThemeUpdateVersion;
    const older = rebuildZip(zip, { replace: { "project-export.json": Buffer.from(JSON.stringify(manifest)) } });
    const res = await importBuffer(older);
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.equal(projectRepo.getProjectById(res._json.id).lastThemeUpdateAt, undefined);
  });
});

// The media library lives in SQLite. A file of the same name can still be
// sitting in the project directory — a project older than that move, or a
// restore that failed and left its copy behind.
describe("a project directory holding a stale uploads/media.json", () => {
  async function sourceWithStaleFile() {
    const res = mockRes();
    await createProject(mockReq({ body: { name: "Stale Metadata", theme: THEME } }), res);
    const project = res._json;
    mediaRepo.writeMediaData(project.id, { files: [{
      id: "m-current", filename: "CURRENT.jpg", originalName: "CURRENT.jpg", type: "image/jpeg", size: 2,
      uploaded: "2026-01-01T00:00:00.000Z", path: "/uploads/images/CURRENT.jpg",
      metadata: { alt: "current" }, usedIn: [],
    }] });
    await fs.outputJson(path.join(getProjectDir(project.folderName), "uploads", "media.json"), {
      files: [{
        id: "m-stale", filename: "OLD-STALE.jpg", originalName: "OLD-STALE.jpg", type: "image/jpeg", size: 1,
        uploaded: "2020-01-01T00:00:00.000Z", path: "/uploads/images/OLD-STALE.jpg", metadata: {},
      }],
    });
    return project;
  }

  it("writes the library once, from SQLite, and never from the file on disk", async () => {
    const source = await sourceWithStaleFile();
    const { buffer } = await backup(source.id);
    const entries = new AdmZip.default(buffer).getEntries().filter((e) => e.entryName === "uploads/media.json");

    assert.equal(entries.length, 1, "two entries of one name would let the stale one win on extraction");
    assert.deepEqual(
      JSON.parse(entries[0].getData().toString("utf8")).files.map((f) => f.filename),
      ["CURRENT.jpg"],
    );
  });

  it("restores the live library, not the file that was lying in the folder", async () => {
    const source = await sourceWithStaleFile();
    const { buffer } = await backup(source.id);
    const res = await importBuffer(buffer);
    assert.equal(res._status, 201, JSON.stringify(res._json));

    assert.deepEqual(
      mediaRepo.getMediaFiles(res._json.id).files.map((f) => f.filename),
      ["CURRENT.jpg"],
    );
  });

  // Older backups were built before this and can carry both copies. There is
  // nothing in them saying which library is current, so neither is chosen.
  it("refuses an older backup that carries two media libraries", async () => {
    const source = await sourceWithStaleFile();
    const { buffer } = await backup(source.id);
    const before = projectRepo.getAllProjects().length;
    const zip = new AdmZip.default(buffer);
    const entries = zip.getEntries().filter((e) => !e.isDirectory).map((e) => [e.entryName, e.getData()]);
    // The shape an older backup has: the file that was on disk, and the
    // serialized library, both under the one name.
    entries.push(["uploads/media.json", Buffer.from(JSON.stringify({ files: [] }))]);
    const twoLibraries = await zipWithRepeatedNames(entries);
    assert.equal(
      new AdmZip.default(twoLibraries).getEntries().filter((e) => e.entryName === "uploads/media.json").length,
      2,
      "the fixture must actually carry two",
    );

    const res = await importBuffer(twoLibraries);
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.error, /more than one media library/i);
    assert.equal(projectRepo.getAllProjects().length, before, "nothing was created");
  });

  // A library with no files is a project that has none. A file that parses but
  // is not a library at all is not the same thing, and reading it as empty
  // would report a restored project whose media the backup may well have held.
  it("restores a backup whose library is legitimately empty", async () => {
    const res = mockRes();
    await createProject(mockReq({ body: { name: "No Media", theme: THEME } }), res);
    const { buffer } = await backup(res._json.id);
    const entry = new AdmZip.default(buffer).getEntry("uploads/media.json");
    assert.ok(entry, "an empty library is still described");
    assert.deepEqual(JSON.parse(entry.getData().toString("utf8")).files, []);

    const restored = await importBuffer(buffer);
    assert.equal(restored._status, 201, JSON.stringify(restored._json));
    assert.deepEqual(mediaRepo.getMediaFiles(restored._json.id).files, []);
    assert.equal(
      await fs.pathExists(path.join(getProjectDir(restored._json.folderName), "uploads", "media.json")),
      false,
      "the restore's input is cleaned up once it has been used",
    );
  });

  for (const [label, body] of [
    ["an object that is not a library", {}],
    ["a files value that is not a list", { files: { "0": "photo.jpg" } }],
    ["null", null],
  ]) {
    it(`refuses a backup whose library is ${label}, instead of restoring nothing`, async () => {
      const source = await createSource();
      const { buffer } = await backup(source.id);
      const before = projectRepo.getAllProjects().length;
      const malformed = rebuildZip(new AdmZip.default(buffer), {
        replace: { "uploads/media.json": Buffer.from(JSON.stringify(body)) },
      });

      const res = await importBuffer(malformed);
      assert.equal(res._status, 500, JSON.stringify(res._json));
      assert.match(res._json.error, /not in a form this version can read/i);
      assert.equal(projectRepo.getAllProjects().length, before, "nothing was created");
    });
  }

  it("keeps the backup's media file so a failed restore can be retried", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const zip = new AdmZip.default(buffer);
    // A library this version cannot write: the restore must fail loudly rather
    // than report a success that lost it.
    const broken = rebuildZip(zip, {
      replace: { "uploads/media.json": Buffer.from(JSON.stringify({ files: ["not an object"] })) },
    });
    const before = projectRepo.getAllProjects().length;

    const res = await importBuffer(broken);
    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.error, /media library could not be restored/i);
    assert.equal(projectRepo.getAllProjects().length, before, "the half-made project was removed");
  });
});

// Every refusal above returns early. The server's own copy of the upload has to
// go on the way out of each of them, or a rejected import leaves a ZIP behind.
describe("the server's temporary copy of an uploaded backup", () => {
  async function uploadedCopyAfter(buffer) {
    const tmp = path.join(DATA_DIR, "temp", `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
    await fs.ensureDir(path.dirname(tmp));
    await fs.writeFile(tmp, buffer);
    const res = mockRes();
    await importProject(mockReq({ file: { path: tmp, size: buffer.length } }), res);
    return { res, left: await fs.pathExists(tmp) };
  }

  it("is removed after a successful import", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const { res, left } = await uploadedCopyAfter(buffer);
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.equal(left, false);
  });

  it("is removed when the import is refused", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const zip = new AdmZip.default(buffer);
    const manifest = JSON.parse(zip.getEntry("project-export.json").getData().toString("utf8"));
    manifest.project.languages = ["el", "fil"];
    const foreign = rebuildZip(zip, { replace: { "project-export.json": Buffer.from(JSON.stringify(manifest)) } });

    const { res, left } = await uploadedCopyAfter(foreign);
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.equal(left, false, "a refused import must not leave the upload on the server");
  });

  it("is removed when the ZIP is not a backup at all", async () => {
    const { res, left } = await uploadedCopyAfter(new AdmZip.default().toBuffer());
    assert.ok(res._status >= 400, JSON.stringify(res._json));
    assert.equal(left, false);
  });
});

describe("a backup this version cannot fully restore", () => {
  it("is refused before anything is created, and says so plainly", async () => {
    const source = await createSource();
    const { buffer } = await backup(source.id);
    const zip = new AdmZip.default(buffer);
    const manifest = JSON.parse(zip.getEntry("project-export.json").getData().toString("utf8"));
    // A code a later version supports and this one does not.
    manifest.project.languages = ["el", "fil"];
    const foreign = rebuildZip(zip, { replace: { "project-export.json": Buffer.from(JSON.stringify(manifest)) } });
    const before = projectRepo.getAllProjects().length;

    const res = await importBuffer(foreign);

    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.error, /cannot work with/i);
    assert.match(res._json.error, /nothing has changed/i);
    assert.match(res._json.error, /newer version/i, "the way out is a newer Widgetizer");
    // Nobody reading this should think the fix is to delete part of their site
    // or to open the backup file and edit it.
    assert.doesNotMatch(res._json.error, /\bremove\b|\bdelete\b|\bedit\b/i);
    assert.equal(projectRepo.getAllProjects().length, before,
      "importing part of a website is worse than importing none of it");
  });
});
