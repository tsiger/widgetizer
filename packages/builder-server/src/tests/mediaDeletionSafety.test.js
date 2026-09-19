/**
 * Media deletion safety.
 *
 * The rule under test: an image is never deleted while saved content still
 * references it. Usage rows are derived data kept up to date by a best-effort sync
 * after each write, so they can be behind; deletion therefore re-derives usage
 * instead of trusting them, refuses when it cannot finish deriving, and runs in a
 * section no content write can interleave with.
 *
 * The cases here are the ones the rows alone cannot survive:
 *   1. the usage sync failed, so the row is missing while the page references the file
 *   2. content cannot be read, so "no usage found" is not a fact
 *   3. a save and a delete overlap
 *   4. a save queued behind a delete tries to introduce the reference afterwards
 *
 * Run with: node --test packages/builder-server/src/tests/mediaDeletionSafety.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-media-safety-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir, getProjectImagesDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const mediaRepo = await import("../db/repositories/mediaRepository.js");
const { deleteProjectMedia, bulkDeleteProjectMedia, refreshMediaUsage } = await import(
  "../controllers/mediaController.js"
);
const { savePageContent, updatePage } = await import("../controllers/pageController.js");
const { updateProject } = await import("../controllers/projectController.js");
const collectionController = await import("../controllers/collectionController.js");
const { clearDeletedMediaPaths, recordDeletedMediaPaths, withMediaLock } = await import(
  "../services/mediaCoordination.js"
);
const { closeDb } = await import("../db/index.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "media-safety-uuid";
const PROJECT_FOLDER = "media-safety-project";
const IMAGE_NAME = "shared-photo.jpg";
const IMAGE_PATH = `/uploads/images/${IMAGE_NAME}`;
const FILE_ID = "file-shared-photo";

const assetStorage = new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR });
const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

after(async () => {
  console.warn = _origWarn;
  console.error = _origError;
  closeDb();
  await fs.remove(TEST_ROOT);
});

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
    setHeader() {
      return res;
    },
    // The collection handlers set Cache-Control through Express's res.set.
    set() {
      return res;
    },
  };
  return res;
}

const limits = { getLimit: async () => Infinity };

function mockReq({ params = {}, body = {}, query = {}, storageOverride = null } = {}) {
  return {
    params,
    body,
    query,
    scope,
    activeProject: projectRepo.getProjectById(PROJECT_ID),
    adapters: { assetStorage, storage: storageOverride || storage, limits },
    app: { locals: {} },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

async function call(fn, args) {
  const res = mockRes();
  await fn(mockReq(args), res);
  return res;
}

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { id: "title", type: "text", usedAsTitle: true, required: true },
    { id: "photo", type: "image" },
  ],
};

/** A page whose widget points at IMAGE_PATH. */
const pageReferencingImage = (slug) => ({
  uuid: `uuid-${slug}`,
  slug,
  name: slug,
  title: slug,
  widgets: { widget_1: { type: "hero", settings: { image: IMAGE_PATH } } },
  widgetsOrder: ["widget_1"],
});

/** A page with no media at all. */
const plainPage = (slug) => ({
  uuid: `uuid-${slug}`,
  slug,
  name: slug,
  title: slug,
  widgets: { widget_1: { type: "text", settings: { body: "hello" } } },
  widgetsOrder: ["widget_1"],
});

async function writePage(pageData, { language = "" } = {}) {
  const dir = path.join(getProjectPagesDir(PROJECT_FOLDER), language);
  await fs.ensureDir(dir);
  await fs.writeJson(path.join(dir, `${pageData.slug}.json`), pageData, { spaces: 2 });
}

/** Register the media record and put real bytes where the asset adapter expects them. */
async function seedMediaFile() {
  await fs.ensureDir(getProjectImagesDir(PROJECT_FOLDER));
  await fs.writeFile(path.join(getProjectImagesDir(PROJECT_FOLDER), IMAGE_NAME), Buffer.from("jpegbytes"));
  mediaRepo.addMediaFile(PROJECT_ID, {
    id: FILE_ID,
    filename: IMAGE_NAME,
    originalName: IMAGE_NAME,
    path: IMAGE_PATH,
    type: "image/jpeg",
    size: 9,
    uploadedAt: new Date().toISOString(),
    metadata: { alt: "", title: "" },
    sizes: {},
  });
}

