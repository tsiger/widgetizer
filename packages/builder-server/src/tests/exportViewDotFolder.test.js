/**
 * The export viewer when the data folder sits under a dot-folder, as the desktop
 * app's does on Linux (`~/.config/Widgetizer/data`). Express's file sender
 * refuses any path with a dot-folder in it, so files are sent relative to the
 * export; a dot-file inside the export stays refused.
 *
 * Run with: node --test packages/builder-server/src/tests/exportViewDotFolder.test.js
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-exportview-dot-${Date.now()}`, ".config", "Widgetizer");
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir, getPublishDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "dot-folder-project";
const PROJECT_FOLDER = "dot-folder-site";
const EXPORT_DIR = `${PROJECT_FOLDER}-v1`;
let server;
let base;

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [{ id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Dot folder", theme: "arch", created: new Date().toISOString() }],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
  const exportRoot = path.join(getPublishDir(), EXPORT_DIR);
  await fs.outputFile(path.join(exportRoot, "index.html"), "<p>home</p>");
  await fs.outputFile(path.join(exportRoot, "about.html"), "<p>about</p>");
  await fs.outputFile(path.join(exportRoot, "assets", "site.css"), "body{}");
  await fs.outputFile(path.join(exportRoot, ".hidden"), "secret");

  const db = getDb();
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
      publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
      limits: new LocalLimitsAdapter(db),
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/export/view/${EXPORT_DIR}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(path.dirname(path.dirname(TEST_ROOT)));
});

describe("export viewer under a dot-folder", () => {
  it("serves the export's pages and assets", async () => {
    for (const [url, body] of [
      [base, "<p>home</p>"],
      [`${base}/about`, "<p>about</p>"],
      [`${base}/assets/site.css`, "body{}"],
    ]) {
      const res = await fetch(url);
      assert.equal(res.status, 200, url);
      assert.equal(await res.text(), body, url);
    }
  });

  it("still refuses a dot-file inside the export", async () => {
    const res = await fetch(`${base}/.hidden`);
    assert.notEqual(res.status, 200);
    assert.doesNotMatch(await res.text(), /secret/);
  });
});
