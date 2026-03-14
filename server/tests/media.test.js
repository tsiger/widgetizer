/**
 * Media Controller Test Suite
 *
 * Tests the media pipeline: readMediaFile/writeMediaFile (with locking),
 * atomicUpdateMediaFile, getProjectMedia, uploadProjectMedia (with sharp
 * image processing), updateMediaMetadata, deleteProjectMedia,
 * bulkDeleteProjectMedia, serveProjectMedia, getMediaFileUsage,
 * and refreshMediaUsage.
 *
 * Uses a realistic isolated project with actual image files processed
 * by sharp, videos, audios, and media.json metadata tracking.
 *
 * Run with: node --test server/tests/media.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import sharp from "sharp";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Silence console output from production code
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const {
  getProjectDir,
  getProjectPagesDir,
  getProjectImagesDir,
  getProjectVideosDir,
  getProjectAudiosDir,
} = await import("../config.js");

const projectRepo = await import("../db/repositories/projectRepository.js");

const {
  readMediaFile,
  writeMediaFile,
  atomicUpdateMediaFile,
  getProjectMedia,
  uploadProjectMedia,
  updateMediaMetadata,
  deleteProjectMedia,
  bulkDeleteProjectMedia,
  serveProjectMedia,
  getMediaFileUsage,
  refreshMediaUsage,
} = await import("../controllers/mediaController.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "media-test-uuid";
const PROJECT_FOLDER = "media-test-project";

// ============================================================================
// Global teardown
// ============================================================================

after(async () => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Mock helpers
// ============================================================================

function mockReq({ params = {}, body = {}, files = null, file = null } = {}) {
  return {
    params,
    body,
    files,
    file,
    app: { locals: {} },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
    _piped: false,
    headersSent: false,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
    setHeader(key, val) {
      res._headers[key] = val;
      return res;
    },
    // For file streaming (serveProjectMedia pipes to res)
    write() {},
    end() {
      res._piped = true;
    },
    on() {
      return res;
    },
    once() {
      return res;
    },
    emit() {
      return res;
    },
    removeListener() {
      return res;
    },
  };
  return res;
}

async function callController(fn, { params, body, files, file } = {}) {
  const req = mockReq({ params, body, files, file });
  const res = mockRes();
  await fn(req, res);
  return res;
}

/**
 * Create a real test JPEG image using sharp.
 * Returns a Buffer.
 */
async function createTestJpeg(width = 200, height = 150) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Create a real test PNG image using sharp.
 */
async function createTestPng(width = 100, height = 100) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

// ============================================================================
// Setup
// ============================================================================

before(async () => {
  // Write projects.json
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Media Test Project",
        theme: "__media_test_theme__",
        siteUrl: "https://example.com",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(projectDir);
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectImagesDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectVideosDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectAudiosDir(PROJECT_FOLDER));
});

// ============================================================================
// readMediaFile
// ============================================================================

describe("readMediaFile", () => {
  beforeEach(async () => {
    // Clear media data before each test
    await writeMediaFile(PROJECT_ID, { files: [] });
  });

  it("returns empty files array when no media exists", async () => {
    const data = await readMediaFile(PROJECT_ID);
    assert.ok(Array.isArray(data.files));
    assert.equal(data.files.length, 0);
  });

  it("returns existing media data", async () => {
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [{ id: "test-1", filename: "photo.jpg", path: "/uploads/images/photo.jpg", type: "image/jpeg" }],
      },
    );

    const data = await readMediaFile(PROJECT_ID);
    assert.equal(data.files.length, 1);
    assert.equal(data.files[0].id, "test-1");
    assert.equal(data.files[0].filename, "photo.jpg");
  });

  it("throws when project does not exist", async () => {
    await assert.rejects(
      () => readMediaFile("nonexistent-project-uuid"),
      (err) => {
        assert.ok(err.message.includes("not found") || err.code === "PROJECT_NOT_FOUND");
        return true;
      },
    );
  });
});

// ============================================================================
// writeMediaFile
// ============================================================================