const imageStillOnDisk = () =>
  fs.pathExists(path.join(getProjectImagesDir(PROJECT_FOLDER), IMAGE_NAME));

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Media Safety Project",
        theme: "__media_safety_theme__",
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
  await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
});

beforeEach(async () => {
  // A clean project each time: no pages, no collection items, one registered
  // image, no tombstones. Content left behind by an earlier case would keep the
  // image legitimately in use and make the next delete refuse for the wrong reason.
  await fs.remove(getProjectPagesDir(PROJECT_FOLDER));
  await fs.ensureDir(getProjectPagesDir(PROJECT_FOLDER));
  await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
  // The identity is a media reference too — a logo left by an earlier case would
  // keep the image in use and make the next delete refuse for the wrong reason.
  projectRepo.updateProject(PROJECT_ID, { siteIdentity: {} });
  mediaRepo.deleteMediaFiles(PROJECT_ID, [FILE_ID]);
  clearDeletedMediaPaths(PROJECT_ID);
  await seedMediaFile();
});

// ============================================================================

describe("deleting an image the usage rows have lost track of", () => {
  it("refuses when saved content references it but no usage row does", async () => {
    // The page is on disk referencing the image, and the usage row never landed —
    // exactly what a save whose usage sync failed leaves behind. Trusting the rows
    // here is what used to delete an image a saved page still needed.
    await writePage(pageReferencingImage("about"));
    assert.deepEqual(mediaRepo.getMediaFileById(PROJECT_ID, FILE_ID).usedIn, [], "precondition: no usage row");

    const res = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    assert.equal(res._status, 400, "must refuse: the page still uses it");
    assert.ok(await imageStillOnDisk(), "the image must survive");
    assert.ok(res._json.usedIn.includes("page:uuid-about"), "and it must say which page");
  });

  it("finds a reference that lives only in another language", async () => {
    await writePage(plainPage("about"));
    await writePage(pageReferencingImage("about"), { language: "el" });

    const res = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    assert.equal(res._status, 400, "a Greek page counts just as much as an English one");
    assert.ok(await imageStillOnDisk());
  });

  it("still deletes an image nothing references", async () => {
    await writePage(plainPage("about"));

    const res = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    assert.equal(res._status, 200, "verification must not block ordinary deletion");
    assert.equal(await imageStillOnDisk(), false);
    assert.ok(!mediaRepo.getMediaFileById(PROJECT_ID, FILE_ID), "and its record is gone");
  });
});

describe("when usage cannot be verified", () => {
  it("refuses rather than reading an unreadable page as 'no usage found'", async () => {
    // A page that cannot be parsed contributes no references. That is
    // indistinguishable from a page that has none — and it could be the one
    // holding this image, so the answer is "we could not tell", not "unused".
    await fs.writeFile(path.join(getProjectPagesDir(PROJECT_FOLDER), "broken.json"), "{ not json");

    const res = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "MEDIA_USAGE_UNVERIFIED");
    assert.ok(res._json.skipped?.some((entry) => entry.source.includes("broken")), "names what it could not read");
    assert.ok(await imageStillOnDisk(), "nothing is deleted on an incomplete scan");
  });

  it("refuses the whole batch, deleting none of it", async () => {
    await fs.writeFile(path.join(getProjectPagesDir(PROJECT_FOLDER), "broken.json"), "{ not json");

    const res = await call(bulkDeleteProjectMedia, { body: { fileIds: [FILE_ID] } });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "MEDIA_USAGE_UNVERIFIED");
    assert.ok(await imageStillOnDisk());
  });
});

