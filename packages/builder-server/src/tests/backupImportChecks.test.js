/**
 * What a restored backup or an uploaded theme may bring in.
 *
 * A backup or theme ZIP is a file anyone can hand the user. Import refuses one
 * that unpacks to more than 100 times its size (a ZIP bomb), drops the theme
 * update's working folders, and refuses media paths, item slugs, translation
 * languages and project details the app itself would never write. Theme
 * uploads get the same unpacking check.
 *
 * Run with: node --test packages/builder-server/src/tests/backupImportChecks.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-backup-checks-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { DATA_DIR, getThemeDir, getProjectDir } = await import("../config.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const { createProject, exportProject, importProject } = await import("../controllers/projectController.js");
const { uploadTheme } = await import("../controllers/themeController.js");
const { extractZipSafely } = await import("../utils/zipSafety.js");
const { closeDb } = await import("../db/index.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { PassThrough } = await import("stream");
const AdmZip = (await import("adm-zip")).default;
const archiver = (await import("archiver")).default;

const THEME = "__backup_checks_theme__";

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
    _status: 200, _json: null, headersSent: false,
    status(c) { res._status = c; return res; },
    json(d) { res._json = d; res.headersSent = true; return res; },
    setHeader() { return res; },
  };
  return res;
}

async function backupOf(projectId) {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (c) => chunks.push(c));
  Object.assign(stream, {
    _status: 200, headersSent: false,
    status(c) { stream._status = c; return stream; },
    json(d) { stream._json = d; return stream; },
    setHeader() { return stream; },
  });
  const ended = new Promise((resolve) => stream.on("end", resolve));
  await exportProject(mockReq({ params: { projectId } }), stream);
  await ended;
  return Buffer.concat(chunks);
}

/** A ZIP built by archiver from [name, content] pairs, names kept exactly as given. */
function archiverZip(entries) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip");
    const chunks = [];
    archive.on("data", (c) => chunks.push(c));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    for (const [name, data] of entries) archive.append(data, { name });
    archive.finalize();
  });
}

/** The backup's entries as name -> Buffer, with `changes` applied (null removes). */
function rebuilt(buffer, changes = {}) {
  const entries = {};
  for (const entry of new AdmZip(buffer).getEntries()) if (!entry.isDirectory) entries[entry.entryName] = entry.getData();
  for (const [name, value] of Object.entries(changes)) {
    if (value === null) delete entries[name];
    else entries[name] = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
  }
  const out = new AdmZip();
  for (const [name, data] of Object.entries(entries)) out.addFile(name, data);
  return out.toBuffer();
}

