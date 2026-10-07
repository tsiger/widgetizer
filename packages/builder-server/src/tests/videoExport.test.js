/**
 * Exporting a site that plays an uploaded MP4.
 *
 * A two-language project renders Arch's video-embed on its root page and on a
 * translated page one folder down. Usage comes from a real refresh of the saved
 * pages, not hand-written rows, so the export copies exactly what the content
 * uses — byte for byte, with each page pointing at it from its own depth — and
 * the downloadable ZIP carries the same files.
 *
 * Run with: node --test packages/builder-server/src/tests/videoExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { PassThrough } from "stream";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "video-export-uuid";
const PROJECT_FOLDER = "video-export-project";
const ARCH = fileURLToPath(new URL("../../../../themes/arch/", import.meta.url));

const { projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-video-export",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://video.example.com",
    projectName: "Video Export",
    siteTitle: "Video Export",
    theme: "arch",
  });
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { downloadExport } = await import("../controllers/exportController.js");
const { refreshAllMediaUsage } = await import("../services/mediaUsageService.js");
const { readMediaFile } = await import("../services/mediaService.js");

const TOUR_BYTES = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(2048, 7)]);

const videoPage = (uuid, name) => ({
  uuid,
  slug: "index",
  name,
  seo: { title: name },
  widgets: {
    video: {
      type: "video-embed",
      settings: { video_file: "/uploads/files/tour.mp4", poster: "/uploads/images/poster.jpg", video_url: "" },
    },
  },
  widgetsOrder: ["video"],
});

let exportDir;

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.copy(path.join(ARCH, "widgets", "video-embed"), path.join(projectDir, "widgets", "video-embed"));
  await fs.copy(path.join(ARCH, "locales"), path.join(projectDir, "locales"));

  await fs.outputFile(path.join(projectDir, "uploads", "files", "tour.mp4"), TOUR_BYTES);
  await fs.outputFile(path.join(projectDir, "uploads", "files", "unused.mp4"), "unused");
  await fs.outputFile(path.join(projectDir, "uploads", "images", "poster.jpg"), "poster");
  await writeMediaFile(PROJECT_ID, {
    files: [
      { id: "tour", filename: "tour.mp4", path: "/uploads/files/tour.mp4", type: "video/mp4", usedIn: [] },
      { id: "unused", filename: "unused.mp4", path: "/uploads/files/unused.mp4", type: "video/mp4", usedIn: [] },
      { id: "poster", filename: "poster.jpg", path: "/uploads/images/poster.jpg", type: "image/jpeg", usedIn: [], sizes: {} },
    ],
  });

  const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputJson(path.join(pagesDir, "index.json"), videoPage("p-en-index", "Home"));
  await fs.outputJson(path.join(pagesDir, "el", "index.json"), videoPage("p-el-index", "Arxiki"));
  await refreshAllMediaUsage(PROJECT_ID);

  await resetExports();
  const res = await runExport();
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  exportDir = latestExportDir();
});

after(async () => {
  await cleanup();
});

const videoTag = (html) => html.match(/<video[\s\S]*?<\/video>/)?.[0] ?? "";

describe("exporting an uploaded MP4", () => {
  it("tracks the video as used by both language versions, and the spare one as unused", async () => {
    const files = (await readMediaFile(PROJECT_ID)).files;
    assert.deepEqual([...files.find((f) => f.id === "tour").usedIn].sort(), ["page:p-el-index", "page:p-en-index"]);
    assert.deepEqual(files.find((f) => f.id === "unused").usedIn, []);
  });

  it("copies the used video byte for byte and leaves the unused one out", async () => {
    assert.deepEqual(await fs.readFile(path.join(exportDir, "assets", "files", "tour.mp4")), TOUR_BYTES);
    assert.equal(await fs.pathExists(path.join(exportDir, "assets", "files", "unused.mp4")), false);
    assert.ok(await fs.pathExists(path.join(exportDir, "assets", "video-embed.js")), "the playback-error script ships too");
  });

  it("points each page at the copy from its own folder", async () => {
    const root = videoTag(await fs.readFile(path.join(exportDir, "index.html"), "utf8"));
    assert.ok(root.includes('src="assets/files/tour.mp4"'), root);
    assert.ok(root.includes('poster="assets/images/poster.jpg"'), root);

    const greekHtml = await fs.readFile(path.join(exportDir, "el", "index.html"), "utf8");
    const greek = videoTag(greekHtml);
    assert.ok(greek.includes('src="../assets/files/tour.mp4"'), greek);
    assert.ok(greek.includes('poster="../assets/images/poster.jpg"'), greek);
    assert.ok(greekHtml.includes("Δεν είναι δυνατή η αναπαραγωγή"), "the playback message is in the page's language");

    for (const html of [root, greek]) {
      assert.ok(!html.includes("/uploads/"), html);
      assert.ok(!html.includes("/api/media/"), html);
    }
  });

  it("puts the same video in the downloadable ZIP", async () => {
    const res = new PassThrough();
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve) => res.on("end", resolve));
    Object.assign(res, { headersSent: false, setHeader() {}, status() { return res; }, json() { return res; } });

    await downloadExport(
      { params: { exportDir: path.basename(exportDir) }, scope: { projectId: PROJECT_ID, folderName: PROJECT_FOLDER } },
      res,
    );
    await finished;

    const zip = new AdmZip(Buffer.concat(chunks));
    const names = zip.getEntries().map((entry) => entry.entryName.replaceAll("\\", "/"));
    assert.deepEqual(zip.readFile("assets/files/tour.mp4"), TOUR_BYTES);
    assert.ok(!names.includes("assets/files/unused.mp4"));
    assert.ok(names.includes("el/index.html"));
  });
});
