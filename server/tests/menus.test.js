/**
 * Menu CRUD Test Suite
 *
 * Tests menu creation, reading, updating, deletion, and duplication
 * through the actual controller functions.
 *
 * Uses an isolated DATA_DIR so tests never touch real data.
 * A minimal project is bootstrapped in before() so the menu controllers
 * have an active project to work against.
 *
 * All tests run for both userId="local" and userId="user_hosted_abc".
 *
 * Run with: node --test server/tests/menus.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ============================================================================
// Isolated test environment
// ============================================================================

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-menu-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { getProjectMenusDir, getMenuPath, getProjectDir } = await import("../config.js");

const { createMenu, getMenu, getAllMenus, getMenuById, updateMenu, deleteMenu, duplicateMenu } =
  await import("../controllers/menuController.js");

const projectRepo = await import("../db/repositories/projectRepository.js");
const { closeDb } = await import("../db/index.js");

// ============================================================================
// Dual-userId test matrix
// ============================================================================

const TEST_USER_IDS = ["local", "user_hosted_abc"];

/** Build a mock Express res that captures the response */
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

for (const TEST_USER_ID of TEST_USER_IDS) {
  describe(`[userId=${TEST_USER_ID}]`, () => {
    // ============================================================================
    // Test helpers (per userId)
    // ============================================================================

    const PROJECT_ID = `menu-test-project-uuid-${TEST_USER_ID}`;
    const PROJECT_FOLDER = `menu-test-project-${TEST_USER_ID}`;

    let activeProject;

    /** Build a mock Express req */
    function mockReq({ params = {}, body = {} } = {}) {
      return {
        params,
        body,
        activeProject,
        userId: TEST_USER_ID,
        app: { locals: { hostedMode: false, adapters: {} } },
        [Symbol.for("express-validator#contexts")]: [],
      };
    }

    /** Shortcut: call a controller and return the mock res */
    async function callController(controllerFn, { params, body } = {}) {
      const req = mockReq({ params, body });
      const res = mockRes();
      await controllerFn(req, res);
      return res;
    }

    /** Helper to create a menu via controller and return response */
    async function createTestMenu(name, description = "") {
      return callController(createMenu, { body: { name, description } });
    }

    /** Reset menus directory between test groups */
    async function resetMenus() {
      const menusDir = getProjectMenusDir(activeProject.folderName, TEST_USER_ID);
      await fs.remove(menusDir);
      await fs.ensureDir(menusDir);
    }

    // ============================================================================
    // Global setup (per userId)
    // ============================================================================

    before(async () => {
      activeProject = {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Menu Test Project",
        theme: "__menu_test_theme__",
        created: new Date().toISOString(),
      };

      // Write projects.json so controllers can find the active project
      await projectRepo.writeProjectsData({
        projects: [activeProject],
        activeProjectId: activeProject.id,
      }, TEST_USER_ID);

      // Create project directory and menus subfolder
      const projectDir = getProjectDir(activeProject.folderName, TEST_USER_ID);
      await fs.ensureDir(projectDir);
      await fs.ensureDir(getProjectMenusDir(activeProject.folderName, TEST_USER_ID));
    });

    // ============================================================================
    // createMenu
    // ============================================================================

    describe("createMenu", () => {
      beforeEach(async () => {
        await resetMenus();
      });

      it("creates a menu and returns 201", async () => {
        const res = await createTestMenu("Main Navigation");
        assert.equal(res._status, 201);
        assert.ok(res._json);
        assert.equal(res._json.name, "Main Navigation");
      });

      it("generates a slugified ID from the name", async () => {
        const res = await createTestMenu("Footer Links");
        assert.equal(res._json.id, "footer-links");
      });

      it("stores description when provided", async () => {
        const res = await createTestMenu("Sidebar", "A sidebar navigation menu");
        assert.equal(res._json.description, "A sidebar navigation menu");
      });

      it("initialises items as an empty array", async () => {
        const res = await createTestMenu("Empty Menu");
        assert.ok(Array.isArray(res._json.items));
        assert.equal(res._json.items.length, 0);
      });

      it("sets created and updated timestamps", async () => {
        const res = await createTestMenu("Timestamped Menu");
        assert.ok(res._json.created);
        assert.ok(res._json.updated);
        // Both should be valid ISO dates
        assert.doesNotThrow(() => new Date(res._json.created));
        assert.doesNotThrow(() => new Date(res._json.updated));
      });

      it("writes a JSON file to the menus directory", async () => {
        const res = await createTestMenu("Persisted Menu");
        const menuPath = getMenuPath(activeProject.folderName, res._json.id, TEST_USER_ID);
        assert.ok(await fs.pathExists(menuPath));

        const onDisk = JSON.parse(await fs.readFile(menuPath, "utf8"));
        assert.equal(onDisk.name, "Persisted Menu");
      });

      it("auto-increments when same name is used twice", async () => {
        await createTestMenu("Duplicate");
        const res2 = await createTestMenu("Duplicate");
        // generateUniqueMenuId appends a counter, so the second gets "duplicate-1"
        assert.equal(res2._status, 201);
        assert.equal(res2._json.id, "duplicate-1");
        assert.equal(res2._json.name, "Duplicate");
      });

      it("auto-increments ID when slug collides", async () => {
        await createTestMenu("Nav");
        const res = await createTestMenu("Nav Alt");
        // "Nav Alt" -> "nav-alt", shouldn't collide with "nav"
        assert.equal(res._status, 201);
        assert.equal(res._json.id, "nav-alt");
      });

      it("handles special characters in menu name", async () => {
        const res = await createTestMenu("\u00dcber Navigation & Links!");
        assert.equal(res._status, 201);
        // slugify with strict: true removes special chars
        assert.ok(res._json.id.length > 0);
        assert.ok(!res._json.id.includes("&"));
        assert.ok(!res._json.id.includes("!"));
      });

      it("assigns a uuid on creation", async () => {
        const res = await createTestMenu("UUID Menu");
        assert.equal(res._status, 201);
        assert.ok(res._json.uuid, "menu should have a uuid");
        // UUID v4 format
        assert.match(res._json.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it("generates unique uuids for different menus", async () => {
        const res1 = await createTestMenu("Menu A");
        const res2 = await createTestMenu("Menu B");
        assert.notEqual(res1._json.uuid, res2._json.uuid);
      });

      it("preserves special characters in name without HTML-encoding", async () => {
        const name = 'Nav & "Links" \u2014 Main';
        const res = await createTestMenu(name);
        assert.equal(res._status, 201);
        assert.equal(res._json.name, name, "name should not be HTML-encoded");
        assert.ok(!res._json.name.includes("&amp;"), "ampersand should not be encoded");
        assert.ok(!res._json.name.includes("&quot;"), "quotes should not be encoded");
      });

      it("strips HTML from description", async () => {
        const res = await createTestMenu("Clean Menu", '<script>alert(1)</script>');
        assert.equal(res._status, 201);
        assert.equal(res._json.description, "", "script tags should be stripped from description");
      });

      it("generates clean ID when name contains HTML", async () => {
        const res = await createTestMenu('s1<script>alert(1)</script>');
        assert.equal(res._status, 201);
        assert.equal(res._json.name, "s1");
        assert.equal(res._json.id, "s1", "ID should be generated from sanitized name");
        assert.ok(!res._json.id.includes("less"), "ID should not contain slugified angle brackets");
        assert.ok(!res._json.id.includes("greater"), "ID should not contain slugified angle brackets");
        assert.ok(!res._json.id.includes("script"), "ID should not contain script artifacts");
      });

      it("ignores client-supplied id field", async () => {
        const res = await callController(createMenu, {
          body: { name: "Server ID Menu", id: "client-generated-id" },
        });
        assert.equal(res._status, 201);
        assert.equal(res._json.id, "server-id-menu", "ID should be generated server-side, not from client");
      });

      it("rejects empty name (e.g. after HTML tags are stripped)", async () => {
        const res = await createTestMenu("");
        assert.equal(res._status, 400);
        assert.match(res._json.error, /name.*required/i);
      });

      it("rejects whitespace-only name", async () => {
        const res = await createTestMenu("   ");
        assert.equal(res._status, 400);
        assert.match(res._json.error, /name.*required/i);
      });
    });

    // ============================================================================
    // getMenu
    // ============================================================================

    describe("getMenu", () => {
      before(async () => {
        await resetMenus();
        await createTestMenu("Lookup Menu");
      });

      it("returns a menu by its ID", async () => {
        const res = await callController(getMenu, { params: { id: "lookup-menu" } });
        assert.equal(res._status, 200);
        assert.equal(res._json.name, "Lookup Menu");
        assert.equal(res._json.id, "lookup-menu");
      });

      it("returns 404 for a non-existent menu", async () => {
        const res = await callController(getMenu, { params: { id: "does-not-exist" } });
        assert.equal(res._status, 404);
        assert.match(res._json.error, /not found/i);
      });

      it("returns all stored fields", async () => {
        const res = await callController(getMenu, { params: { id: "lookup-menu" } });
        assert.ok("id" in res._json);
        assert.ok("name" in res._json);
        assert.ok("items" in res._json);
        assert.ok("created" in res._json);
        assert.ok("updated" in res._json);
      });
    });

    // ============================================================================
    // getAllMenus
    // ============================================================================

    describe("getAllMenus", () => {
      before(async () => {
        await resetMenus();
        await createTestMenu("Menu Alpha");
        await createTestMenu("Menu Beta");
        await createTestMenu("Menu Gamma");
      });

      it("returns an array of all menus", async () => {
        const res = await callController(getAllMenus);
        assert.equal(res._status, 200);
        assert.ok(Array.isArray(res._json));
        assert.equal(res._json.length, 3);
      });

      it("each menu has all expected fields", async () => {
        const res = await callController(getAllMenus);
        for (const menu of res._json) {
          assert.ok(menu.id);
          assert.ok(menu.name);
          assert.ok(Array.isArray(menu.items));
          assert.ok(menu.created);
          assert.ok(menu.updated);
        }
      });

      it("returns empty array when no menus exist", async () => {
        await resetMenus();
        const res = await callController(getAllMenus);
        assert.equal(res._status, 200);
        assert.deepEqual(res._json, []);
      });

      it("returns empty array when menus directory does not exist", async () => {
        const menusDir = getProjectMenusDir(activeProject.folderName, TEST_USER_ID);
        await fs.remove(menusDir);
        const res = await callController(getAllMenus);
        assert.equal(res._status, 200);
        assert.deepEqual(res._json, []);
        // Restore for subsequent tests
        await fs.ensureDir(menusDir);
      });
    });

    // ============================================================================
    // getMenuById (rendering helper — direct function call, not controller)
    // ============================================================================

    describe("getMenuById", () => {
      before(async () => {
        await resetMenus();
        await createTestMenu("Render Menu");
      });

      it("returns menu data by project directory and menu ID", async () => {
        const projectDir = getProjectDir(activeProject.folderName, TEST_USER_ID);
        const menu = await getMenuById(projectDir, "render-menu");
        assert.ok(menu);
        assert.equal(menu.name, "Render Menu");
        assert.equal(menu.id, "render-menu");
      });

      it("returns { items: [] } for a non-existent menu", async () => {
        const projectDir = getProjectDir(activeProject.folderName, TEST_USER_ID);
        const menu = await getMenuById(projectDir, "ghost-menu");
        assert.ok(menu);
        assert.deepEqual(menu.items, []);
      });

      it("returns null when menuId is falsy", async () => {
        const projectDir = getProjectDir(activeProject.folderName, TEST_USER_ID);
        const result1 = await getMenuById(projectDir, null);
        assert.equal(result1, null);
        const result2 = await getMenuById(projectDir, undefined);
        assert.equal(result2, null);
        const result3 = await getMenuById(projectDir, "");
        assert.equal(result3, null);
      });
    });

    // ============================================================================
    // updateMenu
    // ============================================================================

    describe("updateMenu", () => {
      beforeEach(async () => {
        await resetMenus();
        await createTestMenu("Original Name");
      });

      it("updates name and keeps the same ID when slug unchanged", async () => {
        // Rename but slug stays the same (shouldn't happen since name -> slug)
        // Instead, update with the same name
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", description: "Updated desc" },
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.id, "original-name");
        assert.equal(res._json.description, "Updated desc");
      });

      it("keeps filename and ID stable when name changes", async () => {
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Renamed Menu" },
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.id, "original-name", "ID should stay the same after rename");
        assert.equal(res._json.name, "Renamed Menu");

        // File should still be at the original path
        assert.ok(await fs.pathExists(getMenuPath(activeProject.folderName, "original-name", TEST_USER_ID)));
      });

      it("updates the 'updated' timestamp", async () => {
        // Get original timestamp
        const orig = await callController(getMenu, { params: { id: "original-name" } });
        const origUpdated = orig._json.updated;

        // Small delay so timestamps differ
        await new Promise((r) => setTimeout(r, 10));

        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", items: [] },
        });
        assert.ok(res._json.updated >= origUpdated);
      });

      it("preserves items through update", async () => {
        const items = [
          { id: "item_1", label: "Home", url: "/" },
          { id: "item_2", label: "About", url: "/about" },
        ];
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", items },
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.items.length, 2);
        assert.equal(res._json.items[0].label, "Home");
        assert.equal(res._json.items[1].label, "About");
      });

      it("returns 404 for a non-existent menu", async () => {
        const res = await callController(updateMenu, {
          params: { id: "no-such-menu" },
          body: { name: "Whatever" },
        });
        assert.equal(res._status, 404);
      });

      it("allows two menus with the same display name (different IDs)", async () => {
        await createTestMenu("Conflicting Name");

        // Rename original-name to have the same display name
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Conflicting Name" },
        });
        assert.equal(res._status, 200);
        // ID stays as original-name, only the display name changes
        assert.equal(res._json.id, "original-name");
        assert.equal(res._json.name, "Conflicting Name");
      });

      it("persists changes to disk", async () => {
        await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", description: "Saved to disk" },
        });

        const menuPath = getMenuPath(activeProject.folderName, "original-name", TEST_USER_ID);
        const onDisk = JSON.parse(await fs.readFile(menuPath, "utf8"));
        assert.equal(onDisk.description, "Saved to disk");
      });

      it("preserves uuid when menu is renamed", async () => {
        // Get the original uuid
        const orig = await callController(getMenu, { params: { id: "original-name" } });
        const originalUuid = orig._json.uuid;
        assert.ok(originalUuid, "original menu should have a uuid");

        // Rename the menu
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Totally Different Name" },
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.id, "original-name", "ID stays stable");
        assert.equal(res._json.name, "Totally Different Name");
        assert.equal(res._json.uuid, originalUuid, "uuid should be preserved after rename");
      });

      it("preserves uuid when only description is updated", async () => {
        const orig = await callController(getMenu, { params: { id: "original-name" } });
        const originalUuid = orig._json.uuid;

        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", description: "New description" },
        });
        assert.equal(res._json.uuid, originalUuid);
      });

      it("strips HTML from description on update", async () => {
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "Original Name", description: '<script>alert(1)</script>' },
        });
        assert.equal(res._status, 200);
        assert.equal(res._json.description, "", "script tags should be stripped from description");
      });

      it("rejects empty name on update", async () => {
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "" },
        });
        assert.equal(res._status, 400);
        assert.match(res._json.error, /name.*required/i);
      });

      it("rejects whitespace-only name on update", async () => {
        const res = await callController(updateMenu, {
          params: { id: "original-name" },
          body: { name: "   " },
        });
        assert.equal(res._status, 400);
        assert.match(res._json.error, /name.*required/i);
      });
    });

    // ============================================================================
    // deleteMenu
    // ============================================================================

    describe("deleteMenu", () => {
      beforeEach(async () => {
        await resetMenus();
        await createTestMenu("Doomed Menu");
      });

      it("deletes a menu and returns success", async () => {
        const res = await callController(deleteMenu, { params: { id: "doomed-menu" } });
        assert.equal(res._status, 200);
        assert.equal(res._json.success, true);
      });

      it("removes the file from disk", async () => {
        await callController(deleteMenu, { params: { id: "doomed-menu" } });
        const menuPath = getMenuPath(activeProject.folderName, "doomed-menu", TEST_USER_ID);
        assert.ok(!(await fs.pathExists(menuPath)));
      });

      it("succeeds silently when deleting a non-existent menu", async () => {
        // fs.remove doesn't throw on missing files
        const res = await callController(deleteMenu, { params: { id: "phantom" } });
        assert.equal(res._status, 200);
        assert.equal(res._json.success, true);
      });

      it("does not affect other menus", async () => {
        await createTestMenu("Survivor Menu");
        await callController(deleteMenu, { params: { id: "doomed-menu" } });

        const remaining = await callController(getAllMenus);
        assert.equal(remaining._json.length, 1);
        assert.equal(remaining._json[0].name, "Survivor Menu");
      });
    });

    // ============================================================================
    // duplicateMenu
    // ============================================================================

    describe("duplicateMenu", () => {
      beforeEach(async () => {
        await resetMenus();
        // Create a menu with items for duplication tests
        await createTestMenu("Source Menu", "Original description");
        // Manually add items to the menu file for richer tests
        const menuPath = getMenuPath(activeProject.folderName, "source-menu", TEST_USER_ID);
        const menuData = JSON.parse(await fs.readFile(menuPath, "utf8"));
        menuData.items = [
          {
            id: "orig_item_1",
            label: "Home",
            url: "/",
            items: [
              { id: "orig_sub_1", label: "Dashboard", url: "/dashboard" },
              { id: "orig_sub_2", label: "Settings", url: "/settings" },
            ],
          },
          { id: "orig_item_2", label: "About", url: "/about" },
        ];
        await fs.writeFile(menuPath, JSON.stringify(menuData, null, 2));
      });

      it("creates a duplicate and returns 201", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.equal(res._status, 201);
        assert.ok(res._json);
      });

      it("names the duplicate 'Copy of <original>'", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.equal(res._json.name, "Copy of Source Menu");
      });

      it("generates a new slugified ID from the copy name", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.equal(res._json.id, "copy-of-source-menu");
      });

      it("preserves all menu items", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.equal(res._json.items.length, 2);
        assert.equal(res._json.items[0].label, "Home");
        assert.equal(res._json.items[1].label, "About");
      });

      it("regenerates item IDs (top-level)", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        // New IDs should not match the originals
        assert.notEqual(res._json.items[0].id, "orig_item_1");
        assert.notEqual(res._json.items[1].id, "orig_item_2");
        // New IDs should follow the item_<uuid> pattern
        assert.match(res._json.items[0].id, /^item_[0-9a-f-]{36}$/);
        assert.match(res._json.items[1].id, /^item_[0-9a-f-]{36}$/);
      });

      it("regenerates item IDs recursively (nested items)", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        const nestedItems = res._json.items[0].items;
        assert.ok(Array.isArray(nestedItems));
        assert.equal(nestedItems.length, 2);
        assert.notEqual(nestedItems[0].id, "orig_sub_1");
        assert.notEqual(nestedItems[1].id, "orig_sub_2");
        assert.match(nestedItems[0].id, /^item_[0-9a-f-]{36}$/);
      });

      it("sets new created and updated timestamps", async () => {
        const original = await callController(getMenu, { params: { id: "source-menu" } });
        // Small delay so timestamps differ
        await new Promise((r) => setTimeout(r, 10));

        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.ok(res._json.created >= original._json.created);
      });

      it("writes the duplicate to disk", async () => {
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        const dupPath = getMenuPath(activeProject.folderName, res._json.id, TEST_USER_ID);
        assert.ok(await fs.pathExists(dupPath));
      });

      it("does not modify the original menu", async () => {
        await callController(duplicateMenu, { params: { id: "source-menu" } });
        const original = await callController(getMenu, { params: { id: "source-menu" } });
        assert.equal(original._json.name, "Source Menu");
        assert.equal(original._json.items[0].id, "orig_item_1");
      });

      it("generates a new uuid for the duplicate (different from original)", async () => {
        const original = await callController(getMenu, { params: { id: "source-menu" } });
        const res = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.ok(res._json.uuid, "duplicate should have a uuid");
        assert.notEqual(res._json.uuid, original._json.uuid, "duplicate uuid must differ from original");
      });

      it("returns 404 when duplicating a non-existent menu", async () => {
        const res = await callController(duplicateMenu, { params: { id: "no-such-menu" } });
        assert.equal(res._status, 404);
      });

      it("handles duplicate of a duplicate (incremental naming)", async () => {
        // First duplicate
        await callController(duplicateMenu, { params: { id: "source-menu" } });
        // Second duplicate of original -- "Copy of Source Menu" exists, so it becomes "Copy 2 of Source Menu"
        const res2 = await callController(duplicateMenu, { params: { id: "source-menu" } });
        assert.equal(res2._status, 201);
        assert.equal(res2._json.id, "copy-2-of-source-menu");
        assert.equal(res2._json.name, "Copy 2 of Source Menu");
      });
    });

    // ============================================================================
    // Edge cases & no active project
    // ============================================================================

    describe("Edge cases", () => {
      it("returns 404 when no active project exists (createMenu)", async () => {
        const { resolveActiveProject } = await import("../middleware/resolveActiveProject.js");

        // Temporarily clear active project
        const backup = await projectRepo.readProjectsData(TEST_USER_ID);
        await projectRepo.writeProjectsData({ ...backup, activeProjectId: null }, TEST_USER_ID);

        const req = { userId: TEST_USER_ID };
        const res = mockRes();
        let nextCalled = false;
        await resolveActiveProject(req, res, () => { nextCalled = true; });

        assert.equal(res._status, 404);
        assert.match(res._json.error, /no active project/i);
        assert.equal(nextCalled, false);

        // Restore
        await projectRepo.writeProjectsData(backup, TEST_USER_ID);
      });

      it("returns 404 when no active project exists (getAllMenus)", async () => {
        const { resolveActiveProject } = await import("../middleware/resolveActiveProject.js");

        const backup = await projectRepo.readProjectsData(TEST_USER_ID);
        await projectRepo.writeProjectsData({ ...backup, activeProjectId: null }, TEST_USER_ID);

        const req = { userId: TEST_USER_ID };
        const res = mockRes();
        let nextCalled = false;
        await resolveActiveProject(req, res, () => { nextCalled = true; });

        assert.equal(res._status, 404);
        assert.match(res._json.error, /no active project/i);
        assert.equal(nextCalled, false);

        await projectRepo.writeProjectsData(backup, TEST_USER_ID);
      });

      it("returns 404 when no active project exists (deleteMenu)", async () => {
        const { resolveActiveProject } = await import("../middleware/resolveActiveProject.js");

        const backup = await projectRepo.readProjectsData(TEST_USER_ID);
        await projectRepo.writeProjectsData({ ...backup, activeProjectId: null }, TEST_USER_ID);

        const req = { userId: TEST_USER_ID };
        const res = mockRes();
        let nextCalled = false;
        await resolveActiveProject(req, res, () => { nextCalled = true; });

        assert.equal(res._status, 404);
        assert.match(res._json.error, /no active project/i);
        assert.equal(nextCalled, false);

        await projectRepo.writeProjectsData(backup, TEST_USER_ID);
      });
    });

    // ============================================================================
    // UUID backward compatibility (lazy backfill)
    // ============================================================================

    describe("UUID backward compatibility", () => {
      it("backfills uuid for legacy menus without one (getAllMenus)", async () => {
        await resetMenus();

        // Write a legacy menu file without uuid
        const menuPath = getMenuPath(activeProject.folderName, "legacy-menu", TEST_USER_ID);
        const legacyMenu = {
          id: "legacy-menu",
          name: "Legacy Menu",
          items: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        await fs.outputFile(menuPath, JSON.stringify(legacyMenu, null, 2));

        // getAllMenus should backfill the uuid
        const res = await callController(getAllMenus);
        assert.equal(res._status, 200);
        const menu = res._json.find((m) => m.id === "legacy-menu");
        assert.ok(menu.uuid, "legacy menu should have been backfilled with a uuid");

        // Verify it was persisted to disk
        const onDisk = JSON.parse(await fs.readFile(menuPath, "utf8"));
        assert.equal(onDisk.uuid, menu.uuid);
      });

      it("backfills uuid for legacy menus without one (getMenuById)", async () => {
        await resetMenus();

        // Write a legacy menu file without uuid
        const menuPath = getMenuPath(activeProject.folderName, "legacy-by-id", TEST_USER_ID);
        const legacyMenu = {
          id: "legacy-by-id",
          name: "Legacy By ID",
          items: [{ id: "item_1", label: "Home", link: "/" }],
        };
        await fs.outputFile(menuPath, JSON.stringify(legacyMenu, null, 2));

        // getMenuById should backfill the uuid
        const projectDir = getProjectDir(activeProject.folderName, TEST_USER_ID);
        const menu = await getMenuById(projectDir, "legacy-by-id");
        assert.ok(menu.uuid, "legacy menu should have been backfilled with a uuid");
        assert.equal(menu.items.length, 1);

        // Verify it was persisted to disk
        const onDisk = JSON.parse(await fs.readFile(menuPath, "utf8"));
        assert.equal(onDisk.uuid, menu.uuid);
      });
    });
  }); // end describe(`[userId=${TEST_USER_ID}]`)
} // end for loop

// ============================================================================
// Global teardown (outside the loop)
// ============================================================================

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});
