/**
 * MP4 upload and playback serving over real HTTP.
 *
 * The controller suites hand `req.files` straight to the handler, which would
 * not notice the multer gate rejecting MP4. This suite goes through the full
 * OSS app — multipart upload, the per-request size cap from the limits
 * adapter, and byte-range serving that a <video> element needs to seek.
 *
 * Run with: node --test packages/builder-server/src/tests/mediaVideo.test.js
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-video-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origError = console.error;
console.error = () => {};

const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { saveSettings } = await import("../db/repositories/settingsRepository.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "video-project";
const PROJECT_FOLDER = "video-project-folder";
const OTHER_PROJECT_ID = "other-project";
const OTHER_PROJECT_FOLDER = "other-project-folder";

// Not a decodable movie — serving and storage never look inside the file, and
// distinct bytes at every offset make a misplaced range visible.
const MP4_BYTES = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftypisom"),
  Buffer.from(Array.from({ length: 4000 }, (_, i) => i % 251)),
]);

const assetScopes = [];
let server;
let baseUrl;

function recordingAssetStorage(inner) {
  return new Proxy(inner, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value !== "function") return value;
      return (scope, ...rest) => {
        assetScopes.push({ method: prop, projectId: scope?.projectId, folderName: scope?.folderName });
        return value.call(target, scope, ...rest);
      };
    },
  });
}

async function upload(name, bytes, type) {
  const form = new FormData();
  form.append("files", new Blob([bytes], { type }), name);
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
    // multer rejections may come back as plain text from the error handler
  }
  return { status: response.status, json, text };
}

async function getBytes(url, headers = {}) {
  const response = await fetch(url, { headers });
  return { response, body: Buffer.from(await response.arrayBuffer()) };
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Video", theme: "arch", created: new Date().toISOString() },
      { id: OTHER_PROJECT_ID, folderName: OTHER_PROJECT_FOLDER, name: "Other", theme: "arch", created: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectDir(OTHER_PROJECT_FOLDER));

  const db = getDb();
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
      assetStorage: recordingAssetStorage(new LocalAssetStorageAdapter({ dataRoot: DATA_DIR })),
      publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
      limits: new LocalLimitsAdapter(db),
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  console.error = _origError;
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("MP4 upload over HTTP", () => {
  let record;

  it("stores an MP4 as an ordinary file asset with its original bytes", async () => {
    const { status, json } = await upload("Product Tour.MP4", MP4_BYTES, "video/mp4");

    assert.equal(status, 201);
    assert.equal(json.processedFiles.length, 1);
    record = json.processedFiles[0];
    assert.equal(record.type, "video/mp4");
    assert.equal(record.path, "/uploads/files/product-tour.mp4");
    assert.equal(record.size, MP4_BYTES.length);
    assert.equal(record.width, undefined);
    assert.deepEqual(Object.keys(record.sizes ?? {}), []);

    const onDisk = await fs.readFile(path.join(getProjectDir(PROJECT_FOLDER), "uploads", "files", "product-tour.mp4"));
    assert.deepEqual(onDisk, MP4_BYTES);

    const list = await (await fetch(`${baseUrl}/api/media`, { headers: { "X-Project-Id": PROJECT_ID } })).json();
    assert.equal(list.files.filter((file) => file.type === "video/mp4").length, 1);
  });

  it("gives a second upload with the same name its own file", async () => {
    const { status, json } = await upload("product-tour.mp4", MP4_BYTES, "video/mp4");
    assert.equal(status, 201);
    assert.equal(json.processedFiles[0].path, "/uploads/files/product-tour-1.mp4");
  });

  it("rejects an MP4 name declared as another type, and another type named .mp4", async () => {
    const asAudio = await upload("clip.mp4", MP4_BYTES, "audio/mpeg");
    assert.ok(asAudio.status >= 400, `expected rejection, got ${asAudio.status}`);
    const asHtml = await upload("clip.html", MP4_BYTES, "video/mp4");
    assert.ok(asHtml.status >= 400, `expected rejection, got ${asHtml.status}`);
    assert.equal(await fs.pathExists(path.join(getProjectDir(PROJECT_FOLDER), "uploads", "files", "clip.html")), false);
  });

  it("rejects an MP4 over the configured size limit", async () => {
    saveSettings({ media: { maxFileSizeMB: 1 } });
    try {
      const big = Buffer.alloc(Math.ceil(1.5 * 1024 * 1024), 1);
      const { status } = await upload("too-big.mp4", big, "video/mp4");
      assert.equal(status, 413);
      assert.equal(await fs.pathExists(path.join(getProjectDir(PROJECT_FOLDER), "uploads", "files", "too-big.mp4")), false);
    } finally {
      saveSettings({ media: { maxFileSizeMB: 50 } });
    }
  });

  describe("serving for playback", () => {
    const byName = () => `${baseUrl}/api/media/projects/${PROJECT_ID}/uploads/files/product-tour.mp4`;
    const byId = () => `${baseUrl}/api/media/projects/${PROJECT_ID}/media/${record.id}`;
    const size = MP4_BYTES.length;

    for (const [label, url] of [
      ["by filename", byName],
      ["by media ID", byId],
    ]) {
      it(`serves the whole file ${label} as video/mp4`, async () => {
        assetScopes.length = 0;
        const { response, body } = await getBytes(url());
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "video/mp4");
        assert.equal(response.headers.get("accept-ranges"), "bytes");
        assert.deepEqual(body, MP4_BYTES);
        assert.ok(assetScopes.length > 0);
        assert.ok(assetScopes.every((call) => call.projectId === PROJECT_ID && call.folderName === PROJECT_FOLDER));
      });

      it(`serves bounded, open-ended and suffix ranges ${label}`, async () => {
        const cases = [
          ["bytes=0-99", 0, 99],
          ["bytes=1000-", 1000, size - 1],
          ["bytes=-500", size - 500, size - 1],
          ["bytes=3900-999999", 3900, size - 1],
        ];
        for (const [range, start, end] of cases) {
          const { response, body } = await getBytes(url(), { Range: range });
          assert.equal(response.status, 206, range);
          assert.equal(response.headers.get("content-type"), "video/mp4", range);
          assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${size}`, range);
          assert.equal(Number(response.headers.get("content-length")), end - start + 1, range);
          assert.deepEqual(body, MP4_BYTES.subarray(start, end + 1), range);
        }
      });

      it(`answers an unsatisfiable range ${label} with 416`, async () => {
        const { response } = await getBytes(url(), { Range: `bytes=${size}-` });
        assert.equal(response.status, 416);
        assert.equal(response.headers.get("content-range"), `bytes */${size}`);
      });
    }

    it("does not serve one project's video under another project's id", async () => {
      assetScopes.length = 0;
      const response = await fetch(`${baseUrl}/api/media/projects/${OTHER_PROJECT_ID}/uploads/files/product-tour.mp4`);
      assert.equal(response.status, 404);
      assert.ok(assetScopes.every((call) => call.projectId === OTHER_PROJECT_ID && call.folderName === OTHER_PROJECT_FOLDER));
    });
  });
});
