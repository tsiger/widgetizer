/**
 * Collection media-usage tracking test suite.
 *
 * Verifies that collection items contribute to media usage under the
 * `collection:{type}/{slug}` source and
 * that refreshAllMediaUsage scans collections/ from disk alongside pages/globals.
 *
 *  - Media usage is SQLite metadata keyed by projectId (mediaRepo), asserted via
 *    getMediaUsage(projectId, fileId) / readMediaFile(projectId).
 *  - Collection item files are written to
 *    getProjectDir(folderName)/collections/<type>/<slug>.json.
 *  - Richtext-embedded <img src> + size-variant cases are covered in
 *    mediaUsage.test.js; this suite focuses on direct collection-field values.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionMediaUsage.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-coll-media-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const {
  extractMediaPathsFromCollectionItem,
  updateCollectionItemMediaUsage,
  removeCollectionItemFromMediaUsage,
  syncCollectionItemMediaUsageOnWrite,
  refreshAllMediaUsage,
  getMediaUsage,
} = await import("../services/mediaUsageService.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "coll-media-uuid";
const PROJECT_FOLDER = "coll-media-project";
const IMG = "img-hero";
const FILE = "file-spec";

function mediaFiles() {
  return [
    {
      id: IMG,
      filename: "hero.jpg",
      path: "/uploads/images/hero.jpg",
      type: "image/jpeg",
      sizes: { large: { path: "/uploads/images/hero-large.jpg", width: 1920, height: 1280 } },
      usedIn: [],
    },
    { id: FILE, filename: "spec.pdf", path: "/uploads/files/spec.pdf", type: "application/pdf", usedIn: [] },
  ];
}

/** Read a file's usedIn[] via the media usage accessor. */
const usedIn = async (id) => (await getMediaUsage(PROJECT_ID, id)).usedIn;

/** Write a collection item JSON file directly to disk (as an import would). */
async function writeItemFile(type, slug, itemData) {
  await fs.outputJSON(path.join(getProjectDir(PROJECT_FOLDER), "collections", type, `${slug}.json`), {
    id: slug,
    slug,
    ...itemData,
  });
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Coll Media Test",
        theme: "__t__",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await writeMediaFile(PROJECT_ID, { files: mediaFiles() });
  await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
});

// ============================================================================
// extractMediaPathsFromCollectionItem — pure extraction
// ============================================================================

describe("extractMediaPathsFromCollectionItem — gallery", () => {
  it("extracts each gallery upload path and skips blank ones", () => {
    const item = {
      settings: {
        gallery: ["/uploads/images/hero.jpg", "/uploads/images/other.jpg", ""],
      },
    };
    const paths = extractMediaPathsFromCollectionItem(item).sort();
    assert.deepEqual(paths, ["/uploads/images/hero.jpg", "/uploads/images/other.jpg"]);
  });
});

describe("extractMediaPathsFromCollectionItem", () => {
  it("finds image, file, and nested link-href upload paths in settings", () => {
    const item = {
      settings: {
        featured_image: "/uploads/images/hero.jpg",
        attachment: "/uploads/files/spec.pdf",
        cta: { href: "/uploads/files/spec.pdf", target: "_blank" },
        title: "no media here",
      },
    };
    const paths = extractMediaPathsFromCollectionItem(item);
    assert.ok(paths.includes("/uploads/images/hero.jpg"));
    assert.ok(paths.includes("/uploads/files/spec.pdf"));
  });

  it("includes the SEO social image (seo.og_image)", () => {
    const item = {
      settings: { featured_image: "/uploads/images/hero.jpg" },
      seo: { og_image: "/uploads/images/social.jpg" },
    };
    const paths = extractMediaPathsFromCollectionItem(item);
    assert.ok(paths.includes("/uploads/images/hero.jpg"));
    assert.ok(paths.includes("/uploads/images/social.jpg"), "seo.og_image must be tracked as used media");
  });
});

// ============================================================================
// updateCollectionItemMediaUsage — records collection:{type}/{slug} source
// ============================================================================

describe("updateCollectionItemMediaUsage", () => {
  it("records the collection:{type}/{slug} source for referenced files", async () => {
    await updateCollectionItemMediaUsage(PROJECT_ID, "portfolio", "alpha", {
      settings: { featured_image: "/uploads/images/hero.jpg" },
    });
    assert.deepEqual(await usedIn(IMG), ["collection:portfolio/alpha"]);
    assert.deepEqual(await usedIn(FILE), []);
  });

  it("records a file referenced through a nested link-href", async () => {
    await updateCollectionItemMediaUsage(PROJECT_ID, "portfolio", "alpha", {
      settings: { doc: { href: "/uploads/files/spec.pdf", text: "Spec", target: "_blank" } },
    });
    assert.deepEqual(await usedIn(FILE), ["collection:portfolio/alpha"]);
  });
});

// ============================================================================
// syncCollectionItemMediaUsageOnWrite — rename handling
// ============================================================================

describe("syncCollectionItemMediaUsageOnWrite", () => {
  it("on rename, removes the previous source and adds the current one", async () => {
    await updateCollectionItemMediaUsage(PROJECT_ID, "portfolio", "alpha", {
      settings: { featured_image: "/uploads/images/hero.jpg" },
    });
    await syncCollectionItemMediaUsageOnWrite(
      PROJECT_ID,
      "portfolio",
      "renamed",
      { settings: { featured_image: "/uploads/images/hero.jpg" } },
      "alpha",
    );
    assert.deepEqual(await usedIn(IMG), ["collection:portfolio/renamed"]);
  });
});

// ============================================================================
// removeCollectionItemFromMediaUsage — clears the source entirely
// ============================================================================

describe("removeCollectionItemFromMediaUsage", () => {
  it("clears the source entirely", async () => {
    await updateCollectionItemMediaUsage(PROJECT_ID, "portfolio", "alpha", {
      settings: { featured_image: "/uploads/images/hero.jpg" },
    });
    await removeCollectionItemFromMediaUsage(PROJECT_ID, "portfolio", "alpha");
    assert.deepEqual(await usedIn(IMG), []);
  });
});

// ============================================================================
// refreshAllMediaUsage — rebuilds collection sources from disk
// ============================================================================

describe("refreshAllMediaUsage — collections", () => {
  it("rebuilds collection sources from disk (simulated import)", async () => {
    // Two collection item files placed directly on disk (as an import would).
    await writeItemFile("portfolio", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });
    await writeItemFile("team", "jane", { settings: { resume: "/uploads/files/spec.pdf" } });
    // a stray _order.json must be ignored
    await fs.outputJSON(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "portfolio", "_order.json"),
      { order: ["alpha"] },
    );

    await refreshAllMediaUsage(PROJECT_ID);
    assert.deepEqual(await usedIn(IMG), ["collection:portfolio/alpha"]);
    assert.deepEqual(await usedIn(FILE), ["collection:team/jane"]);
  });
});
