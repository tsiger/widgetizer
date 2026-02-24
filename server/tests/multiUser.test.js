/**
 * Multi-User Isolation Test Suite
 *
 * Verifies that the project repository enforces user_id scoping at the
 * database level (defense-in-depth). User A's operations must never
 * affect user B's data, and vice versa.
 *
 * Run with: node --test server/tests/multiUser.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-multiuser-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

// Import server modules after env override
const {
  getAllProjects,
  getProjectById,
  getProjectFolderName,
  createProject,
  updateProject,
  deleteProject,
  readProjectsData,
  writeProjectsData,
  getActiveProjectId,
  setActiveProjectId,
} = await import("../db/repositories/projectRepository.js");
const { closeDb, getDb } = await import("../db/index.js");

// ============================================================================
// Test constants
// ============================================================================

const USER_A = "user_alice_123";
const USER_B = "user_bob_456";

function makeProject(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: `proj-${Math.random().toString(36).slice(2, 10)}`,
    folderName: `folder-${Math.random().toString(36).slice(2, 10)}`,
    name: "Untitled Project",
    description: "",
    theme: "starter",
    themeVersion: "1.0.0",
    preset: null,
    receiveThemeUpdates: true,
    siteUrl: "",
    lastThemeUpdateAt: null,
    lastThemeUpdateVersion: null,
    created: now,
    updated: now,
    ...overrides,
  };
}

// ============================================================================
// Setup & teardown
// ============================================================================

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(TEST_THEMES_DIR);
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

// ============================================================================
// Tests
// ============================================================================

describe("Multi-user project isolation", () => {
  // Seed both users with projects before each test
  let projectA1, projectA2, projectB1;

  beforeEach(() => {
    // Clear all projects
    const db = getDb();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM app_settings WHERE key LIKE 'activeProjectId%'").run();

    // Create projects for user A
    projectA1 = makeProject({ name: "Alice Site 1", userId: USER_A });
    projectA2 = makeProject({ name: "Alice Site 2", userId: USER_A });
    createProject(projectA1);
    createProject(projectA2);

    // Create project for user B
    projectB1 = makeProject({ name: "Bob Site 1", userId: USER_B });
    createProject(projectB1);
  });

  // --------------------------------------------------------------------------
  // getAllProjects scoping
  // --------------------------------------------------------------------------

  describe("getAllProjects scoping", () => {
    it("user A sees only their own projects", () => {
      const projects = getAllProjects(USER_A);
      assert.equal(projects.length, 2);
      const names = projects.map((p) => p.name);
      assert.ok(names.includes("Alice Site 1"));
      assert.ok(names.includes("Alice Site 2"));
      assert.ok(!names.includes("Bob Site 1"));
    });

    it("user B sees only their own projects", () => {
      const projects = getAllProjects(USER_B);
      assert.equal(projects.length, 1);
      assert.equal(projects[0].name, "Bob Site 1");
    });

    it("two users can have projects with the same name", () => {
      const sameNameProject = makeProject({ name: "Alice Site 1", userId: USER_B });
      createProject(sameNameProject);

      const aliceProjects = getAllProjects(USER_A);
      const bobProjects = getAllProjects(USER_B);

      assert.equal(aliceProjects.filter((p) => p.name === "Alice Site 1").length, 1);
      assert.equal(bobProjects.filter((p) => p.name === "Alice Site 1").length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // writeProjectsData scoping
  // --------------------------------------------------------------------------

  describe("writeProjectsData scoping", () => {
    it("syncing user A's list does not delete user B's projects", () => {
      // Overwrite user A's list with just one project
      writeProjectsData(
        { projects: [projectA1], activeProjectId: projectA1.id },
        USER_A,
      );

      // User A now has 1 project
      const aliceProjects = getAllProjects(USER_A);
      assert.equal(aliceProjects.length, 1);
      assert.equal(aliceProjects[0].id, projectA1.id);

      // User B is untouched
      const bobProjects = getAllProjects(USER_B);
      assert.equal(bobProjects.length, 1);
      assert.equal(bobProjects[0].id, projectB1.id);
    });

    it("deleting from user A's list leaves user B untouched", () => {
      // Write empty list for user A
      writeProjectsData({ projects: [], activeProjectId: null }, USER_A);

      assert.equal(getAllProjects(USER_A).length, 0);
      assert.equal(getAllProjects(USER_B).length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // activeProjectId per-user
  // --------------------------------------------------------------------------

  describe("activeProjectId per-user", () => {
    it("user A and user B have independent active projects", () => {
      setActiveProjectId(projectA1.id, USER_A);
      setActiveProjectId(projectB1.id, USER_B);

      assert.equal(getActiveProjectId(USER_A), projectA1.id);
      assert.equal(getActiveProjectId(USER_B), projectB1.id);
    });

    it("setting active for user A does not affect user B", () => {
      setActiveProjectId(projectB1.id, USER_B);
      setActiveProjectId(projectA2.id, USER_A);

      // User B's active project must still be the same
      assert.equal(getActiveProjectId(USER_B), projectB1.id);
    });

    it("backward compat: 'local' user falls back to legacy key", () => {
      // Simulate legacy data: write the old-style global key
      const db = getDb();
      db.prepare(`
        INSERT INTO app_settings (key, value) VALUES ('activeProjectId', @value)
        ON CONFLICT(key) DO UPDATE SET value = @value
      `).run({ value: JSON.stringify("legacy-project-id") });

      // "local" user should fall back to the legacy key
      const activeId = getActiveProjectId("local");
      assert.equal(activeId, "legacy-project-id");

      // Non-local users should NOT see the legacy key
      assert.equal(getActiveProjectId("some-other-user"), null);
    });
  });

  // --------------------------------------------------------------------------
  // readProjectsData integration
  // --------------------------------------------------------------------------

  describe("readProjectsData integration", () => {
    it("returns projects and activeProjectId scoped to the user", () => {
      setActiveProjectId(projectA1.id, USER_A);
      setActiveProjectId(projectB1.id, USER_B);

      const dataA = readProjectsData(USER_A);
      assert.equal(dataA.projects.length, 2);
      assert.equal(dataA.activeProjectId, projectA1.id);

      const dataB = readProjectsData(USER_B);
      assert.equal(dataB.projects.length, 1);
      assert.equal(dataB.activeProjectId, projectB1.id);
    });
  });

  // --------------------------------------------------------------------------
  // getProjectById defense-in-depth
  // --------------------------------------------------------------------------

  describe("getProjectById defense-in-depth", () => {
    it("returns null when querying with wrong userId", () => {
      const result = getProjectById(projectA1.id, USER_B);
      assert.equal(result, null);
    });

    it("returns project when querying with correct userId", () => {
      const result = getProjectById(projectA1.id, USER_A);
      assert.ok(result);
      assert.equal(result.id, projectA1.id);
      assert.equal(result.name, "Alice Site 1");
    });
  });

  // --------------------------------------------------------------------------
  // getProjectFolderName defense-in-depth
  // --------------------------------------------------------------------------

  describe("getProjectFolderName defense-in-depth", () => {
    it("returns null when querying with wrong userId", () => {
      const folderName = getProjectFolderName(projectA1.id, USER_B);
      assert.equal(folderName, null);
    });

    it("returns folder name when querying with correct userId", () => {
      const folderName = getProjectFolderName(projectA1.id, USER_A);
      assert.equal(folderName, projectA1.folderName);
    });
  });

  // --------------------------------------------------------------------------
  // deleteProject defense-in-depth
  // --------------------------------------------------------------------------

  describe("deleteProject defense-in-depth", () => {
    it("returns false and does not delete with wrong userId", () => {
      const deleted = deleteProject(projectA1.id, USER_B);
      assert.equal(deleted, false);

      // Verify project still exists for user A
      const project = getProjectById(projectA1.id, USER_A);
      assert.ok(project);
      assert.equal(project.name, "Alice Site 1");
    });

    it("returns true and deletes with correct userId", () => {
      const deleted = deleteProject(projectA1.id, USER_A);
      assert.equal(deleted, true);

      assert.equal(getProjectById(projectA1.id, USER_A), null);
      // Other projects unaffected
      assert.equal(getAllProjects(USER_A).length, 1);
      assert.equal(getAllProjects(USER_B).length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // updateProject defense-in-depth
  // --------------------------------------------------------------------------

  describe("updateProject defense-in-depth", () => {
    it("returns null and does not modify with wrong userId", () => {
      const result = updateProject(projectA1.id, { name: "Hacked!" }, USER_B);
      assert.equal(result, null);

      // Verify original name unchanged
      const project = getProjectById(projectA1.id, USER_A);
      assert.equal(project.name, "Alice Site 1");
    });

    it("returns updated project with correct userId", () => {
      const result = updateProject(projectA1.id, { name: "Alice Updated" }, USER_A);
      assert.ok(result);
      assert.equal(result.name, "Alice Updated");

      // Verify persisted
      const project = getProjectById(projectA1.id, USER_A);
      assert.equal(project.name, "Alice Updated");
    });
  });
});
