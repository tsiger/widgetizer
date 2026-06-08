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

const { getProjectDir, getProjectPagesDir, getProjectCollectionItemPath, getProjectMenusDir } =
  await import("../config.js");
const {
  cleanupDeletedPageReferences,
  cleanupDeletedCollectionItemReferences,
  enrichNewProjectReferences,
  remapDuplicatedProjectUuids,
  remapCollectionItemLinkRefs,
} = await import("../utils/linkEnrichment.js");
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
async function writePageWidgets(slug, uuid, widgets) {
  await fs.outputJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`), {
    id: slug,
    slug,
    uuid,
    widgets,
  });
}
async function readPage(slug) {
  return fs.readJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`));
}
async function writeMenu(menuId, items, uuid = `menu-${menuId}`) {
  await fs.outputJSON(path.join(getProjectMenusDir(PROJECT_FOLDER), `${menuId}.json`), {
    id: menuId,
    uuid,
    name: menuId,
    items,
  });
}
async function readMenu(menuId) {
  return fs.readJSON(path.join(getProjectMenusDir(PROJECT_FOLDER), `${menuId}.json`));
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

describe("cleanupDeletedCollectionItemReferences — menu refs (#11)", () => {
  it("clears menu items pointing at the deleted item, leaves other refs intact", async () => {
    await writeMenu("main", [
      { id: "i1", label: "Suite", link: "rooms/suite.html", collectionType: "rooms", collectionItemUuid: "item-suite" },
      { id: "i2", label: "Villa", link: "rooms/villa.html", collectionType: "rooms", collectionItemUuid: "item-villa" },
      { id: "i3", label: "About", link: "about.html", pageUuid: "page-about" },
    ]);

    await cleanupDeletedCollectionItemReferences(PROJECT_FOLDER, "item-suite");

    const menu = await readMenu("main");
    assert.equal(menu.items[0].link, "");
    assert.equal("collectionItemUuid" in menu.items[0], false);
    assert.equal("collectionType" in menu.items[0], false);
    assert.equal(menu.items[1].collectionItemUuid, "item-villa"); // untouched
    assert.equal(menu.items[2].pageUuid, "page-about"); // untouched
  });

  it("accepts multiple uuids (bulk delete)", async () => {
    await writeMenu("main", [
      { id: "i1", label: "A", link: "rooms/a.html", collectionItemUuid: "item-a" },
      { id: "i2", label: "B", link: "rooms/b.html", collectionItemUuid: "item-b" },
    ]);
    await cleanupDeletedCollectionItemReferences(PROJECT_FOLDER, ["item-a", "item-b"]);
    const menu = await readMenu("main");
    assert.equal(menu.items[0].link, "");
    assert.equal(menu.items[1].link, "");
  });

  it("clears a widget link setting pointing at the deleted item", async () => {
    await writePageWidgets("home", "page-home", {
      w1: {
        type: "hero",
        settings: {
          cta: { collectionType: "rooms", collectionItemUuid: "item-suite", href: "rooms/suite.html", text: "Suite", target: "_self" },
          keep: { collectionItemUuid: "item-villa", href: "rooms/villa.html", text: "Villa", target: "_self" },
        },
      },
    });
    await cleanupDeletedCollectionItemReferences(PROJECT_FOLDER, "item-suite");
    const page = await readPage("home");
    assert.deepEqual(page.widgets.w1.settings.cta, { href: "", text: "", target: "_self" });
    assert.equal(page.widgets.w1.settings.keep.collectionItemUuid, "item-villa"); // untouched
  });

  it("clears a collection-item link setting pointing at the deleted item", async () => {
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      related: { collectionType: "rooms", collectionItemUuid: "item-suite", href: "rooms/suite.html", text: "Suite", target: "_self" },
    });
    await cleanupDeletedCollectionItemReferences(PROJECT_FOLDER, "item-suite");
    const item = await readItem("portfolio", "alpha");
    assert.deepEqual(item.settings.related, { href: "", text: "", target: "_self" });
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

  it("remaps a menu's collectionItemUuid to the item's new uuid (#11)", async () => {
    await writeItem("rooms", "suite", { title: "Suite" }); // uuid item-suite
    await writeMenu("main", [
      { id: "i1", label: "Suite", link: "rooms/suite.html", collectionType: "rooms", collectionItemUuid: "item-suite" },
    ]);

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const item = await readItem("rooms", "suite");
    const menu = await readMenu("main");
    assert.notEqual(item.uuid, "item-suite"); // item uuid regenerated
    assert.equal(menu.items[0].collectionItemUuid, item.uuid); // menu ref remapped to new uuid
  });

  it("remaps a widget link setting's collectionItemUuid to the item's new uuid (#11)", async () => {
    await writeItem("rooms", "suite", { title: "Suite" }); // uuid item-suite
    await writePageWidgets("home", "page-home", {
      w1: {
        type: "hero",
        settings: { cta: { collectionType: "rooms", collectionItemUuid: "item-suite", href: "rooms/suite.html", text: "Suite", target: "_self" } },
      },
    });

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const item = await readItem("rooms", "suite");
    const page = await readPage("home");
    assert.notEqual(item.uuid, "item-suite"); // item uuid regenerated
    assert.equal(page.widgets.w1.settings.cta.collectionItemUuid, item.uuid); // widget ref remapped
  });
});

describe("remapCollectionItemLinkRefs — preset link refs (#11)", () => {
  it("remaps widget + collection-item link collectionItemUuid via the map", async () => {
    await writePageWidgets("home", "page-home", {
      w1: {
        type: "hero",
        settings: { cta: { collectionType: "rooms", collectionItemUuid: "old-uuid", href: "rooms/suite.html", text: "Suite", target: "_self" } },
      },
    });
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      related: { collectionType: "rooms", collectionItemUuid: "old-uuid", href: "rooms/suite.html", text: "Suite", target: "_self" },
    });

    await remapCollectionItemLinkRefs(PROJECT_FOLDER, new Map([["old-uuid", "new-uuid"]]));

    const page = await readPage("home");
    const item = await readItem("portfolio", "alpha");
    assert.equal(page.widgets.w1.settings.cta.collectionItemUuid, "new-uuid");
    assert.equal(item.settings.related.collectionItemUuid, "new-uuid");
  });
});