async function toUpload(buffer, prefix = "upload") {
  const tmp = path.join(DATA_DIR, "temp", `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
  await fs.outputFile(tmp, buffer);
  return { path: tmp, size: buffer.length };
}

async function importBuffer(buffer) {
  const res = mockRes();
  await importProject(mockReq({ file: await toUpload(buffer) }), res);
  return res;
}

/** Import directories left in data/temp — a refusal must leave none behind. */
async function leftoverImportDirs() {
  const entries = await fs.readdir(path.join(DATA_DIR, "temp")).catch(() => []);
  return entries.filter((name) => name.startsWith("import-"));
}

let source;
let sourceBackup;
let manifest;

before(async () => {
  const themeDir = getThemeDir(THEME);
  await fs.ensureDir(path.join(themeDir, "templates"));
  await fs.writeJson(path.join(themeDir, "theme.json"), { name: "Backup Checks", version: "1.0.0", settings: { global: {} } });
  await fs.writeFile(path.join(themeDir, "layout.liquid"), "<html></html>");
  await fs.writeJson(path.join(themeDir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {} });
  await fs.outputJson(path.join(themeDir, "collection-types", "news", "schema.json"), {
    type: "news", schemaVersion: 1, displayName: "News", displayNamePlural: "News",
    hasItemPages: true, slugPrefix: "news", defaultSort: "manual",
    settings: [{ type: "text", id: "title", label: "Title", usedAsTitle: true }],
  });

  const res = mockRes();
  await createProject(mockReq({ body: { name: "Checked Source", theme: THEME } }), res);
  assert.equal(res._status, 201, JSON.stringify(res._json));
  source = res._json;
  projectRepo.updateProject(source.id, { languages: ["el"] }, { seeded: true });
  const dir = getProjectDir(source.folderName);
  await fs.outputFile(path.join(dir, "uploads", "images", "photo.jpg"), "jpg");
  await fs.outputJson(path.join(dir, "collections", "news", "hello.json"), {
    id: "hello", uuid: "u-hello", slug: "hello", settings: { title: "Hello" },
  });
  mediaRepo.writeMediaData(source.id, {
    files: [{
      id: "m-photo", filename: "photo.jpg", path: "/uploads/images/photo.jpg", type: "image/jpeg",
      sizes: { medium: { path: "/uploads/images/photo-medium.jpg", width: 10, height: 10 } },
      translations: { el: { alt: "Fotografia", title: null, caption: null } },
    }],
  });
  sourceBackup = await backupOf(source.id);
  manifest = JSON.parse(new AdmZip(sourceBackup).getEntry("project-export.json").getData().toString("utf8"));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

let projectsBefore;
beforeEach(() => {
  projectsBefore = projectRepo.getAllProjects().length;
});

/** Refused with a 400 naming `pattern`, with no project row and no files left behind. */
async function assertRefused(res, pattern) {
  assert.equal(res._status, 400, JSON.stringify(res._json));
  assert.match(res._json.error, pattern);
  assert.equal(projectRepo.getAllProjects().length, projectsBefore, "no project was created");
  assert.deepEqual(await leftoverImportDirs(), [], "the unpacked copy was removed");
}

describe("a backup made by the app", () => {
  it("still imports, with its media library, translations and items", async () => {
    const res = await importBuffer(sourceBackup);
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const dir = getProjectDir(res._json.folderName);
    assert.equal(await fs.pathExists(path.join(dir, "collections", "news", "hello.json")), true);
    const [file] = mediaRepo.getMediaFiles(res._json.id).files;
    assert.equal(file.path, "/uploads/images/photo.jpg");
    assert.equal(file.translations?.el?.alt, "Fotografia");
  });

  it("imports a text-only project that compresses well", async () => {
    const pages = {};
    for (let i = 0; i < 40; i++) {
      pages[`pages/page-${i}.json`] = { name: `Page ${i}`, slug: `page-${i}`, widgets: {}, body: "lorem ipsum ".repeat(400) };
    }
    const res = await importBuffer(rebuilt(sourceBackup, pages));
    assert.equal(res._status, 201, JSON.stringify(res._json));
  });
});

describe("a ZIP bomb", () => {
  it("is refused when the backup unpacks to more than 100 times its size", async () => {
    const res = await importBuffer(rebuilt(sourceBackup, { "pages/padding.json": Buffer.alloc(30 * 1024 * 1024) }));
    await assertRefused(res, /more than 100 times its own size/);
  });

  // The sizes a ZIP records about itself can be false; the real bytes count.
  it("is stopped on the real bytes when the ZIP understates them", async () => {
    const source = new AdmZip();
    source.addFile("big.bin", Buffer.alloc(20 * 1024 * 1024));
    const buffer = source.toBuffer();
    const zip = new AdmZip(buffer);
    zip.getEntries()[0].header.size = 10; // what a forged header would claim
    const dest = path.join(TEST_ROOT, "lying-zip");
    await assert.rejects(() => extractZipSafely(zip, buffer.length, dest), /more than 100 times/);
    const written = await fs.stat(path.join(dest, "big.bin")).then((st) => st.size, () => 0);
    assert.ok(written <= buffer.length * 100, "nothing past the budget was written");
  });

  it("is refused as a theme upload too, and nothing is installed", async () => {
    const zip = new AdmZip();
    zip.addFile("bomb-theme/theme.json", Buffer.from(JSON.stringify({ name: "Bomb", version: "1.0.0", author: "x" })));
    zip.addFile("bomb-theme/screenshot.png", Buffer.from("png"));
    zip.addFile("bomb-theme/layout.liquid", Buffer.from("<html></html>"));
    zip.addFile("bomb-theme/assets/padding.css", Buffer.alloc(30 * 1024 * 1024));
    zip.addFile("bomb-theme/templates/index.json", Buffer.from("{}"));
    zip.addFile("bomb-theme/widgets/hero/schema.json", Buffer.from(JSON.stringify({ type: "hero" })));
    const res = mockRes();
    await uploadTheme(mockReq({ file: await toUpload(zip.toBuffer(), "theme") }), res);
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.message, /more than 100 times its own size/);
    assert.equal(await fs.pathExists(getThemeDir("bomb-theme")), false);
  });
});

describe("ZIP entries that are not plain paths, or not intact", () => {
  const unpack = async (zip, name) => {
    const buffer = zip.toBuffer();
    const dest = path.join(TEST_ROOT, name);
    await extractZipSafely(new AdmZip(buffer), buffer.length, dest);
    return dest;
  };

  // Built with archiver, which keeps names as given; adm-zip tidies them on write.
  it("refuses a name that stands for another path", async () => {
    const aliases = ["pages/../.theme-update-backup/.in-progress", "./pages/x.json", "pages/./y.json", "theme/updates/1.1.0/x/../theme.json"];
    for (const name of aliases) {
      const buffer = await archiverZip([["pages/index.json", "{}"], [name, "{}"]]);
      const zip = new AdmZip(buffer);
      assert.ok(zip.getEntries().some((entry) => entry.entryName === name), `precondition: ${name} kept`);
      const dest = path.join(TEST_ROOT, `alias-${Math.random().toString(36).slice(2)}`);
      await assert.rejects(() => extractZipSafely(zip, buffer.length, dest), /unsafe path/, name);
    }
  });

  it("refuses the same file twice, even in a different case", async () => {
    const zip = new AdmZip();
    zip.addFile("theme/theme.json", Buffer.from("{}"));
    zip.addFile("theme/THEME.json", Buffer.from("{}"));
    await assert.rejects(() => unpack(zip, "duplicate"), /same file twice/);
  });

  it("refuses a stored entry whose content does not match its checksum", async () => {
    const source = new AdmZip();
    source.addFile("photo.jpg", Buffer.from("not really compressible?".repeat(2)));
    const buffer = source.toBuffer();
    const zip = new AdmZip(buffer);
    zip.getEntries()[0].header.crc = 12345;
    await assert.rejects(() => extractZipSafely(zip, buffer.length, path.join(TEST_ROOT, "bad-crc")), /damaged/);
  });

  it("reads backslash folders and empty files as adm-zip did", async () => {
    const zip = new AdmZip();
    zip.addFile("theme\\sub\\a.txt", Buffer.from("a"));
    zip.addFile("theme/empty.txt", Buffer.alloc(0));
    const dest = await unpack(zip, "windows-names");
    assert.equal(await fs.readFile(path.join(dest, "theme", "sub", "a.txt"), "utf8"), "a");
    assert.equal(await fs.readFile(path.join(dest, "theme", "empty.txt"), "utf8"), "");
  });

  it("refuses a file that is not a ZIP at all", async () => {
    const res = await importBuffer(Buffer.from("this is not a zip"));
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.error, /not a readable ZIP/);
  });
});

describe("theme-update working folders in a backup", () => {
  it("are left out of the imported project", async () => {
    const res = await importBuffer(
      rebuilt(sourceBackup, {
        ".theme-update-backup/.in-progress": { added: ["pages/index.json"], placedWhereAbsent: [] },
        ".theme-update-backup/layout.liquid": "planted",
        ".theme-update-stage/widgets/x.liquid": "planted",
      }),
    );
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const dir = getProjectDir(res._json.folderName);
    assert.equal(await fs.pathExists(path.join(dir, ".theme-update-backup")), false);
    assert.equal(await fs.pathExists(path.join(dir, ".theme-update-stage")), false);
  });
});

describe("content a backup made by the app never holds", () => {
  const withMedia = (file) => rebuilt(sourceBackup, { "uploads/media.json": { files: [file] } });
  const photo = { id: "m", filename: "photo.jpg", path: "/uploads/images/photo.jpg", type: "image/jpeg" };

  it("refuses a media path outside the uploads folder", async () => {
    for (const badPath of ["/uploads/images/../../../etc/hosts", "/etc/hosts", "/uploads/images/a/b.jpg", "/uploads/other/x.jpg", null]) {
      await assertRefused(await importBuffer(withMedia({ ...photo, path: badPath })), /outside the project's uploads folder/);
    }
  });

  it("refuses a size whose path leads outside the images folder", async () => {
    const file = { ...photo, sizes: { medium: { path: "/uploads/images/../../../etc/hosts", width: 1, height: 1 } } };
    await assertRefused(await importBuffer(withMedia(file)), /medium size of photo\.jpg/);
  });

  it("refuses media text for the default language or one the project lacks", async () => {
    for (const language of ["en", "fr"]) {
      const file = { ...photo, translations: { [language]: { alt: "x", title: null, caption: null } } };
      await assertRefused(await importBuffer(withMedia(file)), new RegExp(`"${language}" text for photo\\.jpg`));
    }
  });

  it("still accepts files, and the audio and video folders older versions wrote", async () => {
    const files = [
      { ...photo },
      { id: "f", filename: "guide.pdf", path: "/uploads/files/guide.pdf", type: "application/pdf" },
      { id: "v", filename: "clip.mp4", path: "/uploads/videos/clip.mp4", type: "video/mp4" },
      { id: "a", filename: "song.mp3", path: "/uploads/audios/song.mp3", type: "audio/mpeg" },
    ];
    const res = await importBuffer(rebuilt(sourceBackup, { "uploads/media.json": { files } }));
    assert.equal(res._status, 201, JSON.stringify(res._json));
  });

  it("accepts an item that has an id but no slug", async () => {
    const res = await importBuffer(rebuilt(sourceBackup, { "collections/news/plain.json": { id: "plain", uuid: "u-p" } }));
    assert.equal(res._status, 201, JSON.stringify(res._json));
  });

  it("refuses an entry that does not describe a file", async () => {
    await assertRefused(await importBuffer(rebuilt(sourceBackup, { "uploads/media.json": { files: ["x"] } })), /does not describe a file/);
  });

  it("refuses a collection item whose stored slug is not an item address", async () => {
    for (const slug of ["../../../escaped", "Hello World", 42]) {
      const res = await importBuffer(rebuilt(sourceBackup, { "collections/news/el/sneaky.json": { id: "sneaky", uuid: "u-s", slug } }));
      await assertRefused(res, /collections\/news\/el\/sneaky\.json/);
    }
  });
});

describe("project details a backup made by the app never holds", () => {
  const withProject = (changes) =>
    rebuilt(sourceBackup, { "project-export.json": { ...manifest, project: { ...manifest.project, ...changes } } });

  it("refuses a theme or preset name that is not a single folder name", async () => {
    await assertRefused(await importBuffer(withProject({ theme: "../projects" })), /theme name/);
    await assertRefused(await importBuffer(withProject({ preset: "a/b" })), /preset name/);
  });

  it("refuses details that are not the right kind of value", async () => {
    await assertRefused(await importBuffer(withProject({ name: 42 })), /project name is not text/);
    await assertRefused(await importBuffer(withProject({ siteTitle: { a: 1 } })), /siteTitle is not text/);
    await assertRefused(await importBuffer(withProject({ siteUrl: ["https://a.com"] })), /siteUrl is not text/);
    await assertRefused(await importBuffer(withProject({ cleanUrls: "yes" })), /cleanUrls setting/);
  });

  // Projects saved before the Site Address was checked can still hold one like
  // this; it imports as it was, and output treats it as no address.
  it("keeps a Site Address an older project saved without the current checks", async () => {
    const res = await importBuffer(withProject({ siteUrl: "mysite.com" }));
    assert.equal(res._status, 201, JSON.stringify(res._json));
    assert.equal(projectRepo.getProjectById(res._json.id).siteUrl, "mysite.com");
  });

  it("reads 0 and 1 as the yes/no settings they stand for", async () => {
    const res = await importBuffer(withProject({ cleanUrls: 1, receiveThemeUpdates: 0 }));
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const row = projectRepo.getProjectById(res._json.id);
    assert.equal(row.cleanUrls, true);
    assert.equal(row.receiveThemeUpdates, false);
  });

  it("strips markup from the name, title and notes, as the create form does", async () => {
    const res = await importBuffer(
      withProject({ name: "<b>Bold</b> Site", siteTitle: "<i>Title</i>", description: "<script>x</script>Notes" }),
    );
    assert.equal(res._status, 201, JSON.stringify(res._json));
    const row = projectRepo.getProjectById(res._json.id);
    assert.equal(row.name, "Bold Site");
    assert.equal(row.siteTitle, "Title");
    assert.doesNotMatch(row.description, /</);
  });
});
