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
// updateCollectionItemMediaUsage — records the collection:{uuid} source
// ============================================================================

const ALPHA_UUID = "11111111-1111-4111-8111-111111111111";
const BETA_UUID = "22222222-2222-4222-8222-222222222222";
const JANE_UUID = "33333333-3333-4333-8333-333333333333";

const item = (uuid, slug, settings) => ({ uuid, slug, settings });

describe("updateCollectionItemMediaUsage", () => {
  it("records the collection:{uuid} source for referenced files", async () => {
    await updateCollectionItemMediaUsage(
      PROJECT_ID,
      item(ALPHA_UUID, "alpha", { featured_image: "/uploads/images/hero.jpg" }),
    );
    assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`]);
    assert.deepEqual(await usedIn(FILE), []);
  });

  it("records a file referenced through a nested link-href", async () => {
    await updateCollectionItemMediaUsage(
      PROJECT_ID,
      item(ALPHA_UUID, "alpha", { doc: { href: "/uploads/files/spec.pdf", text: "Spec", target: "_blank" } }),
    );
    assert.deepEqual(await usedIn(FILE), [`collection:${ALPHA_UUID}`]);
  });

  // The identity is the point: two items may carry the same slug (one per language
  // once folders exist), and their usage must not merge or overwrite.
  it("keeps two items with the same slug independent", async () => {
    await updateCollectionItemMediaUsage(
      PROJECT_ID,
      item(ALPHA_UUID, "alpha", { featured_image: "/uploads/images/hero.jpg" }),
    );
    await updateCollectionItemMediaUsage(PROJECT_ID, item(BETA_UUID, "alpha", { doc: "/uploads/files/spec.pdf" }));

    assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`]);
    assert.deepEqual(await usedIn(FILE), [`collection:${BETA_UUID}`]);

    await removeCollectionItemFromMediaUsage(PROJECT_ID, BETA_UUID);
    assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`], "the sibling's media stays in use");
    assert.deepEqual(await usedIn(FILE), []);
  });
});

// ============================================================================
// syncCollectionItemMediaUsageOnWrite — a rename keeps the uuid
// ============================================================================

describe("syncCollectionItemMediaUsageOnWrite", () => {
  it("keeps one source across a rename", async () => {
    await updateCollectionItemMediaUsage(
      PROJECT_ID,
      item(ALPHA_UUID, "alpha", { featured_image: "/uploads/images/hero.jpg" }),
    );
    await syncCollectionItemMediaUsageOnWrite(
      PROJECT_ID,
      item(ALPHA_UUID, "renamed", { featured_image: "/uploads/images/hero.jpg" }),
    );
    assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`]);
  });
});

// ============================================================================
// removeCollectionItemFromMediaUsage — clears the source entirely
// ============================================================================

describe("removeCollectionItemFromMediaUsage", () => {
  it("clears the source entirely", async () => {
    await updateCollectionItemMediaUsage(
      PROJECT_ID,
      item(ALPHA_UUID, "alpha", { featured_image: "/uploads/images/hero.jpg" }),
    );
    await removeCollectionItemFromMediaUsage(PROJECT_ID, ALPHA_UUID);
    assert.deepEqual(await usedIn(IMG), []);
  });
});

// ============================================================================
// refreshAllMediaUsage — rebuilds collection sources from disk
// ============================================================================

