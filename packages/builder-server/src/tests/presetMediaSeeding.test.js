/**
 * Preset media seeding test suite.
 *
 * Covers the starter-image path used at project creation:
 *  - resolvePresetPaths returns mediaDir when the preset ships a media/ folder,
 *    and null when it doesn't.
 *  - seedPresetMedia copies the image binaries into the project's uploads/images
 *    and registers each manifest entry in the media DB with a fresh,
 *    project-scoped UUID (originals + their generated sizes).
 *
 *  - Preset media is resolved through config.js helpers:
 *    getProjectImagesDir(folder), getThemePresetDir(theme, preset), and
 *    getThemeSourceDir(theme).
 *  - The project row is seeded via projectRepo.writeProjectsData so
 *    media_files.project_id FK is satisfied before seedPresetMedia registers
 *    records.
 *  - mediaRepo.getMediaFiles(projectId) returns { files: [...] } with the
 *    rowToMediaFile shape: { id, filename, path, type, width, height,
 *    metadata: { alt, title }, sizes: { <name>: { path, width, height } }, ... }.
 *
 * Run with: node --test packages/builder-server/src/tests/presetMediaSeeding.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preset-media-seed-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const { getProjectImagesDir, getThemePresetDir } = await import("../config.js");
const { resolvePresetPaths } = await import("../controllers/themeController.js");
const { seedPresetMedia } = await import("../controllers/projectController.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { closeDb } = await import("../db/index.js");

const FOLDER = "preset-media-seed-project";
const PROJECT_ID = "00000000-0000-4000-8000-0000000000ff";

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
});

describe("resolvePresetPaths — media", () => {
  before(async () => {
    // preset WITH a media/ folder
    const withMedia = getThemePresetDir("media-theme", "withmedia");
    await fs.ensureDir(path.join(withMedia, "templates"));
    await fs.outputFile(path.join(withMedia, "media", "images", "a.jpg"), "x");
    // preset WITHOUT media/
    await fs.ensureDir(path.join(getThemePresetDir("media-theme", "plain"), "templates"));
  });

  it("returns mediaDir when the preset ships media/", async () => {
    const result = await resolvePresetPaths("media-theme", "withmedia");
    assert.ok(result.mediaDir, "mediaDir should resolve");
    assert.ok(result.mediaDir.endsWith(path.join("withmedia", "media")));
  });

  it("returns null mediaDir when the preset has none", async () => {
    const result = await resolvePresetPaths("media-theme", "plain");
    assert.equal(result.mediaDir, null);
  });
});

describe("seedPresetMedia", () => {
  it("copies binaries into uploads/images and registers media records with fresh uuids", async () => {
    // The project ROW must exist first (media_files.project_id is a FK).
    projectRepo.writeProjectsData({
      projects: [
        {
          id: PROJECT_ID,
          folderName: FOLDER,
          name: "Preset Media Project",
          theme: "media-theme",
          preset: "withmedia",
          created: new Date().toISOString(),
        },
      ],
      activeProjectId: PROJECT_ID,
    });

    // Build a preset media/ dir: two image binaries + a manifest describing one
    // original with a generated size variant. The manifest carries a uuid that
    // must NOT survive into the DB (records get a fresh, project-scoped id).
    const presetMediaDir = path.join(TEST_ROOT, "preset-media");
    await fs.outputFile(path.join(presetMediaDir, "images", "hero.jpg"), "JPEGDATA");
    await fs.outputFile(path.join(presetMediaDir, "images", "hero-large.jpg"), "JPEGLARGE");
    await fs.outputJson(path.join(presetMediaDir, "manifest.json"), {
      files: [
        {
          uuid: "MANIFEST-UUID-SHOULD-NOT-LEAK",
          filename: "hero.jpg",
          originalName: "hero.jpg",
          type: "image/jpeg",
          size: 8,
          path: "/uploads/images/hero.jpg",
          width: 1920,
          height: 1280,
          alt: "A hero",
          title: "Hero",
          sizes: {
            large: { path: "/uploads/images/hero-large.jpg", width: 1280, height: 853 },
          },
        },
      ],
    });

    await seedPresetMedia(FOLDER, PROJECT_ID, presetMediaDir);

    // (a) Binaries copied verbatim into the project's uploads/images.
    const imagesDir = getProjectImagesDir(FOLDER);
    assert.ok(await fs.pathExists(path.join(imagesDir, "hero.jpg")));
    assert.ok(await fs.pathExists(path.join(imagesDir, "hero-large.jpg")));

    // (b) DB record created with a FRESH uuid + carried-over metadata and sizes.
    const { files } = mediaRepo.getMediaFiles(PROJECT_ID);
    assert.equal(files.length, 1);
    const rec = files[0];
    assert.equal(rec.filename, "hero.jpg");
    assert.equal(rec.path, "/uploads/images/hero.jpg");
    assert.equal(rec.type, "image/jpeg");
    assert.equal(rec.width, 1920);
    assert.ok(rec.id && rec.id.length >= 8, "should assign a project-scoped id");
    assert.notEqual(rec.id, "MANIFEST-UUID-SHOULD-NOT-LEAK"); // manifest uuid never reused
    assert.equal(rec.metadata.alt, "A hero");
    assert.equal(rec.metadata.title, "Hero");
    // Size variant registered from the manifest.
    assert.equal(rec.sizes.large.path, "/uploads/images/hero-large.jpg");
    assert.equal(rec.sizes.large.width, 1280);
    assert.equal(rec.sizes.large.height, 853);
  });
});