describe("writeMediaFile", () => {
  it("writes media data", async () => {
    const testData = {
      files: [{ id: "write-1", filename: "test.jpg", path: "/uploads/images/test.jpg", type: "image/jpeg" }],
    };
    await writeMediaFile(PROJECT_ID, testData);

    const saved = await readMediaFile(PROJECT_ID);
    assert.equal(saved.files.length, 1);
    assert.equal(saved.files[0].id, "write-1");
  });

  it("overwrites existing data", async () => {
    await writeMediaFile(PROJECT_ID, { files: [{ id: "old" }] });
    await writeMediaFile(PROJECT_ID, { files: [{ id: "new-1" }, { id: "new-2" }] });

    const saved = await readMediaFile(PROJECT_ID);
    assert.equal(saved.files.length, 2);
  });

  it("handles concurrent writes safely (no data corruption)", async () => {
    // Fire multiple writes concurrently — SQLite serializes them
    const writes = [];
    for (let i = 0; i < 5; i++) {
      writes.push(writeMediaFile(PROJECT_ID, { files: [{ id: `concurrent-${i}` }] }));
    }
    await Promise.all(writes);

    // The last write to complete should be the final state
    const data = await readMediaFile(PROJECT_ID);
    assert.equal(data.files.length, 1);
    assert.ok(data.files[0].id.startsWith("concurrent-"));
  });
});

// ============================================================================
// atomicUpdateMediaFile
// ============================================================================

describe("atomicUpdateMediaFile", () => {
  beforeEach(async () => {
    // Seed with known state
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          { id: "atomic-1", filename: "a.jpg", usedIn: [] },
          { id: "atomic-2", filename: "b.jpg", usedIn: ["index"] },
        ],
      },
    );
  });

  it("reads, transforms, and writes atomically", async () => {
    const result = await atomicUpdateMediaFile(
      PROJECT_ID,
      (data) => {
        data.files.push({ id: "atomic-3", filename: "c.jpg", usedIn: [] });
      },
    );

    assert.equal(result.files.length, 3);
    assert.equal(result.files[2].id, "atomic-3");

    // Verify persisted
    const saved = await readMediaFile(PROJECT_ID);
    assert.equal(saved.files.length, 3);
  });

  it("can modify existing entries in-place", async () => {
    await atomicUpdateMediaFile(
      PROJECT_ID,
      (data) => {
        const file = data.files.find((f) => f.id === "atomic-1");
        file.usedIn = ["about", "contact"];
      },
    );

    const saved = await readMediaFile(PROJECT_ID);
    const file = saved.files.find((f) => f.id === "atomic-1");
    assert.deepEqual(file.usedIn, ["about", "contact"]);
  });

  it("works when no media exists yet", async () => {
    await writeMediaFile(PROJECT_ID, { files: [] });

    const result = await atomicUpdateMediaFile(
      PROJECT_ID,
      (data) => {
        data.files.push({ id: "new-file" });
      },
    );

    assert.equal(result.files.length, 1);
  });
});

// ============================================================================
// getProjectMedia (controller)
// ============================================================================

