/**
 * Media upload limits over real HTTP: the per-file limit from the limits
 * adapter, the optional storage reservation, and uploads streamed to temp files.
 *
 * Run with: node --test packages/builder-server/src/tests/mediaUploadLimits.test.js
 */

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import nodeFs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-upload-limits-test-${Date.now()}`);
// Upload temp files go under os.tmpdir(); point it at this suite's own folder so
// "temp cleaned" sees only this suite's uploads, not a parallel suite's.
const TMP_DIR = path.join(TEST_ROOT, "tmp");
fs.ensureDirSync(TMP_DIR);
process.env.TMPDIR = TMP_DIR;
process.env.TEMP = TMP_DIR;
process.env.TMP = TMP_DIR;
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origError = console.error;
const _origWarn = console.warn;
console.error = () => {};
console.warn = () => {};

const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { saveSettings } = await import("../db/repositories/settingsRepository.js");
const { uploadProjectMedia } = await import("../controllers/mediaController.js");
const { getMaxUploadBytes, DEFAULT_MAX_UPLOAD_BYTES } = await import("../utils/uploadLimits.js");
const { LIMIT_KEYS } = await import("@widgetizer/core/adapters");
const { runLimitsAdapterConformance } = await import("@widgetizer/core/test-helpers/limits");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "limits-project";
const PROJECT_FOLDER = "limits-project-folder";
const MB = 1024 * 1024;
const SCOPE = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const uploadsDir = (sub) => path.join(getProjectDir(PROJECT_FOLDER), "uploads", sub);

// The limits adapter the app runs with. Tests override the per-file limit and
// add or remove `reserveStorage`; everything else answers like OSS's own.
let localLimits;
let maxUploadOverride;
const limits = {
  async getLimit(scope, key) {
    if (key === LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES && maxUploadOverride !== undefined) return maxUploadOverride;
    return localLimits.getLimit(scope, key);
  },
};

// Every asset-store call, in order, interleaved with reservation events.
const events = [];
let failUploadOf = null;
function recordingAssetStorage(inner) {
  return new Proxy(inner, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value !== "function") return value;
      return async (scope, ...rest) => {
        if (prop === "upload" || prop === "delete") events.push({ type: prop, key: rest[0] });
        if (prop === "upload" && failUploadOf && rest[0].includes(failUploadOf)) {
          rest[1]?.destroy?.();
          throw new Error("store failed");
        }
        return value.call(target, scope, ...rest);
      };
    },
  });
}

/** A limits adapter with a fixed amount of storage room, recording its reservations. */
function makeReservingLimits(roomBytes, base) {
  let used = 0;
  return {
    getLimit: (scope, key) => base.getLimit(scope, key),
    async reserveStorage(_scope, bytes) {
      events.push({ type: "reserve", bytes });
      const available = roomBytes - used;
      if (bytes > available) return { ok: false, code: "STORAGE_FULL", availableBytes: available };
      let settled = false;
      return {
        ok: true,
        async commit(actualBytes) {
          assert.equal(settled, false, "a reservation is settled once");
          settled = true;
          used += actualBytes;
          events.push({ type: "commit", bytes: actualBytes });
        },
        async release() {
          assert.equal(settled, false, "a reservation is settled once");
          settled = true;
          events.push({ type: "release" });
        },
      };
    },
  };
}

let server;
let baseUrl;

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [{ id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Limits", theme: "arch", created: new Date().toISOString() }],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));

  const db = getDb();
  localLimits = new LocalLimitsAdapter(db);
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
      assetStorage: recordingAssetStorage(new LocalAssetStorageAdapter({ dataRoot: DATA_DIR })),
      publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
      limits,
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  maxUploadOverride = undefined;
  delete limits.reserveStorage;
  failUploadOf = null;
  events.length = 0;
  saveSettings({ media: { maxFileSizeMB: 50 } });
  await fs.emptyDir(uploadsDir("images"));
  await fs.emptyDir(uploadsDir("files"));
});

after(async () => {
  console.error = _origError;
  console.warn = _origWarn;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

const pdf = (bytes) => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(Math.max(0, bytes - 9), 0x41)]);
const jpeg = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } } }).jpeg({ quality: 90 }).toBuffer();

async function upload(parts) {
  const form = new FormData();
  for (const [name, bytes, type] of parts) form.append("files", new Blob([bytes], { type }), name);
  const response = await fetch(`${baseUrl}/api/media`, {
    method: "POST",
    headers: { "X-Project-Id": PROJECT_ID },
    body: form,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, json };
}

async function getLimits() {
  const response = await fetch(`${baseUrl}/api/limits`, { headers: { "X-Project-Id": PROJECT_ID } });
  return response.json();
}

async function tempLeftovers() {
  for (let i = 0; i < 100; i++) {
    const left = (await fs.readdir(TMP_DIR)).filter((name) => name.startsWith("widgetizer-"));
    if (left.length === 0) return left;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return (await fs.readdir(TMP_DIR)).filter((name) => name.startsWith("widgetizer-"));
}

describe("per-file upload limit", () => {
  it("per-file limit comes from the limits adapter, not the app setting", async () => {
    saveSettings({ media: { maxFileSizeMB: 50 } });
    maxUploadOverride = 1000;

    const { status, json } = await upload([["report.pdf", pdf(2000), "application/pdf"]]);
    assert.equal(status, 400);
    assert.equal(json.processedFiles.length, 0);
    assert.deepEqual(
      { ...json.rejectedFiles[0], reason: undefined },
      { originalName: "report.pdf", code: "FILE_TOO_LARGE", limitBytes: 1000, sizeBytes: 2000, reason: undefined },
    );
    assert.match(json.rejectedFiles[0].reason, /exceeds limit/);
    assert.deepEqual(await getLimits(), { maxUploadBytes: 1000 });
  });

  it("Infinity per-file means no check", async () => {
    saveSettings({ media: { maxFileSizeMB: 1 } });
    maxUploadOverride = Infinity;

    const { status, json } = await upload([["big.pdf", pdf(1.5 * MB), "application/pdf"]]);
    assert.equal(status, 201);
    assert.equal(json.processedFiles[0].size, 1.5 * MB);
    assert.deepEqual(await getLimits(), { maxUploadBytes: null });
  });

  it("no adapter: 10 MB default", async () => {
    assert.equal(DEFAULT_MAX_UPLOAD_BYTES, 10 * MB);
    assert.equal(await getMaxUploadBytes(undefined, SCOPE), 10 * MB);
    assert.equal(await getMaxUploadBytes({ limits: {} }, SCOPE), 10 * MB);

    // The controller's own check, called without a limits adapter.
    const src = path.join(TEST_ROOT, "eleven.pdf");
    await fs.writeFile(src, "%PDF-1.4");
    const res = mockRes();
    await uploadProjectMedia(
      {
        scope: SCOPE,
        adapters: { assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }) },
        files: [{ originalname: "eleven.pdf", filename: "eleven.pdf", mimetype: "application/pdf", size: 11 * MB, path: src }],
      },
      res,
    );
    assert.equal(res._status, 400);
    assert.equal(res._json.rejectedFiles[0].code, "FILE_TOO_LARGE");
    assert.equal(res._json.rejectedFiles[0].limitBytes, 10 * MB);
    assert.equal(await fs.pathExists(path.join(uploadsDir("files"), "eleven.pdf")), false);
  });

  it("local adapter still follows media.maxFileSizeMB", async () => {
    saveSettings({ media: { maxFileSizeMB: 1 } });

    const { status, json } = await upload([["too-big.mp4", Buffer.alloc(1.5 * MB, 1), "video/mp4"]]);
    assert.equal(status, 400);
    assert.equal(json.rejectedFiles[0].code, "FILE_TOO_LARGE");
    assert.equal(json.rejectedFiles[0].limitBytes, MB);
    assert.equal(json.rejectedFiles[0].sizeBytes, 1.5 * MB);
    assert.deepEqual(await getLimits(), { maxUploadBytes: MB });
  });

  it("one oversized file is refused, the others in the batch saved", async () => {
    maxUploadOverride = 64 * 1024;
    const photo = await jpeg(300, 200);

    const { status, json } = await upload([
      ["photo.jpg", photo, "image/jpeg"],
      ["huge.pdf", pdf(200 * 1024), "application/pdf"],
      ["small.pdf", pdf(4000), "application/pdf"],
    ]);
    assert.equal(status, 201);
    assert.deepEqual(json.processedFiles.map((f) => f.originalName).sort(), ["photo.jpg", "small.pdf"]);
    assert.equal(json.rejectedFiles.length, 1);
    assert.equal(json.rejectedFiles[0].originalName, "huge.pdf");
    assert.equal(json.rejectedFiles[0].code, "FILE_TOO_LARGE");
    assert.equal(json.rejectedFiles[0].sizeBytes, 200 * 1024);
    assert.ok(await fs.pathExists(path.join(uploadsDir("images"), "photo.jpg")));
    assert.ok(await fs.pathExists(path.join(uploadsDir("images"), "photo-thumb.jpg")));
    assert.ok(await fs.pathExists(path.join(uploadsDir("files"), "small.pdf")));
    assert.equal(await fs.pathExists(path.join(uploadsDir("files"), "huge.pdf")), false);
    assert.deepEqual(await tempLeftovers(), []);
  });

  it("aborts a request past the per-file limit times the file count", async () => {
    maxUploadOverride = 1024; // the request may carry at most 10 KB of files
    const { status } = await upload([["huge.pdf", pdf(64 * 1024), "application/pdf"]]);
    assert.equal(status, 413);
    assert.equal(events.filter((e) => e.type === "upload").length, 0);
    assert.deepEqual(await tempLeftovers(), []);
  });

  it("refuses an SVG over 5 MB whatever the per-file limit", async () => {
    maxUploadOverride = Infinity;
    const svg = Buffer.concat([Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'), Buffer.alloc(5 * MB, 0x20), Buffer.from("</svg>")]);
    const { status, json } = await upload([["big.svg", svg, "image/svg+xml"]]);
    assert.equal(status, 400);
    assert.equal(json.rejectedFiles[0].code, "SVG_TOO_LARGE");
    assert.equal(json.rejectedFiles[0].limitBytes, 5 * MB);
    assert.equal(json.rejectedFiles[0].sizeBytes, svg.length);
  });
});

describe("storage reservation", () => {
  it("reservation refused: nothing written, temp cleaned", async () => {
    limits.reserveStorage = makeReservingLimits(10, localLimits).reserveStorage;
    const photo = await jpeg(2000, 1500);

    const { status, json } = await upload([["wide.jpg", photo, "image/jpeg"]]);
    assert.equal(status, 400);
    const refused = json.rejectedFiles[0];
    assert.equal(refused.code, "STORAGE_FULL");
    assert.equal(refused.limitBytes, 10);
    assert.ok(refused.sizeBytes > photo.length, "the original and its copies are counted together");
    assert.deepEqual(events.map((e) => e.type), ["reserve"]);
    assert.deepEqual(await fs.readdir(uploadsDir("images")), []);
    assert.deepEqual(await tempLeftovers(), []);
  });

  it("copies measured and reserved before being stored", async () => {
    limits.reserveStorage = makeReservingLimits(100 * MB, localLimits).reserveStorage;
    const photo = await jpeg(2000, 1500);

    const { status, json } = await upload([["wide.jpg", photo, "image/jpeg"]]);
    assert.equal(status, 201);
    const record = json.processedFiles[0];
    assert.deepEqual(Object.keys(record.sizes).sort(), ["large", "medium", "small", "thumb"]);

    const onDisk = await fs.readdir(uploadsDir("images"));
    let storedBytes = 0;
    for (const name of onDisk) storedBytes += (await fs.stat(path.join(uploadsDir("images"), name))).size;
    assert.equal(onDisk.length, 5);

    assert.deepEqual(
      events.map((e) => e.type),
      ["reserve", "upload", "upload", "upload", "upload", "upload", "commit"],
    );
    assert.equal(events[0].bytes, storedBytes, "the reservation covers the original and every copy");
    assert.equal(events.at(-1).bytes, storedBytes, "the commit carries the bytes actually stored");
  });

  it("a failed store releases the reservation and removes what was stored", async () => {
    limits.reserveStorage = makeReservingLimits(100 * MB, localLimits).reserveStorage;
    failUploadOf = "-medium";
    const photo = await jpeg(2000, 1500);

    const { status, json } = await upload([["wide.jpg", photo, "image/jpeg"]]);
    assert.equal(status, 400);
    assert.match(json.rejectedFiles[0].reason, /store failed/);
    assert.equal(events.filter((e) => e.type === "release").length, 1);
    assert.equal(events.filter((e) => e.type === "commit").length, 0);
    assert.deepEqual(await fs.readdir(uploadsDir("images")), []);
    assert.deepEqual(await tempLeftovers(), []);
  });

  runLimitsAdapterConformance({
    describe,
    it,
    assert,
    name: "a reserving test adapter",
    makeAdapter: () => makeReservingLimits(1000, localLimits),
    makeAdapterWithRoom: (room) => makeReservingLimits(room, localLimits),
    makeScope: (id) => ({ ...SCOPE, projectId: `p-${id}`, folderName: `f-${id}` }),
  });
});

describe("streamed uploads", () => {
  it("upload body never fully buffered", async () => {
    // Reading an upload's temp file whole would hold it in memory: fail any such read.
    const isUploadTemp = (p) => typeof p === "string" && path.resolve(p).startsWith(TMP_DIR);
    const stubs = [
      [fs, "readFile"],
      [nodeFs, "readFile"],
      [nodeFs, "readFileSync"],
      [nodeFs.promises, "readFile"],
    ];
    const originals = stubs.map(([obj, name]) => obj[name]);
    stubs.forEach(([obj, name], i) => {
      obj[name] = function (p, ...rest) {
        if (isUploadTemp(p)) throw new Error(`buffered read of ${p}`);
        return originals[i].call(this, p, ...rest);
      };
    });
    try {
      const { status, json } = await upload([
        ["photo.jpg", await jpeg(1200, 800), "image/jpeg"],
        ["doc.pdf", pdf(300 * 1024), "application/pdf"],
      ]);
      assert.equal(status, 201, JSON.stringify(json?.rejectedFiles));
      assert.equal(json.processedFiles.length, 2);
    } finally {
      stubs.forEach(([obj, name], i) => {
        obj[name] = originals[i];
      });
    }
    assert.equal((await fs.stat(path.join(uploadsDir("files"), "doc.pdf"))).size, 300 * 1024);
  });
});

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
