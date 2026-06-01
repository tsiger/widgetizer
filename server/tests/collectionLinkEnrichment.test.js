/**
 * Collection link-integrity test suite (Phase 7).
 *
 * Covers the linkEnrichment.js extensions that walk collection items:
 *  - cleanupDeletedPageReferences: clear pageUuid link refs + sync media usage
 *  - enrichNewProjectReferences: slug-format link -> pageUuid
 *  - remapDuplicatedProjectUuids: remap pageUuid refs + regenerate item uuid
 *
 * Run with: node --test server/tests/collectionLinkEnrichment.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-coll-link-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const { getProjectDir, getProjectPagesDir, getProjectCollectionItemPath } = await import(
  "../config.js"
);
const { cleanupDeletedPageReferences, enrichNewProjectReferences, remapDuplicatedProjectUuids } =
  await import("../utils/linkEnrichment.js");
const { updateCollectionItemMediaUsage } = await import("../services/mediaUsageService.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { readMediaFile } = await import("../services/mediaService.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "coll-link-uuid";
const PROJECT_FOLDER = "coll-link-project";

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Link Test", theme: "__t__", created: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
});
after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
  console.warn = _origWarn;
});
beforeEach(async () => {
  await fs.remove(getProjectDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
});

async function writeItem(type, slug, settings, extra = {}) {
  await fs.outputJSON(getProjectCollectionItemPath(PROJECT_FOLDER, type, slug), {
    id: slug,
    uuid: `item-${slug}`,
    slug,
    settings,
    ...extra,
  });
}
async function readItem(type, slug) {
  return fs.readJSON(getProjectCollectionItemPath(PROJECT_FOLDER, type, slug));
}
async function writePage(slug, uuid) {
  await fs.outputJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`), {
    id: slug,
    slug,
    uuid,
    widgets: {},
  });
}

describe("cleanupDeletedPageReferences — collection items", () => {
  it("clears link settings that point to the deleted page", async () => {
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      cta: { pageUuid: "DELETED", href: "", text: "Go", target: "_self" },
      other: { pageUuid: "KEEP", href: "", text: "Stay", target: "_self" },
    });
    await cleanupDeletedPageReferences(PROJECT_FOLDER, "DELETED");
    const item = await readItem("portfolio", "alpha");
    assert.deepEqual(item.settings.cta, { href: "", text: "", target: "_self" });
    assert.equal(item.settings.other.pageUuid, "KEEP"); // untouched
  });

  it("syncs media usage after clearing a link (projectId provided)", async () => {
    await writeMediaFile(PROJECT_ID, {
      files: [{ id: "f1", filename: "x.pdf", path: "/uploads/files/x.pdf", type: "application/pdf", usedIn: [] }],
    });
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      doc: { pageUuid: "DELETED", href: "/uploads/files/x.pdf", text: "Doc", target: "_self" },
    });
    // seed usage to reflect the link's upload reference
    await updateCollectionItemMediaUsage(PROJECT_ID, "portfolio", "alpha", await readItem("portfolio", "alpha"));
    assert.deepEqual((await readMediaFile(PROJECT_ID)).files[0].usedIn, ["collection:portfolio/alpha"]);

    await cleanupDeletedPageReferences(PROJECT_FOLDER, "DELETED", PROJECT_ID);
    assert.deepEqual((await readMediaFile(PROJECT_ID)).files[0].usedIn, []);
  });
});

describe("enrichNewProjectReferences — collection items", () => {
  it("converts a slug-format link href into a pageUuid", async () => {
    await writePage("about", "page-about-uuid");
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      cta: { href: "about.html", text: "About", target: "_self" },
    });
    await enrichNewProjectReferences(PROJECT_FOLDER);
    const item = await readItem("portfolio", "alpha");
    assert.equal(item.settings.cta.pageUuid, "page-about-uuid");
  });
});

describe("remapDuplicatedProjectUuids — collection items", () => {
  it("remaps pageUuid refs and regenerates each item's own uuid", async () => {
    await writePage("about", "old-page-uuid");
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      cta: { pageUuid: "old-page-uuid", href: "", text: "About", target: "_self" },
    });

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const newPage = await fs.readJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"));
    const item = await readItem("portfolio", "alpha");
    assert.notEqual(newPage.uuid, "old-page-uuid"); // page uuid regenerated
    assert.equal(item.settings.cta.pageUuid, newPage.uuid); // ref remapped to new page uuid
    assert.notEqual(item.uuid, "item-alpha"); // item's own uuid regenerated
  });
});