describe("refreshAllMediaUsage — collections", () => {
  it("rebuilds collection sources from disk (simulated import)", async () => {
    // Two collection item files placed directly on disk (as an import would).
    await writeItemFile("portfolio", "alpha", {
      uuid: ALPHA_UUID,
      settings: { featured_image: "/uploads/images/hero.jpg" },
    });
    await writeItemFile("team", "jane", { uuid: JANE_UUID, settings: { resume: "/uploads/files/spec.pdf" } });
    // a stray _order.json must be ignored
    await fs.outputJSON(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "portfolio", "_order.json"),
      { order: ["alpha"] },
    );

    await refreshAllMediaUsage(PROJECT_ID);
    assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`]);
    assert.deepEqual(await usedIn(FILE), [`collection:${JANE_UUID}`]);
  });

  // A file written before uuids existed gets one stamped during the rebuild, so its
  // identity is the same before and after its next save (no stale row left behind).
  it("stamps a uuid on an item written before uuids existed", async () => {
    await writeItemFile("portfolio", "legacy", { settings: { featured_image: "/uploads/images/hero.jpg" } });

    await refreshAllMediaUsage(PROJECT_ID);

    const stamped = await fs.readJSON(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "portfolio", "legacy.json"),
    );
    assert.ok(stamped.uuid, "the rebuild writes a uuid into the file");
    assert.deepEqual(await usedIn(IMG), [`collection:${stamped.uuid}`]);

    // Saving it again keeps the same identity — no second row.
    await syncCollectionItemMediaUsageOnWrite(PROJECT_ID, stamped);
    assert.deepEqual(await usedIn(IMG), [`collection:${stamped.uuid}`]);
  });

  // Everything below is the can't-write case: a read-only working dir, a full disk.
  describe("when a uuid cannot be stamped", () => {
    /** Run fn with fs.writeFile failing the way a full disk would — after truncating. */
    async function withFailingWrite(fn, { truncate = false } = {}) {
      const realWriteFile = fs.writeFile;
      fs.writeFile = async (target, contents) => {
        if (truncate) await realWriteFile(target, String(contents).slice(0, 12));
        throw new Error("ENOSPC: no space left on device");
      };
      try {
        return await fn();
      } finally {
        fs.writeFile = realWriteFile;
      }
    }

    it("leaves the original file byte-for-byte intact", async () => {
      await writeItemFile("news", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });
      const itemPath = path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "alpha.json");
      const before = await fs.readFile(itemPath);

      // The stamp writes a temp file first, so even a truncating failure cannot damage this one.
      await withFailingWrite(() => refreshAllMediaUsage(PROJECT_ID), { truncate: true });

      assert.deepEqual(await fs.readFile(itemPath), before, "the item file must be untouched");
      assert.deepEqual(JSON.parse(await fs.readFile(itemPath, "utf8")).settings.featured_image, "/uploads/images/hero.jpg");
      const leftovers = (await fs.readdir(path.join(getProjectDir(PROJECT_FOLDER), "collections", "news"))).filter((n) =>
        n.endsWith(".tmp"),
      );
      assert.deepEqual(leftovers, [], "no temp file left behind");
    });

    it("keeps two uuid-less items in different collections apart", async () => {
      await writeItemFile("news", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });
      await writeItemFile("portfolio", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });

      await withFailingWrite(() => refreshAllMediaUsage(PROJECT_ID));

      assert.deepEqual(
        [...(await usedIn(IMG))].sort(),
        ["collection:slug:news/alpha", "collection:slug:portfolio/alpha"],
      );

      // Deleting one must leave the other's media in use — the bug this step exists to prevent.
      await removeCollectionItemFromMediaUsage(PROJECT_ID, { slug: "alpha" }, "news");
      assert.deepEqual(await usedIn(IMG), ["collection:slug:portfolio/alpha"]);
    });

    it("retries the migration and retires the pending row once writing works", async () => {
      await writeItemFile("news", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });
      await withFailingWrite(() => refreshAllMediaUsage(PROJECT_ID));
      assert.deepEqual(await usedIn(IMG), ["collection:slug:news/alpha"]);

      // A pending row is not "migrated": the next rebuild stamps the uuid and replaces it.
      await refreshAllMediaUsage(PROJECT_ID);
      const stamped = await fs.readJSON(path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "alpha.json"));
      assert.ok(stamped.uuid);
      assert.deepEqual(await usedIn(IMG), [`collection:${stamped.uuid}`]);
    });

    it("writes back to the pending row when a link cleanup re-syncs a uuid-less item", async () => {
      await writeItemFile("news", "alpha", {
        settings: { featured_image: "/uploads/images/hero.jpg", doc: { href: "/uploads/files/spec.pdf", text: "Doc" } },
      });
      await withFailingWrite(() => refreshAllMediaUsage(PROJECT_ID));
      assert.deepEqual(await usedIn(IMG), ["collection:slug:news/alpha"]);

      // A page delete clears the item's link and re-syncs it — still with no uuid to use.
      const item = { slug: "alpha", settings: { featured_image: "/uploads/images/hero.jpg" } };
      await syncCollectionItemMediaUsageOnWrite(PROJECT_ID, item, "news");

      assert.deepEqual(await usedIn(IMG), ["collection:slug:news/alpha"], "the pending row is updated, not orphaned");
      assert.deepEqual(await usedIn(FILE), [], "the dropped link's file is released");
    });

    it("retires the pending row when the item is saved with a uuid", async () => {
      await writeItemFile("news", "alpha", { settings: { featured_image: "/uploads/images/hero.jpg" } });
      await withFailingWrite(() => refreshAllMediaUsage(PROJECT_ID));
      assert.deepEqual(await usedIn(IMG), ["collection:slug:news/alpha"]);

      // The editor saves the item; it now carries a uuid.
      const saved = { uuid: ALPHA_UUID, slug: "alpha", settings: { featured_image: "/uploads/images/hero.jpg" } };
      await syncCollectionItemMediaUsageOnWrite(PROJECT_ID, saved, "news");

      assert.deepEqual(await usedIn(IMG), [`collection:${ALPHA_UUID}`], "no stale slug row left behind");
    });
  });
});