describe("getProjectMedia", () => {
  before(async () => {
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "get-1",
            filename: "hero.jpg",
            type: "image/jpeg",
            path: "/uploads/images/hero.jpg",
            usedIn: ["index"],
          },
          { id: "get-2", filename: "logo.png", type: "image/png", path: "/uploads/images/logo.png", usedIn: [] },
        ],
      },
    );
  });

  it("returns 200 with media data", async () => {
    const res = await callController(getProjectMedia, {
      params: { projectId: PROJECT_ID },
    });
    assert.equal(res._status, 200);
    assert.ok(Array.isArray(res._json.files));
    assert.equal(res._json.files.length, 2);
  });

  it("returns all file metadata", async () => {
    const res = await callController(getProjectMedia, {
      params: { projectId: PROJECT_ID },
    });
    const hero = res._json.files.find((f) => f.id === "get-1");
    assert.equal(hero.filename, "hero.jpg");
    assert.equal(hero.type, "image/jpeg");
    assert.deepEqual(hero.usedIn, ["index"]);
  });

  it("returns 404 for nonexistent project", async () => {
    const res = await callController(getProjectMedia, {
      params: { projectId: "nonexistent-uuid-999" },
    });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// uploadProjectMedia — real image processing with sharp
// ============================================================================

describe("uploadProjectMedia", () => {
  beforeEach(async () => {
    // Reset media data
    await writeMediaFile(PROJECT_ID, { files: [] });
    // Clean upload directories
    await fs.emptyDir(getProjectImagesDir(PROJECT_FOLDER));
    await fs.emptyDir(getProjectVideosDir(PROJECT_FOLDER));
    await fs.emptyDir(getProjectAudiosDir(PROJECT_FOLDER));
  });

  it("uploads a JPEG image and processes with sharp", async () => {
    // Create a real JPEG on disk (600x400)
    const jpegBuffer = await createTestJpeg(600, 400);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "test-photo.jpg");
    await fs.writeFile(filePath, jpegBuffer);

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "Test Photo.jpg",
          filename: "test-photo.jpg",
          mimetype: "image/jpeg",
          size: jpegBuffer.length,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    assert.equal(res._json.processedFiles.length, 1);
    assert.equal(res._json.rejectedFiles.length, 0);

    const processed = res._json.processedFiles[0];
    assert.equal(processed.type, "image/jpeg");
    assert.equal(processed.width, 600);
    assert.equal(processed.height, 400);
    assert.equal(processed.path, "/uploads/images/test-photo.jpg");
    assert.ok(processed.id, "Should have a generated UUID");
    assert.ok(processed.uploaded, "Should have uploaded timestamp");
  });

  it("generates resized versions for images larger than size thresholds", async () => {
    // Create a large image (2000x1500) that should generate multiple sizes
    const largeBuffer = await createTestJpeg(2000, 1500);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "large-image.jpg");
    await fs.writeFile(filePath, largeBuffer);

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "large-image.jpg",
          filename: "large-image.jpg",
          mimetype: "image/jpeg",
          size: largeBuffer.length,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];

    // Should have generated sizes for thumb (150), small (480), medium (1024), large (1920)
    // since original is 2000px wide
    assert.ok(processed.sizes, "Should have sizes object");
    assert.ok(processed.sizes.thumb, "Should have thumb size");
    assert.ok(processed.sizes.small, "Should have small size");
    assert.ok(processed.sizes.medium, "Should have medium size");
    assert.ok(processed.sizes.large, "Should have large size");

    // Verify thumb dimensions
    assert.equal(processed.sizes.thumb.width, 150);
    assert.ok(processed.sizes.thumb.height > 0);

    // Verify the sized files actually exist on disk
    const thumbFile = path.join(imgDir, "large-image-thumb.jpg");
    assert.ok(await fs.pathExists(thumbFile), "Thumb file should exist on disk");
  });

  it("skips size generation when image is smaller than threshold", async () => {
    // Create a tiny image (100x80) — smaller than all size thresholds
    const tinyBuffer = await createTestJpeg(100, 80);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "tiny.jpg");
    await fs.writeFile(filePath, tinyBuffer);

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "tiny.jpg",
          filename: "tiny.jpg",
          mimetype: "image/jpeg",
          size: tinyBuffer.length,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];
    // Sizes should be empty — image is smaller than all thresholds
    assert.deepEqual(processed.sizes, {});
  });

  it("uploads a PNG image and reads dimensions", async () => {
    const pngBuffer = await createTestPng(300, 250);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "icon.png");
    await fs.writeFile(filePath, pngBuffer);

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "icon.png",
          filename: "icon.png",
          mimetype: "image/png",
          size: pngBuffer.length,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];
    assert.equal(processed.width, 300);
    assert.equal(processed.height, 250);
    assert.equal(processed.type, "image/png");
  });

  it("uploads a video file with basic metadata", async () => {
    const vidDir = getProjectVideosDir(PROJECT_FOLDER);
    const filePath = path.join(vidDir, "clip.mp4");
    await fs.writeFile(filePath, "fake-mp4-data-here");

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "clip.mp4",
          filename: "clip.mp4",
          mimetype: "video/mp4",
          size: 18,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];
    assert.equal(processed.type, "video/mp4");
    assert.equal(processed.path, "/uploads/videos/clip.mp4");
    assert.equal(processed.thumbnail, null);
    assert.deepEqual(processed.metadata, { title: "", description: "" });
  });

  it("uploads an audio file with basic metadata", async () => {
    const audDir = getProjectAudiosDir(PROJECT_FOLDER);
    const filePath = path.join(audDir, "track.mp3");
    await fs.writeFile(filePath, "fake-mp3-data-here");

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "track.mp3",
          filename: "track.mp3",
          mimetype: "audio/mpeg",
          size: 18,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];
    assert.equal(processed.type, "audio/mpeg");
    assert.equal(processed.path, "/uploads/audios/track.mp3");
    assert.deepEqual(processed.metadata, { title: "", description: "" });
  });

  it("rejects files exceeding size limit", async () => {
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "huge.jpg");
    // Create a small file but claim it's 100MB in the mock
    await fs.writeFile(filePath, "tiny-content");

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "huge.jpg",
          filename: "huge.jpg",
          mimetype: "image/jpeg",
          size: 100 * 1024 * 1024, // 100MB — exceeds default 5MB limit
          path: filePath,
        },
      ],
    });

    // All files rejected -> 400
    assert.equal(res._status, 400);
    assert.equal(res._json.processedFiles.length, 0);
    assert.equal(res._json.rejectedFiles.length, 1);
    assert.ok(res._json.rejectedFiles[0].reason.includes("exceeds"));
  });

  it("handles mixed success and rejection", async () => {
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);

    // Good file
    const goodBuffer = await createTestJpeg(200, 150);
    const goodPath = path.join(imgDir, "good.jpg");
    await fs.writeFile(goodPath, goodBuffer);

    // Oversized file
    const badPath = path.join(imgDir, "bad.jpg");
    await fs.writeFile(badPath, "tiny");

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "good.jpg",
          filename: "good.jpg",
          mimetype: "image/jpeg",
          size: goodBuffer.length,
          path: goodPath,
        },
        {
          originalname: "bad.jpg",
          filename: "bad.jpg",
          mimetype: "image/jpeg",
          size: 50 * 1024 * 1024, // Over limit
          path: badPath,
        },
      ],
    });

    // At least one succeeded -> 201
    assert.equal(res._status, 201);
    assert.equal(res._json.processedFiles.length, 1);
    assert.equal(res._json.rejectedFiles.length, 1);
    assert.ok(res._json.message.includes("Processed: 1"));
    assert.ok(res._json.message.includes("Rejected: 1"));
  });

  it("returns 400 when no files are provided", async () => {
    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [],
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.error.toLowerCase().includes("no valid files"));
  });

  it("compresses original in-place when image is smaller than largest enabled size", async () => {
    // Create a 600x400 JPEG — smaller than the largest default size (1920px large)
    // Use quality 100 to ensure the uncompressed buffer is as large as possible
    const uncompressedBuffer = await sharp({
      create: { width: 600, height: 400, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "compress-test.jpg");
    await fs.writeFile(filePath, uncompressedBuffer);
    const originalSize = uncompressedBuffer.length;

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "compress-test.jpg",
          filename: "compress-test.jpg",
          mimetype: "image/jpeg",
          size: originalSize,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);
    const processed = res._json.processedFiles[0];

    // Dimensions should be unchanged
    assert.equal(processed.width, 600);
    assert.equal(processed.height, 400);

    // File on disk should be smaller than the uncompressed original
    const compressedStats = await fs.stat(filePath);
    assert.ok(compressedStats.size < originalSize, "Compressed file should be smaller than uncompressed original");

    // Reported size should match actual file size
    assert.equal(processed.size, compressedStats.size);

    // File should still be a valid JPEG
    const meta = await sharp(filePath).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 600);
  });

  it("does not compress original when image is larger than largest enabled size", async () => {
    // Create a 2000x1500 JPEG — larger than the default large size (1920px)
    const largeBuffer = await createTestJpeg(2000, 1500);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "no-compress.jpg");
    await fs.writeFile(filePath, largeBuffer);
    const originalSize = largeBuffer.length;

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "no-compress.jpg",
          filename: "no-compress.jpg",
          mimetype: "image/jpeg",
          size: originalSize,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);

    // Original file size should be unchanged (not compressed)
    const stats = await fs.stat(filePath);
    assert.equal(stats.size, originalSize, "Original should not be compressed when larger than largest enabled size");
  });

  it("persists uploaded files in media.json", async () => {
    const jpegBuffer = await createTestJpeg(200, 150);
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "persisted.jpg");
    await fs.writeFile(filePath, jpegBuffer);

    await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "persisted.jpg",
          filename: "persisted.jpg",
          mimetype: "image/jpeg",
          size: jpegBuffer.length,
          path: filePath,
        },
      ],
    });

    // Read back and verify
    const mediaData = await readMediaFile(PROJECT_ID);
    const file = mediaData.files.find((f) => f.filename === "persisted.jpg");
    assert.ok(file, "Uploaded file should be in media.json");
    assert.equal(file.type, "image/jpeg");
  });

  it("sanitizes SVG files with DOMPurify", async () => {
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const filePath = path.join(imgDir, "icon.svg");
    // SVG with an onload XSS attack vector
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>';
    await fs.writeFile(filePath, maliciousSvg);

    const res = await callController(uploadProjectMedia, {
      params: { projectId: PROJECT_ID },
      files: [
        {
          originalname: "icon.svg",
          filename: "icon.svg",
          mimetype: "image/svg+xml",
          size: maliciousSvg.length,
          path: filePath,
        },
      ],
    });

    assert.equal(res._status, 201);

    // Verify the SVG was sanitized on disk
    const sanitized = await fs.readFile(filePath, "utf8");
    assert.ok(!sanitized.includes("onload"), "onload handler should be stripped");
    assert.ok(sanitized.includes("<circle"), "Valid SVG content should remain");
  });
});