describe("recovering from a row that outlived its reference", () => {
  it("keeps honouring a stale 'in use' row until a refresh clears it", async () => {
    // Deletion deliberately honours a recorded row the rescan cannot confirm: a row
    // with no matching content blocks a delete, which is the harmless direction.
    // Refresh is the way out, so it has to actually be a way out.
    await writePage(plainPage("about"));
    mediaRepo.updateMediaUsageForSource(PROJECT_ID, "page:uuid-about", [FILE_ID]);
    assert.deepEqual(mediaRepo.getMediaFileById(PROJECT_ID, FILE_ID).usedIn, ["page:uuid-about"]);

    const blocked = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(blocked._status, 400, "the recorded row still protects the file");
    assert.ok(await imageStillOnDisk());

    const refreshed = await call(refreshMediaUsage, {});
    assert.equal(refreshed._status, 200);
    assert.deepEqual(
      mediaRepo.getMediaFileById(PROJECT_ID, FILE_ID).usedIn,
      [],
      "an explicit refresh must drop a row no content backs",
    );

    const allowed = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(allowed._status, 200, "and the file becomes deletable");
    assert.equal(await imageStillOnDisk(), false);
  });

  it("refuses to refresh away a row while the content backing it cannot be read", async () => {
    // The same reason deletion refuses: a page that will not parse contributes no
    // references, so a rebuild that counted it as empty would erase a true row.
    await writePage(pageReferencingImage("about"));
    await call(refreshMediaUsage, {});
    assert.deepEqual(mediaRepo.getMediaFileById(PROJECT_ID, FILE_ID).usedIn, ["page:uuid-about"]);

    await fs.writeFile(path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"), "{ not json");
    const res = await call(refreshMediaUsage, {});

    // The refresh itself still runs and reports what it skipped — it is a repair
    // tool, not a gate. What must not happen is a DELETE acting on its output.
    assert.ok(res._json.skipped?.length, "the refresh must report what it could not read");
    const afterward = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.notEqual(afterward._status, 200, "deletion must not act on an incomplete rebuild");
    assert.ok(await imageStillOnDisk());
  });
});

describe("a save overlapping a delete", () => {
  it("never leaves a saved page pointing at a deleted image", async () => {
    // Both start against the same state: the page does not use the image yet, so a
    // verification scan run now would find it unused. Whichever order they end up
    // in, the pair must not finish with the page referencing a file that is gone.
    await writePage(plainPage("about"));

    const save = call(savePageContent, {
      params: { id: "about" },
      body: { ...pageReferencingImage("about"), widgetsOrder: ["widget_1"] },
    });
    const del = call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    const [saveRes, delRes] = await Promise.all([save, del]);

    const onDisk = await imageStillOnDisk();
    const saved = await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"));
    const pageUsesImage = JSON.stringify(saved).includes(IMAGE_PATH);

    // The invariant, not the winner: either the delete stood down because the save
    // got there first, or the save was refused because the image had gone.
    if (pageUsesImage) {
      assert.ok(onDisk, "a page that references the image means the image must still exist");
      assert.notEqual(delRes._status, 200, "the delete must not have reported success");
    } else {
      assert.equal(saveRes._status, 409, "a save that could not keep the reference must say so");
      assert.equal(saveRes._json.code, "MEDIA_REFERENCE_MISSING");
    }
  });
});

describe("a save queued behind a completed delete", () => {
  it("refuses to introduce a reference to the image that was just deleted", async () => {
    // Ordering alone cannot help this one: by the time the save runs, the delete has
    // finished and its verification scan is long past. The save has to check.
    await writePage(plainPage("about"));

    const delRes = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(delRes._status, 200, "precondition: the image was unused and is now gone");

    const saveRes = await call(savePageContent, {
      params: { id: "about" },
      body: { ...pageReferencingImage("about"), widgetsOrder: ["widget_1"] },
    });

    assert.equal(saveRes._status, 409, "the save must not succeed in referencing a deleted image");
    assert.equal(saveRes._json.code, "MEDIA_REFERENCE_MISSING");

    const saved = await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"));
    assert.equal(JSON.stringify(saved).includes(IMAGE_PATH), false, "and must not have written the reference");
  });

  it("lets the save through once the same file is uploaded again", async () => {
    await writePage(plainPage("about"));
    await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    // Re-uploaded under the same name: the reference resolves again, so the
    // tombstone must stop blocking it.
    await seedMediaFile();

    const saveRes = await call(savePageContent, {
      params: { id: "about" },
      body: { ...pageReferencingImage("about"), widgetsOrder: ["widget_1"] },
    });

    assert.equal(saveRes._status, 200, "a restored file must not stay blocked forever");
  });
});

// ============================================================================
// Regressions from code review. Each of these passed review only because the
// check it depends on was reachable from one path and not another.
// ============================================================================

describe("a rejected save must not have moved anything first", () => {
  it("leaves the project's folder and row agreeing when the logo is refused", async () => {
    // The folder rename used to run before the media check. A refused logo then
    // left the directory already moved while the row still named the old folder,
    // which strands the project: nothing can find its content afterwards.
    await writePage(plainPage("about"));
    await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    const res = await call(updateProject, {
      params: { id: PROJECT_ID },
      body: {
        name: "Media Safety Project",
        description: "",
        folderName: "renamed-safety-project",
        siteIdentity: { logo: IMAGE_PATH },
      },
    });

    assert.equal(res._status, 409, "the deleted logo must be refused");
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");

    // The refusal must be total: nothing moved, nothing renamed.
    assert.equal(
      projectRepo.getProjectById(PROJECT_ID).folderName,
      PROJECT_FOLDER,
      "the row must still name the original folder",
    );
    assert.ok(await fs.pathExists(getProjectDir(PROJECT_FOLDER)), "the original folder must still be there");
    assert.equal(
      await fs.pathExists(getProjectDir("renamed-safety-project")),
      false,
      "and no renamed folder may have been left behind",
    );
  });
});

describe("a collection save whose baseline went stale", () => {
  it("refuses a reference that was removed and deleted while the save was in flight", async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
    await writePage(plainPage("about"));

    // An item that currently uses the image.
    const created = await call(collectionController.createItem, {
      params: { collectionType: "news" },
      body: { settings: { title: "Story", photo: IMAGE_PATH } },
    });
    assert.equal(created._status, 201, JSON.stringify(created._json));
    const slug = created._json.slug;

    // Pause the FIRST read of this item — the snapshot the request takes before it
    // holds the lock. The bytes are captured now (image still referenced) and handed
    // back only after the world has moved on, which is exactly the race: a baseline
    // that says "already present" makes the check skip the path entirely.
    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let paused = false;
    const itemKey = `collections/news/${slug}.json`;
    const pausingStorage = Object.create(storage);
    // Parameter named `scope` deliberately: it IS the scope being threaded, and the
    // repo's scope-first lint rule reads the argument's name.
    pausingStorage.read = async (scope, key) => {
      const data = await storage.read(scope, key);
      if (key === itemKey && !paused) {
        paused = true;
        await gate;
      }
      return data;
    };

    const inFlight = call(collectionController.updateItem, {
      params: { collectionType: "news", itemSlug: slug },
      body: { settings: { title: "Story", photo: IMAGE_PATH } },
      storageOverride: pausingStorage,
    });

    // While it is paused: drop the reference, then delete the now-unused image.
    const cleared = await call(collectionController.updateItem, {
      params: { collectionType: "news", itemSlug: slug },
      body: { settings: { title: "Story", photo: "" } },
    });
    assert.equal(cleared._status, 200);
    const deleted = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(deleted._status, 200, "precondition: the image is unused and gone");

    // Without this the test could pass vacuously, never having staged the race.
    assert.equal(paused, true, "the in-flight save must actually have been paused mid-read");

    releaseGate();
    const res = await inFlight;

    assert.equal(res._status, 409, "the stale snapshot must not let the reference back in");
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");

    const onDisk = JSON.parse((await storage.read(scope, itemKey)).toString("utf8"));
    assert.equal(JSON.stringify(onDisk).includes(IMAGE_PATH), false, "and nothing may have been written");
  });
});

describe("every page write path is checked, not just the content save", () => {
  it("refuses a deleted image set as the page's social-sharing image", async () => {
    // The page-details save reached the shared persist helper without the asset
    // adapter, which silently skipped validation — so this exact save went through.
    await writePage(plainPage("about"));
    await call(deleteProjectMedia, { params: { fileId: FILE_ID } });

    const res = await call(updatePage, {
      params: { id: "about" },
      body: { name: "About", slug: "about", seo: { og_image: IMAGE_PATH } },
    });

    assert.equal(res._status, 409);
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");

    const saved = await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"));
    assert.notEqual(saved.seo?.og_image, IMAGE_PATH, "the deleted image must not have been stored");
  });

  it("refuses to skip the check when the asset adapter is missing, rather than saving", async () => {
    // The guard that makes the above impossible to reintroduce by omission.
    await writePage(plainPage("about"));
    const res = mockRes();
    const req = mockReq({ params: { id: "about" }, body: { ...pageReferencingImage("about") } });
    req.adapters = { storage, limits };

    await savePageContent(req, res);

    assert.equal(res._status, 500, "a missing dependency must fail loudly, not quietly skip validation");
  });
});

describe("a project save whose baseline went stale", () => {
  it("refuses a logo that was removed and deleted while the save was queued", async () => {
    // The same race as the collection one, on the project row. Staged rather than
    // hoped for: the request reads the identity, then waits on the media section,
    // and the world changes while it waits. A baseline captured before that wait
    // still shows the logo, which classifies the path as "already present" and
    // skips the check entirely.
    await writePage(plainPage("about"));
    projectRepo.updateProject(PROJECT_ID, { siteIdentity: { logo: IMAGE_PATH } });

    let releaseGate;
    const gate = new Promise((resolve) => {
      releaseGate = resolve;
    });
    let raceStaged = false;

    // Occupy the section so the save below has to queue behind it.
    const blocker = withMediaLock(PROJECT_ID, async () => {
      await gate;
      // What a delete that ran while the save waited leaves behind: the logo
      // removed from the row, the bytes gone, the path remembered.
      projectRepo.updateProject(PROJECT_ID, { siteIdentity: {} });
      await fs.remove(path.join(getProjectImagesDir(PROJECT_FOLDER), IMAGE_NAME));
      recordDeletedMediaPaths(PROJECT_ID, [IMAGE_PATH]);
      raceStaged = true;
    });

    // Reads the identity (logo still present) and queues on the section.
    const queuedSave = call(updateProject, {
      params: { id: PROJECT_ID },
      body: { name: "Media Safety Project", description: "", siteIdentity: { logo: IMAGE_PATH } },
    });

    releaseGate();
    await blocker;
    const res = await queuedSave;

    assert.equal(raceStaged, true, "the race must actually have been staged before the save ran");
    assert.equal(res._status, 409, "a stale identity baseline must not let the logo back in");
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");
    assert.notEqual(
      projectRepo.getProjectById(PROJECT_ID).siteIdentity?.logo,
      IMAGE_PATH,
      "and the deleted logo must not have been stored",
    );
  });
});

describe("how long a deletion is remembered", () => {
  it("still refuses a pending edit's image long after the delete, whatever the clock says", async () => {
    // A time window only postponed this gap: an editor can hold unsaved work
    // overnight, and time passing is not evidence that a pending edit is gone.
    // Records are kept for the life of the process, so advancing the clock past
    // any plausible window must change nothing.
    await writePage(plainPage("about"));
    const del = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(del._status, 200, JSON.stringify(del._json));

    const realNow = Date.now;
    Date.now = () => realNow() + 13 * 60 * 60 * 1000;
    try {
      const res = await call(savePageContent, {
        params: { id: "about" },
        body: { ...pageReferencingImage("about") },
      });
      assert.equal(res._status, 409, "13 hours later it must still be refused");
      assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");
    } finally {
      Date.now = realNow;
    }
  });

  it("still refuses a pending edit's image after hundreds of other files are deleted", async () => {
    // A fixed-size cap evicted the oldest entries, so deleting enough other files
    // silently dropped the protection for an edit still pending against this one.
    // Generated sizes made it worse by spending several slots per file.
    await writePage(plainPage("about"));
    const del = await call(deleteProjectMedia, { params: { fileId: FILE_ID } });
    assert.equal(del._status, 200, JSON.stringify(del._json));
    assert.equal(await imageStillOnDisk(), false, "precondition: the image is gone");

    // Far more deletions than the old 500-entry cap, sizes included.
    for (let i = 0; i < 700; i++) {
      recordDeletedMediaPaths(PROJECT_ID, [
        `/uploads/images/other-${i}.jpg`,
        `/uploads/images/other-${i}-thumb.jpg`,
        `/uploads/images/other-${i}-large.jpg`,
      ]);
    }

    const res = await call(savePageContent, {
      params: { id: "about" },
      body: { ...pageReferencingImage("about") },
    });

    assert.equal(res._status, 409, "the pending edit's image must still be refused");
    assert.equal(res._json.code, "MEDIA_REFERENCE_MISSING");
  });
});
