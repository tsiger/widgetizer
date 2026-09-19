/**
 * The words a theme puts on the published page, in the page's language.
 *
 * Drives a real export of a two-language project against the real Arch
 * templates, because the whole point is what a visitor ends up reading: the
 * `t` filter, the per-language strings behind it, a setting whose default comes
 * from them, and the words the page has to hand down to its own scripts.
 *
 * Run with: node --test packages/builder-server/src/tests/siteStrings.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "site-strings-uuid";
const PROJECT_FOLDER = "site-strings-project";
const SITE = "https://strings.example.com";

const ARCH = fileURLToPath(new URL("../../../../themes/arch/", import.meta.url));

const { projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-site-strings",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: SITE,
    projectName: "Site Strings",
    siteTitle: "Site Strings",
    theme: "arch",
  });

// A gallery carries the carousel arrows; a news grid carries an empty state,
// which is the string that became a setting.
const WIDGETS = {
  gallery: { type: "gallery", settings: { layout: "carousel" }, blocks: {}, blocksOrder: [] },
  news: { type: "news-grid", settings: {} },
};

const writePage = async (language, slug, name, extra = {}) => {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(
    path.join(dir, `${slug}.json`),
    JSON.stringify({
      id: slug,
      slug,
      name,
      seo: { title: name },
      widgets: WIDGETS,
      widgetsOrder: ["gallery", "news"],
      ...extra,
    }),
  );
};

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { siteUrl: SITE });
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  for (const dir of ["widgets", "snippets", "locales", "assets"]) {
    await fs.copy(path.join(ARCH, dir), path.join(projectDir, dir));
  }
  await fs.copy(path.join(ARCH, "layout.liquid"), path.join(projectDir, "layout.liquid"));

  await writePage("", "index", "Home", { uuid: "p-en-home" });
  await writePage("el", "index", "Arxiki", { uuid: "p-el-home" });
});

after(async () => {
  await cleanup();
});

async function exportSite() {
  await resetExports();
  const res = await runExport();
  assert.equal(res._status, 200, JSON.stringify(res._json));
  return latestExportDir();
}

const read = async (dir, ...parts) => (await fs.readFile(path.join(dir, ...parts), "utf8")).replace(/\s+/g, " ");

describe("a theme's own words", () => {
  it("read in the language of the page", async () => {
    const dir = await exportSite();
    const english = await read(dir, "index.html");
    const greek = await read(dir, "el", "index.html");

    assert.ok(english.includes('aria-label="Next"'), english.slice(0, 2500));
    assert.ok(greek.includes('aria-label="Επόμενο"'), greek.slice(0, 400));
    assert.ok(!greek.includes('aria-label="Next"'), "no English left on the Greek page");
  });

  it("reach the page's own scripts, which run long after the language is gone", async () => {
    const dir = await exportSite();

    assert.ok((await read(dir, "index.html")).includes('data-t-lightbox-close="Close lightbox"'));
    assert.ok((await read(dir, "el", "index.html")).includes('data-t-lightbox-close="Κλείσιμο"'));
  });
});

// A setting starting in the page's language is what lets a site in one language
// read correctly with nothing filled in.
describe("a setting whose default is one of those words", () => {
  it("starts in the page's language", async () => {
    const dir = await exportSite();

    assert.ok((await read(dir, "index.html")).includes("No news items yet."));
    assert.ok((await read(dir, "el", "index.html")).includes("Δεν υπάρχουν νέα ακόμα."));
  });

  it("gives way to whatever the owner typed, in that language only", async () => {
    await writePage("el", "index", "Arxiki", {
      uuid: "p-el-home",
      widgets: { ...WIDGETS, news: { type: "news-grid", settings: { empty_text: "Τίποτα εδώ" } } },
    });
    try {
      const dir = await exportSite();
      assert.ok((await read(dir, "el", "index.html")).includes("Τίποτα εδώ"));
      assert.ok((await read(dir, "index.html")).includes("No news items yet."));
    } finally {
      await writePage("el", "index", "Arxiki", { uuid: "p-el-home" });
    }
  });
});

// A date is not a theme string — it comes from core — but it is read on the
// page in the same language, and the news grid puts one under every item.
describe("a date on the page", () => {
  before(async () => {
    const item = (slug, title) => ({
      id: slug,
      uuid: `n-${slug}`,
      slug,
      schemaVersion: 1,
      created: "2026-03-04T00:00:00.000Z",
      updated: "2026-03-04T00:00:00.000Z",
      settings: { title, date: "2026-03-04" },
    });
    const dir = getProjectDir(PROJECT_FOLDER);
    await fs.outputFile(
      path.join(dir, "collection-types", "news", "schema.json"),
      JSON.stringify({
        type: "news",
        schemaVersion: 1,
        displayName: "News",
        displayNamePlural: "News",
        hasItemPages: false,
        slugPrefix: "news",
        defaultSort: "date_desc",
        settings: [
          { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
          { type: "date", id: "date", label: "Date", usedAsDate: true },
        ],
      }),
    );
    await fs.outputFile(path.join(dir, "collections", "news", "story.json"), JSON.stringify(item("story", "Story")));
    await fs.outputFile(path.join(dir, "collections", "news", "el", "istoria.json"), JSON.stringify(item("istoria", "Istoria")));
  });

  after(async () => {
    const dir = getProjectDir(PROJECT_FOLDER);
    await fs.remove(path.join(dir, "collections"));
    await fs.remove(path.join(dir, "collection-types"));
  });

  it("reads its month in the language of the page it is on", async () => {
    const dir = await exportSite();

    assert.ok((await read(dir, "index.html")).includes("March 4, 2026"));
    assert.ok((await read(dir, "el", "index.html")).includes("Μαρτίου 4, 2026"));
  });
});

// What a visitor reads and what the person building the site reads are two
// different messages, and only one of them belongs on a published page.
describe("an empty widget", () => {
  it("tells a visitor there is nothing there, and keeps the editor's instruction out of it", async () => {
    const dir = await exportSite();
    const english = await read(dir, "index.html");

    assert.ok(english.includes("No news items yet."));
    assert.ok(!english.includes("Add some under News."), "the instruction is for the editor, not the site");
  });

  it("shows nothing at all where an unconfigured widget would go", async () => {
    await writePage("", "index", "Home", {
      uuid: "p-en-home",
      widgets: { video: { type: "video-embed", settings: {} } },
      widgetsOrder: ["video"],
    });
    try {
      const html = await read(await exportSite(), "index.html");
      assert.ok(!html.includes("Enter a YouTube or Vimeo URL"), html.slice(0, 600));
    } finally {
      await writePage("", "index", "Home", { uuid: "p-en-home" });
    }
  });
});

// A script that swaps a control between two states holds BOTH wordings, so
// both have to travel with the page or the second one arrives in English.
describe("a widget whose script relabels its own controls", () => {
  before(async () => {
    await writePage("el", "index", "Arxiki", {
      uuid: "p-el-home",
      widgets: {
        slides: { type: "slideshow", settings: { autoplay: true }, blocks: {}, blocksOrder: [] },
        audio: { type: "audio-player", settings: {}, blocks: {}, blocksOrder: [] },
      },
      widgetsOrder: ["slides", "audio"],
    });
  });

  after(async () => {
    await writePage("el", "index", "Arxiki", { uuid: "p-el-home" });
  });

  it("carries every state's wording, not just the one the markup starts in", async () => {
    const greek = await read(await exportSite(), "el", "index.html");

    // The slideshow's button says one thing while playing and another paused.
    assert.ok(greek.includes('data-t-pause="Παύση"'), greek.slice(0, 600));
    assert.ok(greek.includes('data-t-play="Αναπαραγωγή"'));
    assert.ok(greek.includes('data-t-start-autoplay="Έναρξη αυτόματης εναλλαγής"'));
    // Same for the audio player's play/pause and mute/unmute pairs.
    assert.ok(greek.includes('data-t-pause="Παύση"'));
    assert.ok(greek.includes('data-t-unmute="Κατάργηση σίγασης"'));
  });

  it("carries an owner's own wording rather than the theme's", async () => {
    await writePage("el", "index", "Arxiki", {
      uuid: "p-el-home",
      widgets: { slides: { type: "slideshow", settings: { autoplay: true, pause_text: "Στοπ" }, blocks: {}, blocksOrder: [] } },
      widgetsOrder: ["slides"],
    });
    const greek = await read(await exportSite(), "el", "index.html");
    assert.ok(greek.includes('data-t-pause="Στοπ"'), greek.slice(0, 600));
  });
});

// A theme that ships no translation must behave exactly as one with the words
// typed into its markup.
describe("a language the theme has not translated", () => {
  before(async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: ["el", "de"] }, { seeded: true });
    await writePage("de", "index", "Startseite", { uuid: "p-de-home" });
  });

  after(async () => {
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "de"));
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
  });

  it("falls back to the theme's English, word by word", async () => {
    const dir = await exportSite();
    const german = await read(dir, "de", "index.html");

    assert.ok(german.includes('aria-label="Next"'), german.slice(0, 400));
    assert.ok(german.includes("No news items yet."));
  });

  it("takes only the words a half-finished translation actually has", async () => {
    const elPath = path.join(getProjectDir(PROJECT_FOLDER), "locales", "el.json");
    const full = JSON.parse(await fs.readFile(elPath, "utf8"));
    await fs.writeFile(elPath, JSON.stringify({ site: { common: { next: full.site.common.next } } }));
    try {
      const dir = await exportSite();
      const greek = await read(dir, "el", "index.html");

      assert.ok(greek.includes('aria-label="Επόμενο"'), "the one translated word is used");
      assert.ok(greek.includes('aria-label="Previous"'), "the rest falls back rather than blanking");
    } finally {
      await fs.writeFile(elPath, JSON.stringify(full));
    }
  });
});