// ============================================================================
// updateMediaMetadata
// ============================================================================

describe("updateMediaMetadata", () => {
  before(async () => {
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          { id: "meta-img", filename: "photo.jpg", type: "image/jpeg", metadata: { alt: "", title: "" } },
          { id: "meta-vid", filename: "video.mp4", type: "video/mp4", metadata: { title: "", description: "" } },
          { id: "meta-aud", filename: "song.mp3", type: "audio/mpeg", metadata: { title: "", description: "" } },
        ],
      },
    );
  });

  it("updates image metadata (alt + title)", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-img" },
      body: { alt: "A beautiful sunset", title: "Sunset Photo" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.file.metadata.alt, "A beautiful sunset");
    assert.equal(res._json.file.metadata.title, "Sunset Photo");
  });

  it("requires alt text for images", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-img" },
      body: { title: "No alt provided" }, // missing alt
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.error.toLowerCase().includes("alt"));
  });

  it("updates video metadata (title + description, no alt)", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-vid" },
      body: { title: "Intro Video", description: "Our company intro" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.file.metadata.title, "Intro Video");
    assert.equal(res._json.file.metadata.description, "Our company intro");
    // alt should not be present for video
    assert.ok(!("alt" in res._json.file.metadata), "Video should not have alt");
  });

  it("updates audio metadata (title + description)", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-aud" },
      body: { title: "Podcast Episode 1", description: "First episode" },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.file.metadata.title, "Podcast Episode 1");
  });

  it("returns 404 for nonexistent file", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "nonexistent-file-id" },
      body: { alt: "test" },
    });
    assert.equal(res._status, 404);
  });

  it("persists metadata changes", async () => {
    await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-img" },
      body: { alt: "Persisted alt text", title: "Persisted title" },
    });

    const mediaData = await readMediaFile(PROJECT_ID);
    const file = mediaData.files.find((f) => f.id === "meta-img");
    assert.equal(file.metadata.alt, "Persisted alt text");
  });

  it("strips HTML from alt text", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-img" },
      body: { alt: 'Photo <script>alert(1)</script> alt', title: "Clean" },
    });
    assert.equal(res._status, 200);
    assert.ok(!res._json.file.metadata.alt.includes("<script>"), "alt should not contain script tags");
    assert.ok(res._json.file.metadata.alt.includes("Photo"), "alt should preserve text content");
  });

  it("strips HTML from title", async () => {
    const res = await callController(updateMediaMetadata, {
      params: { projectId: PROJECT_ID, fileId: "meta-img" },
      body: { alt: "Clean alt", title: '<img onerror="alert(1)">My Title' },
    });
    assert.equal(res._status, 200);
    assert.ok(!res._json.file.metadata.title.includes("<img"), "title should not contain img tags");
    assert.ok(res._json.file.metadata.title.includes("My Title"), "title should preserve text content");
  });
});

