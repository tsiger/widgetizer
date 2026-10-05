/**
 * Export reads paths and slugs that can come from a backup made elsewhere: the
 * media library's file paths and each collection item's stored slug. A crafted
 * value must not copy a file from outside the project into the published site,
 * nor write an item page outside its collection folder.
 *
 * Run with: node --test packages/builder-server/src/tests/exportPathContainment.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "containment-export-uuid";
const PROJECT_FOLDER = "containment-export-project";
const SECRET = "secret-outside-the-project";

const { storage, scope, getProjectDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-export-containment-test",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://containment.example.com",
    projectName: "Containment Project",
    siteTitle: "Containment",
    theme: "__containment_theme__",
  });
const { writeMediaFile } = await import("../controllers/mediaController.js");

const projectDir = () => getProjectDir(PROJECT_FOLDER);
// `/uploads/images/../../../secret.txt` resolves to the folder holding the projects.
const secretPath = () => path.join(path.dirname(projectDir()), "secret.txt");

/** Every file under `dir`, recursively. */
async function filesUnder(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(full)));
    else out.push(full);
  }
  return out;
}

before(async () => {
  await seedProjectScaffold();
  await fs.outputFile(secretPath(), SECRET);
});

after(async () => {
  await cleanup();
});

describe("media paths outside the project's uploads", () => {
  let exportDir;

  before(async () => {
    await resetExports();
    await fs.outputFile(path.join(projectDir(), "uploads", "images", "real.jpg"), "real-image");
    await fs.outputFile(path.join(projectDir(), "uploads", "images", "real-large.jpg"), "real-large");
    await fs.outputFile(path.join(projectDir(), "uploads", "files", "real.pdf"), "real-pdf");
    await writeMediaFile(PROJECT_ID, {
      files: [
        {
          id: "real",
          filename: "real.jpg",
          path: "/uploads/images/real.jpg",
          type: "image/jpeg",
          usedIn: ["page:index"],
          sizes: { large: { path: "/uploads/images/real-large.jpg", width: 1600, height: 900 } },
        },
        {
          id: "escaping-original",
          filename: "secret.txt",
          path: "/uploads/images/../../../secret.txt",
          type: "image/svg+xml",
          usedIn: ["page:index"],
        },
        {
          id: "escaping-size",
          filename: "decoy.jpg",
          path: "/uploads/images/decoy.jpg",
          type: "image/jpeg",
          usedIn: ["page:index"],
          sizes: { large: { path: "/uploads/images/../../../secret.txt", width: 1, height: 1 } },
        },
        { id: "real-file", filename: "real.pdf", path: "/uploads/files/real.pdf", type: "application/pdf", usedIn: ["page:index"] },
        {
          id: "escaping-file",
          filename: "secret.txt",
          path: "/uploads/files/../../../secret.txt",
          type: "application/pdf",
          usedIn: ["page:index"],
        },
      ],
    });
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    exportDir = await latestExportDir();
  });

  it("copies no file from outside the project", async () => {
    for (const file of await filesUnder(exportDir)) {
      assert.notEqual(await fs.readFile(file, "utf8"), SECRET, `leaked into ${path.relative(exportDir, file)}`);
    }
  });

  it("still copies the project's own images, sizes and files", async () => {
    assert.equal(await fs.readFile(path.join(exportDir, "assets", "images", "real-large.jpg"), "utf8"), "real-large");
    assert.equal(await fs.readFile(path.join(exportDir, "assets", "files", "real.pdf"), "utf8"), "real-pdf");
  });
});

describe("a collection item whose stored slug steps outside its folder", () => {
  let exportDir;

  before(async () => {
    await resetExports();
    await storage.write(
      scope,
      "collection-types/news/schema.json",
      JSON.stringify({
        type: "news",
        schemaVersion: 1,
        displayName: "News",
        displayNamePlural: "News",
        hasItemPages: true,
        slugPrefix: "news",
        defaultSort: "manual",
        settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
      }),
    );
    await storage.write(scope, "collection-types/news/template.liquid", "<h1>{{ item.settings.title }}</h1>");
    const item = (slug, uuid) => ({ id: slug, uuid, slug, schemaVersion: 1, created: "2026-01-01T00:00:00.000Z", settings: { title: uuid } });
    await storage.write(scope, "collections/news/fine.json", JSON.stringify(item("fine", "u-fine")));
    // The filename is harmless; the slug inside it is what export writes by.
    await storage.write(scope, "collections/news/sneaky.json", JSON.stringify(item("../../../escaped-item", "u-sneaky")));
    const res = await runExport();
    assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
    exportDir = await latestExportDir();
  });

  it("writes nothing outside the collection's folder", async () => {
    const publishRoot = path.dirname(exportDir);
    for (const candidate of [
      path.join(exportDir, "escaped-item.html"),
      path.join(publishRoot, "escaped-item.html"),
      path.join(path.dirname(publishRoot), "escaped-item.html"),
    ]) {
      assert.equal(await fs.pathExists(candidate), false, candidate);
    }
  });

  it("still publishes the collection's ordinary items", async () => {
    assert.equal(await fs.pathExists(path.join(exportDir, "news", "fine.html")), true);
  });
});
