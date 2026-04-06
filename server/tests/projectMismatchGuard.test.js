/**
 * Project Mismatch Guard Test Suite
 *
 * Tests the X-Project-Id header validation in resolveActiveProject middleware.
 * Verifies that write requests with a mismatched project ID are rejected with 409,
 * while reads and matching/missing headers pass through.
 *
 * Run with: node --test server/tests/projectMismatchGuard.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-mismatch-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const projectRepo = await import("../db/repositories/projectRepository.js");
const { resolveActiveProject } = await import("../middleware/resolveActiveProject.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const PROJECT_ID = "mismatch-test-uuid";
const PROJECT_FOLDER = "mismatch-test-project";
const OTHER_PROJECT_ID = "other-project-uuid";

// ============================================================================
// Helpers
// ============================================================================

function mockReq({ method = "GET", headers = {}, params = {} } = {}) {
  return { method, headers, params };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
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
  };
  return res;
}

// ============================================================================
// Setup / Teardown
// ============================================================================

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Mismatch Test Project",
        theme: "__test_theme__",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const { getProjectDir } = await import("../config.js");
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Tests
// ============================================================================

describe("resolveActiveProject — mismatch guard", () => {
  it("POST with matching X-Project-Id passes through", async () => {
    const req = mockReq({ method: "POST", headers: { "x-project-id": PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled, "next() should have been called");
    assert.ok(req.activeProject, "req.activeProject should be set");
    assert.equal(req.activeProject.id, PROJECT_ID);
  });

  it("POST with mismatched X-Project-Id returns 409", async () => {
    const req = mockReq({ method: "POST", headers: { "x-project-id": OTHER_PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(!nextCalled, "next() should NOT have been called");
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "PROJECT_MISMATCH");
  });

  it("POST without X-Project-Id header passes through (backward compat)", async () => {
    const req = mockReq({ method: "POST", headers: {} });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled, "next() should have been called (missing header allowed)");
    assert.ok(req.activeProject, "req.activeProject should be set");
  });

  it("GET with mismatched X-Project-Id passes through (reads are harmless)", async () => {
    const req = mockReq({ method: "GET", headers: { "x-project-id": OTHER_PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled, "next() should have been called for GET");
    assert.ok(req.activeProject, "req.activeProject should be set");
  });

  it("DELETE with mismatched X-Project-Id returns 409", async () => {
    const req = mockReq({ method: "DELETE", headers: { "x-project-id": OTHER_PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(!nextCalled, "next() should NOT have been called");
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "PROJECT_MISMATCH");
  });

  it("PUT with mismatched X-Project-Id returns 409", async () => {
    const req = mockReq({ method: "PUT", headers: { "x-project-id": OTHER_PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(!nextCalled, "next() should NOT have been called");
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "PROJECT_MISMATCH");
  });

  it("POST with mismatched route projectId param returns 409", async () => {
    const req = mockReq({
      method: "POST",
      headers: { "x-project-id": PROJECT_ID },
      params: { projectId: OTHER_PROJECT_ID },
    });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(!nextCalled, "next() should NOT have been called");
    assert.equal(res._status, 409);
    assert.equal(res._json.code, "PROJECT_MISMATCH");
  });

  it("POST with matching route projectId param passes through", async () => {
    const req = mockReq({
      method: "POST",
      headers: { "x-project-id": PROJECT_ID },
      params: { projectId: PROJECT_ID },
    });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(nextCalled, "next() should have been called");
    assert.ok(req.activeProject, "req.activeProject should be set");
  });

  it("returns 404 when no active project is set", async () => {
    const original = await projectRepo.readProjectsData();
    await projectRepo.writeProjectsData({ ...original, activeProjectId: null });

    const req = mockReq({ method: "POST", headers: { "x-project-id": PROJECT_ID } });
    const res = mockRes();
    let nextCalled = false;

    await resolveActiveProject(req, res, () => {
      nextCalled = true;
    });

    assert.ok(!nextCalled, "next() should NOT have been called");
    assert.equal(res._status, 404);

    // Restore
    await projectRepo.writeProjectsData(original);
  });
});