// ============================================================================
// deleteProjectMedia
// ============================================================================

describe("deleteProjectMedia", () => {
  beforeEach(async () => {
    // Create physical files and seed media data
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    await fs.writeFile(path.join(imgDir, "deletable.jpg"), "fake-img");
    await fs.writeFile(path.join(imgDir, "deletable-thumb.jpg"), "fake-thumb");
    await fs.writeFile(path.join(imgDir, "in-use.jpg"), "fake-img");

    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "del-1",
            filename: "deletable.jpg",
            type: "image/jpeg",
            path: "/uploads/images/deletable.jpg",
            usedIn: [],
            sizes: {
              thumb: { path: "/uploads/images/deletable-thumb.jpg", width: 150, height: 100 },
            },
          },
          {
            id: "del-2",
            filename: "in-use.jpg",
            type: "image/jpeg",
            path: "/uploads/images/in-use.jpg",
            usedIn: ["index", "about"],
          },
        ],
      },
    );
  });

  it("deletes unused file and its sizes from disk", async () => {
    const res = await callController(deleteProjectMedia, {
      params: { projectId: PROJECT_ID, fileId: "del-1" },
    });
    assert.equal(res._status, 200);
    assert.ok(res._json.message.includes("deleted"));

    // Verify physical files are gone
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    assert.ok(!(await fs.pathExists(path.join(imgDir, "deletable.jpg"))));
    assert.ok(!(await fs.pathExists(path.join(imgDir, "deletable-thumb.jpg"))));
  });

  it("removes file entry from media.json", async () => {
    await callController(deleteProjectMedia, {
      params: { projectId: PROJECT_ID, fileId: "del-1" },
    });

    const mediaData = await readMediaFile(PROJECT_ID);
    assert.ok(!mediaData.files.find((f) => f.id === "del-1"));
    // The in-use file should still be there
    assert.ok(mediaData.files.find((f) => f.id === "del-2"));
  });

  it("refuses to delete file that is in use", async () => {
    const res = await callController(deleteProjectMedia, {
      params: { projectId: PROJECT_ID, fileId: "del-2" },
    });
    assert.equal(res._status, 400);
    assert.ok(res._json.error.toLowerCase().includes("in use"));
    assert.deepEqual([...res._json.usedIn].sort(), ["about", "index"]);
  });

  it("returns 404 for nonexistent file", async () => {
    const res = await callController(deleteProjectMedia, {
      params: { projectId: PROJECT_ID, fileId: "ghost-file" },
    });
    assert.equal(res._status, 404);
  });
});

