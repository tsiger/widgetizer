/**
 * The export viewer routes hand a ready exportViewer adapter the export and
 * redirect to its start page; without a usable viewer they serve the file as
 * before. The scope check runs before the viewer is told anything.
 *
 * Run with: node --test packages/builder-server/src/tests/exportViewRedirect.test.js
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-exportview-redirect-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir, getPublishDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { START_PATH, startDestination, createExportSiteApp } = await import("../services/exportSite.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "redirect-project";
const PROJECT_FOLDER = "redirect-site";
const OTHER_FOLDER = "other-site";
const VIEWER_BASE = "http://view.test:9";
let server;
let origin;
let viewer;
let shown;
let nextDir = 0;

function makeViewer(overrides = {}) {
  return {
    isReady: () => true,
    show: (args) => shown.push(args),
    baseUrlFor: () => VIEWER_BASE,
    ...overrides,
  };
}

// Each test gets its own export dir so its manifest is its own.
async function newExport(manifest) {
  nextDir += 1;
  const dir = `${PROJECT_FOLDER}-v${nextDir}`;
  const root = path.join(getPublishDir(), dir);
  await fs.outputFile(path.join(root, "index.html"), "<p>home</p>");
  await fs.outputFile(path.join(root, "about.html"), "<p>about</p>");
  if (manifest) await fs.outputJson(path.join(root, "manifest.json"), manifest);
  return { dir, root };
}

async function setSiteUrl(siteUrl) {
  const data = await projectRepo.readProjectsData();
  data.projects[0].siteUrl = siteUrl;
  await projectRepo.writeProjectsData(data);
}

const get = (p) => fetch(`${origin}/api/export/view/${p}`, { redirect: "manual" });

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [{ id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Redirect", theme: "arch", created: new Date().toISOString() }],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
  await fs.outputFile(path.join(getPublishDir(), `${OTHER_FOLDER}-v1`, "index.html"), "<p>other</p>");

  const db = getDb();
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
      publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
      limits: new LocalLimitsAdapter(db),
      get exportViewer() {
        return viewer;
      },
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  shown = [];
  viewer = makeViewer();
  await setSiteUrl("");
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("export view redirect", () => {
  it("redirects a file to the viewer's start page, keeping path and query, and shows the export", async () => {
    const { dir, root } = await newExport({ sitePath: "/" });
    const res = await get(`${dir}/about.html?x=1`);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), `${VIEWER_BASE}${START_PATH}?to=${encodeURIComponent("/about.html?x=1")}`);
    assert.equal(res.headers.get("location"), `http://view.test:9/__widgetizer/view-start?to=%2Fabout.html%3Fx%3D1`);
    assert.equal(shown.length, 1);
    assert.deepEqual(shown[0], { exportDir: dir, exportRoot: root, sitePath: "/" });
  });

  it("puts the manifest's site path in front of the file", async () => {
    const { dir } = await newExport({ sitePath: "/repo/" });
    const res = await get(`${dir}/about.html`);
    assert.equal(new URL(res.headers.get("location")).searchParams.get("to"), "/repo/about.html");
    assert.equal(shown[0].sitePath, "/repo/");
  });

  it("falls back to the project's Site URL path without a manifest site path", async () => {
    await setSiteUrl("https://user.github.io/blog/");
    const { dir } = await newExport({});
    const res = await get(`${dir}/about.html`);
    assert.equal(new URL(res.headers.get("location")).searchParams.get("to"), "/blog/about.html");
    assert.equal(shown[0].sitePath, "/blog/");
  });

  it("uses the site root when there is neither", async () => {
    const { dir } = await newExport();
    const res = await get(`${dir}/about.html`);
    assert.equal(new URL(res.headers.get("location")).searchParams.get("to"), "/about.html");
    assert.equal(shown[0].sitePath, "/");
  });

  it("sends the bare export to the index under the site path", async () => {
    const { dir } = await newExport({ sitePath: "/repo/" });
    const res = await get(dir);
    assert.equal(res.status, 302);
    assert.equal(new URL(res.headers.get("location")).searchParams.get("to"), "/repo/index.html");
  });

  it("encodes each segment of the file path once, so odd file names survive", async () => {
    const { dir, root } = await newExport({ sitePath: "/" });
    const names = ["a b.html", "caf\u00e9.html", "100%.html", "a%20b.html", "a#1.html"];
    for (const name of names) await fs.outputFile(path.join(root, "sub", name), `<p>${name}</p>`);
    for (const name of names) {
      const res = await get(`${dir}/sub/${encodeURIComponent(name)}?q=1`);
      assert.equal(res.status, 302, name);
      const to = new URL(res.headers.get("location")).searchParams.get("to");
      assert.equal(to, `/sub/${encodeURIComponent(name)}?q=1`, name);
    }
  });

  it("gives a destination the export site serves, for a name with # and %", async () => {
    const { dir, root } = await newExport({ sitePath: "/" });
    await fs.outputFile(path.join(root, "a#1%.html"), "<p>odd</p>");
    const res = await get(`${dir}/${encodeURIComponent("a#1%.html")}`);
    const to = new URL(res.headers.get("location")).searchParams.get("to");
    const dest = startDestination(to, "/");
    const siteServer = await new Promise((resolve) => {
      const s = createExportSiteApp({ getCurrent: () => ({ exportDir: dir, exportRoot: root, sitePath: "/" }) }).listen(0, "127.0.0.1", () => resolve(s));
    });
    try {
      const served = await fetch(`http://127.0.0.1:${siteServer.address().port}${dest}`);
      assert.equal(served.status, 200);
      assert.equal(await served.text(), "<p>odd</p>");
    } finally {
      await new Promise((resolve) => siteServer.close(resolve));
    }
  });

  it("keeps the file and query for a //host-shaped site path, all the way to the export site", async () => {
    const sitePath = "//other.example/";
    const { dir, root } = await newExport({ sitePath });
    const res = await get(`${dir}/about.html?x=1`);
    const to = new URL(res.headers.get("location")).searchParams.get("to");
    assert.equal(to, "/.//other.example/about.html?x=1");
    const dest = startDestination(to, sitePath);
    const siteServer = await new Promise((resolve) => {
      const s = createExportSiteApp({ getCurrent: () => ({ exportDir: dir, exportRoot: root, sitePath }) }).listen(0, "127.0.0.1", () => resolve(s));
    });
    try {
      const siteOrigin = `http://127.0.0.1:${siteServer.address().port}`;
      const url = new URL(dest, siteOrigin);
      assert.equal(url.origin, siteOrigin);
      assert.equal(url.pathname + url.search, "//other.example/about.html?x=1");
      const served = await fetch(url);
      assert.equal(served.status, 200);
      assert.equal(await served.text(), "<p>about</p>");
    } finally {
      await new Promise((resolve) => siteServer.close(resolve));
    }
  });

  it("404s another project's export without telling the viewer", async () => {
    const res = await get(`${OTHER_FOLDER}-v1/index.html`);
    assert.equal(res.status, 404);
    assert.equal(shown.length, 0);
  });

  for (const [name, make] of [
    ["no viewer", () => undefined],
    ["a viewer that is not ready", () => makeViewer({ isReady: () => false })],
    ["a viewer with no address", () => makeViewer({ baseUrlFor: () => null })],
  ]) {
    it(`serves the file itself with ${name}`, async () => {
      viewer = make();
      const { dir } = await newExport({ sitePath: "/" });
      const res = await get(`${dir}/about.html`);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "<p>about</p>");
      assert.equal(shown.length, 0);
    });
  }
});
