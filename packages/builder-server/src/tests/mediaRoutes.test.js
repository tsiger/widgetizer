/**
 * Where the media routes live, over real HTTP: the OSS app, and the
 * project-scoped router mounted the way an embedding host mounts it
 * (`/api/projects/:projectId`, as `apiBase.js` describes).
 *
 * The metadata save is an ordinary project-scoped call, so it works under
 * either mount; the browser-loaded file routes are a separate router the OSS
 * shell mounts at `/api/media` and a host may leave out.
 *
 * Run with: node --test packages/builder-server/src/tests/mediaRoutes.test.js
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import express from "express";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-routes-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origError = console.error;
console.error = () => {};

const { createEditorApp } = await import("../createApp.js");
const { setupBuilderServer } = await import("../setupBuilderServer.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "routes-project";
const PROJECT_FOLDER = "routes-project-folder";
const OTHER_PROJECT_ID = "routes-other";
const OTHER_PROJECT_FOLDER = "routes-other-folder";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const servers = [];
let ossUrl;
let hostUrl;

function adapters(db) {
  return {
    scopeResolver: new LocalScopeResolver(db),
    previewScopeResolver: new LocalPreviewScopeResolver(db),
    storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
    assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
    publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
    limits: new LocalLimitsAdapter(db),
  };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      servers.push(server);
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function seedImage(projectId, id, filename) {
  mediaRepo.addMediaFile(projectId, {
    id,
    filename,
    originalName: filename,
    type: "image/png",
    size: PNG.length,
    path: `/uploads/images/${filename}`,
    uploaded: new Date().toISOString(),
    metadata: { alt: "original alt", title: "", caption: "" },
  });
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Routes", theme: "arch", created: new Date().toISOString() },
      { id: OTHER_PROJECT_ID, folderName: OTHER_PROJECT_FOLDER, name: "Other", theme: "arch", created: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
  await fs.outputFile(path.join(getProjectDir(PROJECT_FOLDER), "uploads", "images", "photo.png"), PNG);
  await fs.ensureDir(getProjectDir(OTHER_PROJECT_FOLDER));
  seedImage(PROJECT_ID, "own-img", "photo.png");
  seedImage(OTHER_PROJECT_ID, "other-img", "other.png");

  const db = getDb();
  ossUrl = await listen(await createEditorApp({ adapters: adapters(db) }));

  // A host mounts the project-scoped router under the project's own path and
  // serves the browser-loaded file URLs itself, so it leaves the file router out.
  const host = express();
  const { projectScopedRouter } = setupBuilderServer({ adapters: adapters(db) });
  host.use("/api/projects/:projectId", projectScopedRouter);
  hostUrl = await listen(host);
});

after(async () => {
  console.error = _origError;
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  closeDb();
  await fs.remove(TEST_ROOT);
});

const altOf = (projectId, fileId) => mediaRepo.getMediaFileById(projectId, fileId)?.metadata?.alt;
// Each test starts from known alt text, so none depends on another having run.
const resetAlt = () => {
  mediaRepo.updateFileMetadata(PROJECT_ID, "own-img", { alt: "original alt", title: "", caption: "" });
  mediaRepo.updateFileMetadata(OTHER_PROJECT_ID, "other-img", { alt: "original alt", title: "", caption: "" });
};

function putMetadata(url, body, projectId = PROJECT_ID) {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Project-Id": projectId },
    body: JSON.stringify(body),
  });
}

describe("saving media metadata (OSS mount)", () => {
  it("saves alt text through the project-scoped route", async () => {
    resetAlt();
    const res = await putMetadata(`${ossUrl}/api/media/own-img/metadata`, { alt: "new alt", title: "t" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).file.metadata.alt, "new alt");
    assert.equal(altOf(PROJECT_ID, "own-img"), "new alt");
  });

  it("refuses another project's file through the same route", async () => {
    resetAlt();
    const res = await putMetadata(`${ossUrl}/api/media/other-img/metadata`, { alt: "taken" });
    assert.equal(res.status, 404);
    assert.equal(altOf(OTHER_PROJECT_ID, "other-img"), "original alt");
  });

  it("refuses a save for a project that is not the active one", async () => {
    resetAlt();
    const res = await putMetadata(`${ossUrl}/api/media/own-img/metadata`, { alt: "stale tab" }, OTHER_PROJECT_ID);
    assert.equal(res.status, 409);
    assert.equal(altOf(PROJECT_ID, "own-img"), "original alt");
  });

  it("no longer answers the old path-scoped save", async () => {
    resetAlt();
    const res = await putMetadata(`${ossUrl}/api/media/projects/${PROJECT_ID}/media/own-img/metadata`, {
      alt: "old route",
    });
    assert.equal(res.status, 404);
    assert.equal(altOf(PROJECT_ID, "own-img"), "original alt");
  });

  it("still reaches the management routes past the file router", async () => {
    const res = await fetch(`${ossUrl}/api/media/own-img/usage`, { headers: { "X-Project-Id": PROJECT_ID } });
    assert.equal(res.status, 200);
  });
});

describe("saving media metadata (host-shaped mount)", () => {
  it("saves alt text under /api/projects/:projectId", async () => {
    resetAlt();
    const res = await putMetadata(`${hostUrl}/api/projects/${PROJECT_ID}/media/own-img/metadata`, { alt: "from a host" });
    assert.equal(res.status, 200);
    assert.equal(altOf(PROJECT_ID, "own-img"), "from a host");
  });
});

describe("browser-loaded media files", () => {
  it("are served at /api/media/projects/:projectId/… by the OSS app", async () => {
    const res = await fetch(`${ossUrl}/api/media/projects/${PROJECT_ID}/uploads/images/photo.png`);
    assert.equal(res.status, 200);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);
    const byId = await fetch(`${ossUrl}/api/media/projects/${PROJECT_ID}/media/own-img`);
    assert.equal(byId.status, 200);
  });

  it("are not part of the project-scoped router a host mounts", async () => {
    const res = await fetch(`${hostUrl}/api/projects/${PROJECT_ID}/media/projects/${PROJECT_ID}/uploads/images/photo.png`);
    assert.equal(res.status, 404);
  });

  it("answer 404 when no project is active, as before", async () => {
    projectRepo.setActiveProjectId(null);
    try {
      const res = await fetch(`${ossUrl}/api/media/projects/${PROJECT_ID}/uploads/images/photo.png`);
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: "No active project found" });
    } finally {
      projectRepo.setActiveProjectId(PROJECT_ID);
    }
  });
});
