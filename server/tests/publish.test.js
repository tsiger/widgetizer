/**
 * Publish status test suite.
 *
 * Focuses on the editor-side publish state contract:
 * - drafts may have publishedSiteId/publishedUrl but are not "published"
 *   until publishedAt is set
 * - truly published projects report published=true
 *
 * Run with: node --test server/tests/publish.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-publish-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.NODE_ENV = "test";

const { DATA_DIR, getUserDataDir } = await import("../config.js");
const { closeDb } = await import("../db/index.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { getPublishStatus } = await import("../controllers/publishController.js");

const TEST_USER_IDS = ["local", "user_hosted_abc"];

before(async () => {
  assert.equal(DATA_DIR, TEST_DATA_DIR, "DATA_DIR should use test override");
  await fs.ensureDir(TEST_DATA_DIR);
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

for (const TEST_USER_ID of TEST_USER_IDS) {
  describe(`[userId=${TEST_USER_ID}]`, () => {
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

    async function callGetPublishStatus(projectId) {
      const req = {
        params: { projectId },
        userId: TEST_USER_ID,
        [Symbol.for("express-validator#contexts")]: [],
      };
      const res = mockRes();
      await getPublishStatus(req, res);
      return res;
    }

    function createStoredProject(name) {
      const now = new Date().toISOString();
      const projectId = `project-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      projectRepo.createProject({
        id: projectId,
        folderName: `folder-${Math.random().toString(36).slice(2)}`,
        name,
        description: "Publish status test project",
        theme: "__test__",
        themeVersion: "1.0.0",
        preset: null,
        source: "theme",
        receiveThemeUpdates: false,
        siteUrl: "",
        created: now,
        updated: now,
        userId: TEST_USER_ID,
      });

      return projectId;
    }

    beforeEach(async () => {
      await fs.ensureDir(getUserDataDir(TEST_USER_ID));
      await projectRepo.writeProjectsData({ projects: [], activeProjectId: null }, TEST_USER_ID);
    });

    it("treats draft-linked projects as not published until publishedAt is set", async () => {
      const projectId = createStoredProject(`Draft Status ${TEST_USER_ID}`);

      projectRepo.updateProject(projectId, {
        publishedSiteId: `site-${Date.now()}`,
        publishedUrl: "https://draft-status.mywidgetizer.org",
      }, TEST_USER_ID);

      const res = await callGetPublishStatus(projectId);

      assert.equal(res._status, 200);
      assert.deepEqual(res._json, {
        published: false,
        siteId: projectRepo.getProjectById(projectId, TEST_USER_ID).publishedSiteId,
        url: "https://draft-status.mywidgetizer.org",
        publishedAt: null,
      });
    });

    it("reports projects as published once publishedAt is set", async () => {
      const projectId = createStoredProject(`Published Status ${TEST_USER_ID}`);
      const publishedAt = "2026-02-28T12:00:00.000Z";

      projectRepo.updateProject(projectId, {
        publishedSiteId: `site-${Date.now()}`,
        publishedUrl: "https://published-status.mywidgetizer.org",
        publishedAt,
      }, TEST_USER_ID);

      const res = await callGetPublishStatus(projectId);

      assert.equal(res._status, 200);
      assert.deepEqual(res._json, {
        published: true,
        siteId: projectRepo.getProjectById(projectId, TEST_USER_ID).publishedSiteId,
        url: "https://published-status.mywidgetizer.org",
        publishedAt,
      });
    });
  });
}