// ============================================================================
// bulkDeleteProjectMedia
// ============================================================================

describe("bulkDeleteProjectMedia", () => {
  beforeEach(async () => {
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    await fs.writeFile(path.join(imgDir, "bulk-a.jpg"), "a");
    await fs.writeFile(path.join(imgDir, "bulk-b.jpg"), "b");
    await fs.writeFile(path.join(imgDir, "bulk-c.jpg"), "c");

    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "bulk-1",
            filename: "bulk-a.jpg",
            type: "image/jpeg",
            path: "/uploads/images/bulk-a.jpg",
            usedIn: [],
          },
          {
            id: "bulk-2",
            filename: "bulk-b.jpg",
            type: "image/jpeg",
            path: "/uploads/images/bulk-b.jpg",
            usedIn: ["index"],
          },
          {
            id: "bulk-3",
            filename: "bulk-c.jpg",
            type: "image/jpeg",
            path: "/uploads/images/bulk-c.jpg",
            usedIn: [],
          },
        ],
      },
    );
  });

  it("deletes multiple unused files at once", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: ["bulk-1", "bulk-3"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.deletedCount, 2);

    const mediaData = await readMediaFile(PROJECT_ID);
    assert.equal(mediaData.files.length, 1);
    assert.equal(mediaData.files[0].id, "bulk-2");
  });

  it("skips in-use files and reports them", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: ["bulk-1", "bulk-2"] }, // bulk-2 is in use
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.deletedCount, 1);
    assert.ok(res._json.filesInUse);
    assert.equal(res._json.filesInUse.length, 1);
    assert.equal(res._json.filesInUse[0].id, "bulk-2");
    assert.ok(res._json.warning);
  });

  it("returns info when all requested files are in use", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: ["bulk-2"] },
    });
    assert.equal(res._status, 200);
    assert.equal(res._json.deletedCount, 0);
    assert.ok(res._json.message.includes("in use"));
  });

  it("returns 404 when no matching files found", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: ["nonexistent-1", "nonexistent-2"] },
    });
    assert.equal(res._status, 404);
  });

  it("returns 400 when fileIds is not an array", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: "not-an-array" },
    });
    assert.equal(res._status, 400);
  });

  it("returns 400 when fileIds is empty", async () => {
    const res = await callController(bulkDeleteProjectMedia, {
      params: { projectId: PROJECT_ID },
      body: { fileIds: [] },
    });
    assert.equal(res._status, 400);
  });
});

