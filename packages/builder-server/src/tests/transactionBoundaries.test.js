/**
 * Transaction-boundary behavior tests.
 *
 * Pins the observable behaviors of the transaction-shape hardening in the
 * media/project repositories and mediaController:
 *  - usage writers only ever attach usage to the target project's own files
 *    (the write-only DELETE/INSERT rewrite must not widen the insert path)
 *  - atomicUpdateMediaFile rejects async transform callbacks (a thenable
 *    would otherwise be silently ignored and commit pre-mutation state)
 *  - deleteProjectAndReassignActive: single-transaction delete + active-id
 *    reassignment in the repository layer
 *
 * Deliberately NOT pinned here: the transaction shapes themselves (the
 * `.immediate()` variants and the read-only wraps on multi-statement getters)
 * — removing them would keep this file green. Their rationale and the
 * write-lock-first rule live in docs-llms/core-database.md § Transactions &
 * concurrency. The SQLITE_BUSY_SNAPSHOT hazard they close is not reproducible
 * in this single-thread, single-connection test setup (better-sqlite3 is
 * synchronous, so nothing can commit mid-transaction here); a worker thread
 * holding a second connection could reproduce it, at a test-complexity cost
 * judged not worth it for a latent hazard.
 *
 * Uses an isolated DATA_ROOT so tests never touch real data.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-txn-boundaries-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { atomicUpdateMediaFile } = await import("../controllers/mediaController.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Fixtures
// ============================================================================

const PROJECT_A = "txn-test-project-a-uuid";
const PROJECT_B = "txn-test-project-b-uuid";
const FILE_A1 = "txn-file-a1";
const FILE_B1 = "txn-file-b1";

function makeProject(id, folderName, name, created) {
  return { id, folderName, name, created, updated: created };
}

function makeFile(id, filename) {
  return {
    id,
    filename,
    originalName: filename,
    type: "image/png",
    size: 100,
    uploaded: new Date().toISOString(),
    path: `/uploads/images/${filename}`,
    sizes: {},
  };
}

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
  projectRepo.createProject(makeProject(PROJECT_A, "txn-test-a", "Txn Test A", "2026-01-01T00:00:00.000Z"));
  projectRepo.createProject(makeProject(PROJECT_B, "txn-test-b", "Txn Test B", "2026-01-02T00:00:00.000Z"));
  mediaRepo.addMediaFile(PROJECT_A, makeFile(FILE_A1, "a1.png"));
  mediaRepo.addMediaFile(PROJECT_B, makeFile(FILE_B1, "b1.png"));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Usage writers must not attach usage to another project's files
// ============================================================================

describe("updateMediaUsageForSource — project scoping", () => {
  it("ignores fileIds that belong to a different project", () => {
    mediaRepo.updateMediaUsageForSource(PROJECT_A, "page-cross", [FILE_B1]);

    const foreign = mediaRepo.getMediaFileById(PROJECT_B, FILE_B1);
    assert.deepEqual(
      foreign.usedIn.filter((u) => u === "page-cross"),
      [],
      "usage for another project's file must not be inserted",
    );
  });

  it("still records usage for the project's own files", () => {
    mediaRepo.updateMediaUsageForSource(PROJECT_A, "page-own", [FILE_A1]);

    const own = mediaRepo.getMediaFileById(PROJECT_A, FILE_A1);
    assert.ok(own.usedIn.includes("page-own"), "own-project usage should be recorded");
  });
});

describe("replaceMediaUsage — project scoping", () => {
  it("ignores usage-map entries for files of a different project", () => {
    mediaRepo.replaceMediaUsage(PROJECT_A, new Map([[FILE_B1, ["page-replace-cross"]]]));

    const foreign = mediaRepo.getMediaFileById(PROJECT_B, FILE_B1);
    assert.deepEqual(
      foreign.usedIn.filter((u) => u === "page-replace-cross"),
      [],
      "usage for another project's file must not be inserted",
    );
  });

  it("replaces usage for the project's own files", () => {
    mediaRepo.replaceMediaUsage(PROJECT_A, new Map([[FILE_A1, ["page-replaced"]]]));

    const own = mediaRepo.getMediaFileById(PROJECT_A, FILE_A1);
    assert.deepEqual(own.usedIn, ["page-replaced"], "own-project usage should be fully replaced");
  });
});

// ============================================================================
// atomicUpdateMediaFile — async transform callbacks are rejected
// ============================================================================

describe("atomicUpdateMediaFile — sync-transform contract", () => {
  it("rejects a transformFn that returns a thenable", async () => {
    await assert.rejects(
      atomicUpdateMediaFile(PROJECT_A, async (mediaData) => {
        mediaData.files = [];
      }),
      /synchronous/i,
      "an async transformFn must be rejected, not silently ignored",
    );

    const stillThere = mediaRepo.getMediaFileById(PROJECT_A, FILE_A1);
    assert.ok(stillThere, "the rejected transform must not have been committed");
  });

  it("applies a synchronous transform", async () => {
    await atomicUpdateMediaFile(PROJECT_A, (mediaData) => {
      const file = mediaData.files.find((f) => f.id === FILE_A1);
      file.metadata.alt = "updated-by-sync-transform";
    });

    const updated = mediaRepo.getMediaFileById(PROJECT_A, FILE_A1);
    assert.equal(updated.metadata.alt, "updated-by-sync-transform");
  });
});

// ============================================================================
// deleteProjectAndReassignActive — repository-level delete + reassignment
// ============================================================================

describe("deleteProjectAndReassignActive", () => {
  const DEL_A = "txn-del-a-uuid";
  const DEL_B = "txn-del-b-uuid";
  const DEL_C = "txn-del-c-uuid";

  function seedDeletionTrio() {
    projectRepo.createProject(makeProject(DEL_A, "txn-del-a", "Del A", "2026-02-01T00:00:00.000Z"));
    projectRepo.createProject(makeProject(DEL_B, "txn-del-b", "Del B", "2026-02-02T00:00:00.000Z"));
    projectRepo.createProject(makeProject(DEL_C, "txn-del-c", "Del C", "2026-02-03T00:00:00.000Z"));
  }

  function cleanupDeletionTrio() {
    for (const id of [DEL_A, DEL_B, DEL_C]) projectRepo.deleteProject(id);
  }

  it("deleting the active project reassigns active to the first remaining project", () => {
    seedDeletionTrio();
    try {
      projectRepo.setActiveProjectId(DEL_B);

      const newActiveId = projectRepo.deleteProjectAndReassignActive(DEL_B);

      assert.equal(projectRepo.getProjectById(DEL_B), null, "project should be deleted");
      assert.equal(newActiveId, projectRepo.getActiveProjectId(), "returned id should match stored active id");
      assert.notEqual(newActiveId, DEL_B, "active must not remain the deleted project");
      assert.ok(projectRepo.getProjectById(newActiveId), "new active must be an existing project");
    } finally {
      cleanupDeletionTrio();
    }
  });

  it("deleting a non-active project leaves the active id unchanged", () => {
    seedDeletionTrio();
    try {
      projectRepo.setActiveProjectId(DEL_B);

      const newActiveId = projectRepo.deleteProjectAndReassignActive(DEL_C);

      assert.equal(newActiveId, DEL_B);
      assert.equal(projectRepo.getActiveProjectId(), DEL_B);
    } finally {
      cleanupDeletionTrio();
    }
  });

  it("deleting the last project sets the active id to null", () => {
    // Only the two long-lived fixture projects exist outside this describe;
    // delete everything, then verify the null case with a single project.
    const survivors = projectRepo.getAllProjects().map((p) => p.id);
    projectRepo.createProject(makeProject(DEL_A, "txn-del-a", "Del A", "2026-02-01T00:00:00.000Z"));
    try {
      for (const id of survivors) projectRepo.deleteProject(id);
      projectRepo.setActiveProjectId(DEL_A);

      const newActiveId = projectRepo.deleteProjectAndReassignActive(DEL_A);

      assert.equal(newActiveId, null);
      assert.equal(projectRepo.getActiveProjectId(), null);
    } finally {
      projectRepo.deleteProject(DEL_A);
    }
  });
});
