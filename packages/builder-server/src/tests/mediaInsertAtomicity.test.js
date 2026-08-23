/**
 * Media insert atomicity test suite.
 *
 * Pins that a media file's two-table insert (media_files + N media_sizes rows)
 * is all-or-nothing on the upload path (addMediaFile): a failure among the
 * size inserts must not leave a committed media_files row with partial or
 * missing variants (broken thumbnails that nothing ever repairs).
 *
 * Run with: node --test packages/builder-server/src/tests/mediaInsertAtomicity.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-atomicity-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "media-atomicity-uuid";
const PROJECT_FOLDER = "media-atomicity-project";

function fileData(overrides = {}) {
  return {
    id: "file-1",
    filename: "photo.jpg",
    originalName: "photo.jpg",
    type: "image/jpeg",
    size: 1234,
    uploaded: new Date().toISOString(),
    path: "/uploads/images/photo.jpg",
    width: 800,
    height: 600,
    sizes: {
      thumbnail: { path: "/uploads/images/photo-thumbnail.jpg", width: 150, height: 113 },
      small: { path: "/uploads/images/photo-small.jpg", width: 400, height: 300 },
    },
    ...overrides,
  };
}

describe("media insert atomicity", () => {
  before(async () => {
    await fs.ensureDir(TEST_DATA_DIR);
    projectRepo.createProject({
      id: PROJECT_ID,
      name: "Media Atomicity Test",
      folderName: PROJECT_FOLDER,
      theme: "test-theme",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    });
  });

  after(async () => {
    closeDb();
    await fs.remove(TEST_ROOT);
  });

  beforeEach(() => {
    for (const f of mediaRepo.getMediaFiles(PROJECT_ID).files) {
      mediaRepo.deleteMediaFile(PROJECT_ID, f.id);
    }
  });

  it("addMediaFile persists the file row and all size rows on success", () => {
    mediaRepo.addMediaFile(PROJECT_ID, fileData());

    const { files } = mediaRepo.getMediaFiles(PROJECT_ID);
    assert.equal(files.length, 1);
    assert.equal(files[0].id, "file-1");
    assert.deepEqual(Object.keys(files[0].sizes).sort(), ["small", "thumbnail"]);
  });

  it("addMediaFile leaves no media_files row when a size insert fails", () => {
    // media_sizes.width is NOT NULL — the second size's insert throws after
    // the media_files row and the first size row were already written.
    const poisoned = fileData({
      sizes: {
        thumbnail: { path: "/uploads/images/photo-thumbnail.jpg", width: 150, height: 113 },
        small: { path: "/uploads/images/photo-small.jpg", width: null, height: 300 },
      },
    });

    assert.throws(() => mediaRepo.addMediaFile(PROJECT_ID, poisoned));

    // All-or-nothing: the failed insert must not leave a half-record (a file
    // row with missing variants renders as broken thumbnails forever).
    assert.equal(mediaRepo.getMediaFiles(PROJECT_ID).files.length, 0);
  });

  it("a failed writeMediaData leaves pre-existing rows intact (nested rollback)", () => {
    // writeMediaData is a full replacement (delete-then-insert in one outer
    // transaction); the self-wrapped insert nests as a savepoint whose failure
    // must propagate so the outer transaction restores what was deleted.
    mediaRepo.addMediaFile(PROJECT_ID, fileData({ id: "keep-1" }));
    const poisoned = fileData({
      id: "file-3",
      sizes: { small: { path: "/uploads/images/p.jpg", width: null, height: 1 } },
    });

    assert.throws(() => mediaRepo.writeMediaData(PROJECT_ID, { files: [poisoned] }));

    const { files } = mediaRepo.getMediaFiles(PROJECT_ID);
    assert.equal(files.length, 1);
    assert.equal(files[0].id, "keep-1");
  });

  it("writeMediaData (its own transaction) still works with the self-wrapped insert", () => {
    // writeMediaData wraps insertMediaFile in db.transaction(); better-sqlite3
    // nests via savepoints, so the helper being transactional itself must not
    // break this caller.
    mediaRepo.writeMediaData(PROJECT_ID, { files: [fileData({ id: "file-2" })] });

    const { files } = mediaRepo.getMediaFiles(PROJECT_ID);
    assert.equal(files.length, 1);
    assert.equal(files[0].id, "file-2");
  });
});