// ============================================================================
// serveProjectMedia
// ============================================================================

describe("serveProjectMedia", () => {
  before(async () => {
    // Create real files to serve
    const imgDir = getProjectImagesDir(PROJECT_FOLDER);
    const vidDir = getProjectVideosDir(PROJECT_FOLDER);

    const jpegBuffer = await createTestJpeg(50, 50);
    await fs.writeFile(path.join(imgDir, "serve-test.jpg"), jpegBuffer);
    await fs.writeFile(path.join(vidDir, "serve-test.mp4"), "fake-video-data");

    // Media data with file by ID
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "serve-1",
            filename: "serve-test.jpg",
            type: "image/jpeg",
            path: "/uploads/images/serve-test.jpg",
          },
        ],
      },
    );
  });

  it("serves file by filename with correct Content-Type", async () => {
    const req = mockReq({
      params: { projectId: PROJECT_ID, filename: "serve-test.jpg" },
    });
    const res = mockRes();

    await serveProjectMedia(req, res);

    assert.equal(res._headers["Content-Type"], "image/jpeg");
  });

  it("serves video files with correct Content-Type", async () => {
    const req = mockReq({
      params: { projectId: PROJECT_ID, filename: "serve-test.mp4" },
    });
    const res = mockRes();
    await serveProjectMedia(req, res);
    assert.equal(res._headers["Content-Type"], "video/mp4");
  });

  it("returns 404 for nonexistent filename", async () => {
    const res = await callController(serveProjectMedia, {
      params: { projectId: PROJECT_ID, filename: "does-not-exist.jpg" },
    });
    assert.equal(res._status, 404);
  });

  it("serves file by ID", async () => {
    const req = mockReq({
      params: { projectId: PROJECT_ID, fileId: "serve-1" },
    });
    const res = mockRes();
    await serveProjectMedia(req, res);
    assert.equal(res._headers["Content-Type"], "image/jpeg");
  });

  it("returns 404 when file ID not found", async () => {
    const res = await callController(serveProjectMedia, {
      params: { projectId: PROJECT_ID, fileId: "ghost-id" },
    });
    assert.equal(res._status, 404);
  });

  it("returns 400 when neither fileId nor filename provided", async () => {
    const res = await callController(serveProjectMedia, {
      params: { projectId: PROJECT_ID },
    });
    assert.equal(res._status, 400);
  });
});

// ============================================================================
// getMediaFileUsage / refreshMediaUsage
// ============================================================================

describe("getMediaFileUsage", () => {
  before(async () => {
    // Set up media data with a tracked file
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "usage-1",
            filename: "tracked.jpg",
            type: "image/jpeg",
            path: "/uploads/images/tracked.jpg",
            usedIn: ["index"],
          },
        ],
      },
    );
  });

  it("returns usage info for a media file", async () => {
    const res = await callController(getMediaFileUsage, {
      params: { projectId: PROJECT_ID, fileId: "usage-1" },
    });
    // Should succeed (200) — the exact response depends on mediaUsageService
    assert.equal(res._status, 200);
  });

  it("returns 404 for nonexistent file", async () => {
    const res = await callController(getMediaFileUsage, {
      params: { projectId: PROJECT_ID, fileId: "no-such-file" },
    });
    assert.equal(res._status, 404);
  });
});

describe("refreshMediaUsage", () => {
  before(async () => {
    // Create a page that references an image
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    await fs.ensureDir(pagesDir);
    await fs.writeFile(
      path.join(pagesDir, "index.json"),
      JSON.stringify(
        {
          name: "Home",
          slug: "index",
          widgets: {
            w1: {
              type: "test-widget",
              settings: { image: "/uploads/images/tracked.jpg" },
            },
          },
          widgetsOrder: ["w1"],
        },
        null,
        2,
      ),
    );

    // Create media data with stale usedIn
    await writeMediaFile(
      PROJECT_ID,
      {
        files: [
          {
            id: "refresh-1",
            filename: "tracked.jpg",
            type: "image/jpeg",
            path: "/uploads/images/tracked.jpg",
            usedIn: [], // <-- stale: should be ["index"] after refresh
          },
        ],
      },
    );
  });

  it("refreshes media usage tracking", async () => {
    const res = await callController(refreshMediaUsage, {
      params: { projectId: PROJECT_ID },
    });
    assert.equal(res._status, 200);
  });
});
