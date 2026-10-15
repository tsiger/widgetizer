/**
 * Request-free site reads shared by the editor and the AI assistant: the
 * language resolver, the paged media query and the bounded upload read.
 *
 * Run with: node --test packages/builder-server/src/tests/siteReader.test.js
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-sitereader-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.NODE_ENV = "test";

const { contentLanguage } = await import("../utils/contentLanguage.js");
const { getMediaFilesPage, getMediaIdsByPaths, addMediaFile } = await import("../db/repositories/mediaRepository.js");
const { createProject } = await import("../db/repositories/projectRepository.js");
const { readUploadBytes } = await import("../services/siteReader.js");
const { getDb, closeDb } = await import("../db/index.js");

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("contentLanguage", () => {
  const project = { defaultLanguage: "en", languages: ["el"] };

  it("defaults to the main language and accepts the site's others", () => {
    assert.equal(contentLanguage(project).language, "en");
    assert.equal(contentLanguage(project, "el").language, "el");
  });

  it("names the site's languages for one it doesn't have, or a malformed code", () => {
    for (const code of ["de", "not-a-language"]) {
      assert.throws(() => contentLanguage(project, code), (error) => {
        assert.equal(error.code, "LANGUAGE_UNKNOWN");
        assert.match(error.message, /Its languages are: en, el\./);
        return true;
      });
    }
  });
});

describe("getMediaFilesPage / getMediaIdsByPaths", () => {
  getDb();
  const projectId = "p-media";
  createProject({ id: projectId, folderName: "media-site", name: "Media", theme: "t", created: "2026-01-01", updated: "2026-01-01" });
  const file = (n, extra = {}) => ({
    id: `f${n}`,
    filename: `photo-${n}.jpg`,
    originalName: `photo-${n}.jpg`,
    type: "image/jpeg",
    size: 100,
    uploaded: `2026-01-0${n}T00:00:00.000Z`,
    path: `/uploads/images/photo-${n}.jpg`,
    metadata: { alt: "", title: "", caption: "" },
    ...extra,
  });
  addMediaFile(projectId, file(1, { metadata: { alt: "A croissant", title: "", caption: "" } }));
  addMediaFile(projectId, file(2));
  addMediaFile(projectId, file(3, { originalName: "100%_off.jpg" }));

  it("pages newest first and reports the total", () => {
    const first = getMediaFilesPage(projectId, { offset: 0, limit: 2 });
    assert.equal(first.total, 3);
    assert.deepEqual(first.files.map((entry) => entry.id), ["f3", "f2"]);
    assert.deepEqual(getMediaFilesPage(projectId, { offset: 2, limit: 2 }).files.map((entry) => entry.id), ["f1"]);
  });

  it("searches names and descriptions, treating % and _ literally", () => {
    assert.deepEqual(getMediaFilesPage(projectId, { search: "croissant" }).files.map((entry) => entry.id), ["f1"]);
    assert.deepEqual(getMediaFilesPage(projectId, { search: "100%_" }).files.map((entry) => entry.id), ["f3"]);
    assert.equal(getMediaFilesPage(projectId, { search: "%" }).total, 1);
  });

  it("maps stored paths to IDs of this project only", () => {
    const ids = getMediaIdsByPaths(projectId, ["/uploads/images/photo-2.jpg", "/uploads/images/unknown.jpg"]);
    assert.deepEqual([...ids], [["/uploads/images/photo-2.jpg", "f2"]]);
    assert.equal(getMediaIdsByPaths("other-project", ["/uploads/images/photo-2.jpg"]).size, 0);
  });
});

describe("readUploadBytes", () => {
  const files = new Map([["images/a.jpg", Buffer.from("x".repeat(10))]]);
  const assetStorage = {
    stat: async (_scope, key) => (files.has(key) ? { size: files.get(key).length } : null),
    download: async (_scope, key) => (files.has(key) ? [files.get(key)] : null),
  };

  it("reads a file within the limit", async () => {
    const result = await readUploadBytes(assetStorage, {}, "/uploads/images/a.jpg", 100);
    assert.equal(result.bytes.length, 10);
  });

  it("refuses past the limit, and anything that isn't an upload", async () => {
    assert.deepEqual(await readUploadBytes(assetStorage, {}, "/uploads/images/a.jpg", 5), { unavailable: "too-large" });
    assert.deepEqual(await readUploadBytes(assetStorage, {}, "/uploads/images/b.jpg", 100), { unavailable: "missing" });
    assert.deepEqual(await readUploadBytes(assetStorage, {}, "theme.json", 100), { unavailable: "missing" });
  });
});
