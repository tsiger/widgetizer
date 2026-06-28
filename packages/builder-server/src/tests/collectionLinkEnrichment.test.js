/**
 * Collection link-integrity test suite.
 *
 * Covers the linkEnrichment.js functions that walk collection items on disk:
 *  - cleanupDeletedPageReferences: clear pageUuid link refs + sync media usage
 *  - cleanupDeletedCollectionItemReferences: clear menu/widget/item refs in bulk
 *  - enrichNewProjectReferences: convert slug-format link hrefs to pageUuid refs
 *  - remapDuplicatedProjectUuids: remap pageUuid refs, regenerate item uuids, and
 *    remap stable collectionItemUuid refs in menus/widgets
 *
 * Collection item files are written under
 * getProjectDir(folder)/collections/<type>/<slug>.json. Media usage is keyed by
 * projectId, and collectionItemUuid remapping is exercised directly here and
 * indirectly through preset seeding.
 *
 * Run with: node --test packages/builder-server/src/tests/collectionLinkEnrichment.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-coll-link-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getProjectDir, getProjectPagesDir, getProjectMenusDir } = await import("../config.js");
const {
  cleanupDeletedPageReferences,
  cleanupDeletedCollectionItemReferences,
  enrichNewProjectReferences,
  remapDuplicatedProjectUuids,
  remapCollectionItemMenuRefs,
  remapCollectionItemLinkRefs,
} = await import("../utils/linkEnrichment.js");
const { updateCollectionItemMediaUsage, getMediaUsage } = await import(
  "../services/mediaUsageService.js"
);
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { closeDb } = await import("../db/index.js");

const PROJECT_ID = "coll-link-uuid";
const PROJECT_FOLDER = "coll-link-project";

function itemPath(type, slug) {
  return path.join(getProjectDir(PROJECT_FOLDER), "collections", type, `${slug}.json`);
}

async function writeItem(type, slug, settings, extra = {}) {
  await fs.outputJSON(itemPath(type, slug), {
    id: slug,
    uuid: `item-${slug}`,
    slug,
    settings,
    ...extra,
  });
}
async function readItem(type, slug) {
  return fs.readJSON(itemPath(type, slug));
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

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Link Test",
        theme: "__t__",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

beforeEach(async () => {
  await fs.remove(getProjectDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
});

// ============================================================================
// cleanupDeletedPageReferences — collection items
// ============================================================================

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
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, ["collection:portfolio/alpha"]);

    await cleanupDeletedPageReferences(PROJECT_FOLDER, "DELETED", PROJECT_ID);
    assert.deepEqual((await getMediaUsage(PROJECT_ID, "f1")).usedIn, []);
  });
});

// ============================================================================
// Richtext stable links - integrity wiring
// ============================================================================

describe("richtext stable links — integrity wiring", () => {
  it("unwraps a richtext anchor pointing at a deleted page (cleanup)", async () => {
    await writePageWidgets("home", "home-uuid", {
      w1: { type: "text", settings: { body: '<p>see <a href="x.html" data-page-uuid="DELETED">our page</a> now</p>' } },
    });
    await cleanupDeletedPageReferences(PROJECT_FOLDER, "DELETED");
    assert.equal((await readPage("home")).widgets.w1.settings.body, "<p>see our page now</p>");
  });

  it("unwraps a richtext anchor pointing at a deleted collection item (cleanup)", async () => {
    await writePageWidgets("home", "home-uuid", {
      w1: { type: "text", settings: { body: '<a href="news/x.html" data-collection-item-uuid="item-gone">x</a>' } },
    });
    await cleanupDeletedCollectionItemReferences(PROJECT_FOLDER, "item-gone");
    assert.equal((await readPage("home")).widgets.w1.settings.body, "x");
  });

  it("stamps data-page-uuid on a richtext page-link from its href slug (enrich)", async () => {
    await writePage("about", "about-uuid");
    await writePageWidgets("home", "home-uuid", {
      w1: { type: "text", settings: { body: '<a href="about.html">About</a>' } },
    });
    await enrichNewProjectReferences(getProjectPagesDir(PROJECT_FOLDER), getProjectMenusDir(PROJECT_FOLDER));
    assert.ok((await readPage("home")).widgets.w1.settings.body.includes('data-page-uuid="about-uuid"'));
  });

  it("remaps a richtext anchor uuid on project duplication (remap)", async () => {
    await writePageWidgets("home", "OLD-PAGE", {
      w1: { type: "text", settings: { body: '<a data-page-uuid="OLD-PAGE">x</a>' } },
    });
    await remapDuplicatedProjectUuids(PROJECT_FOLDER);
    const page = await readPage("home");
    assert.ok(page.widgets.w1.settings.body.includes(`data-page-uuid="${page.uuid}"`));
    assert.ok(!page.widgets.w1.settings.body.includes("OLD-PAGE"));
  });
});

// ============================================================================
// cleanupDeletedCollectionItemReferences — menu / widget / item refs
// ============================================================================

describe("cleanupDeletedCollectionItemReferences — menu refs", () => {
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

// ============================================================================
// enrichNewProjectReferences — collection items
// ============================================================================

describe("enrichNewProjectReferences — collection items", () => {
  it("converts a slug-format link href into a pageUuid", async () => {
    await writePage("about", "page-about-uuid");
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      cta: { href: "about.html", text: "About", target: "_self" },
    });
    // The collections dir is derived by the function as a sibling of pagesDir.
    await enrichNewProjectReferences(getProjectPagesDir(PROJECT_FOLDER), getProjectMenusDir(PROJECT_FOLDER));
    const item = await readItem("portfolio", "alpha");
    assert.equal(item.settings.cta.pageUuid, "page-about-uuid");
  });
});

// ============================================================================
// remapDuplicatedProjectUuids — collection items
// ============================================================================

describe("remapDuplicatedProjectUuids — collection items", () => {
  it("remaps pageUuid refs and regenerates each item's own uuid", async () => {
    await writePage("about", "old-page-uuid");
    await writeItem("portfolio", "alpha", {
      title: "Alpha",
      cta: { pageUuid: "old-page-uuid", href: "", text: "About", target: "_self" },
    });

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const newPage = await readPage("about");
    const item = await readItem("portfolio", "alpha");
    assert.notEqual(newPage.uuid, "old-page-uuid"); // page uuid regenerated
    assert.equal(item.settings.cta.pageUuid, newPage.uuid); // ref remapped to new page uuid
    assert.notEqual(item.uuid, "item-alpha"); // item's own uuid regenerated
  });

  it("remaps a menu's collectionItemUuid to the item's new uuid", async () => {
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

  it("remaps a widget link setting's collectionItemUuid to the item's new uuid", async () => {
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

// ============================================================================
// remapCollectionItemMenuRefs / remapCollectionItemLinkRefs
//
// The preset-seeding remap pair: a preset's menus/widgets/items may carry stable
// collectionItemUuid refs against the preset's OWN item uuids, which are
// regenerated on seed, so the refs must follow the source-to-seeded uuid map.
// Exercised indirectly via preset seeding + duplication; these block them directly.
// ============================================================================

describe("remapCollectionItemMenuRefs", () => {
  it("remaps matching menu collectionItemUuid refs (incl. nested) and leaves unknown ones intact", async () => {
    await writeMenu("main", [
      { id: "i1", label: "Suite", link: "rooms/suite.html", collectionItemUuid: "old-suite" },
      { id: "i2", label: "Other", link: "rooms/other.html", collectionItemUuid: "stays-as-is" },
      {
        id: "i3",
        label: "Group",
        items: [{ id: "i3a", label: "Deluxe", link: "rooms/deluxe.html", collectionItemUuid: "old-deluxe" }],
      },
    ]);

    await remapCollectionItemMenuRefs(
      PROJECT_FOLDER,
      new Map([
        ["old-suite", "new-suite"],
        ["old-deluxe", "new-deluxe"],
      ]),
    );

    const menu = await readMenu("main");
    assert.equal(menu.items[0].collectionItemUuid, "new-suite"); // matched -> remapped
    assert.equal(menu.items[1].collectionItemUuid, "stays-as-is"); // unknown -> untouched
    assert.equal(menu.items[2].items[0].collectionItemUuid, "new-deluxe"); // nested -> remapped
  });

  it("is a no-op for an empty map", async () => {
    await writeMenu("main", [{ id: "i1", label: "Suite", collectionItemUuid: "old-suite" }]);
    await remapCollectionItemMenuRefs(PROJECT_FOLDER, new Map());
    assert.equal((await readMenu("main")).items[0].collectionItemUuid, "old-suite");
  });

  it("does not throw when the menus dir is absent", async () => {
    await fs.remove(getProjectMenusDir(PROJECT_FOLDER));
    await remapCollectionItemMenuRefs(PROJECT_FOLDER, new Map([["old", "new"]]));
  });
});

describe("remapCollectionItemLinkRefs", () => {
  // isLinkObject requires an `href` key; only href-bearing link settings carrying a
  // collectionItemUuid are remapped.
  const link = (collectionItemUuid) => ({ href: "rooms/x.html", text: "X", target: "_self", collectionItemUuid });

  it("remaps collectionItemUuid in page widget, global widget, and collection-item link settings", async () => {
    await writePageWidgets("home", "page-home", {
      w1: { type: "hero", settings: { cta: link("old-1") } },
    });
    await fs.outputJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), "global", "header.json"), {
      settings: { cta: link("old-1") },
    });
    await writeItem("rooms", "suite", { title: "Suite", cta: link("old-1") });

    await remapCollectionItemLinkRefs(PROJECT_FOLDER, new Map([["old-1", "new-1"]]));

    assert.equal((await readPage("home")).widgets.w1.settings.cta.collectionItemUuid, "new-1");
    const header = await fs.readJSON(path.join(getProjectPagesDir(PROJECT_FOLDER), "global", "header.json"));
    assert.equal(header.settings.cta.collectionItemUuid, "new-1");
    assert.equal((await readItem("rooms", "suite")).settings.cta.collectionItemUuid, "new-1");
  });

  it("leaves an unknown collectionItemUuid intact", async () => {
    await writePageWidgets("home", "page-home", { w1: { type: "hero", settings: { cta: link("not-in-map") } } });
    await remapCollectionItemLinkRefs(PROJECT_FOLDER, new Map([["old-1", "new-1"]]));
    assert.equal((await readPage("home")).widgets.w1.settings.cta.collectionItemUuid, "not-in-map");
  });

  it("does not touch a non-link value (no href) that happens to carry a collectionItemUuid", async () => {
    // No `href` -> not a link object -> the guard must skip it.
    await writeItem("rooms", "suite", { title: "Suite", meta: { collectionItemUuid: "old-1", note: "not a link" } });
    await remapCollectionItemLinkRefs(PROJECT_FOLDER, new Map([["old-1", "new-1"]]));
    assert.equal((await readItem("rooms", "suite")).settings.meta.collectionItemUuid, "old-1");
  });
});
