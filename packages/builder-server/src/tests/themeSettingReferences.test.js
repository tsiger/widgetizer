/**
 * References in a theme's SITE-WIDE settings.
 *
 * Theme settings are edited with the same inputs widget settings are, against the
 * same catalog of setting types. So a theme author can point a site-wide setting at
 * a page, a collection item or a menu — and until this, the picker worked, the value
 * stored, and then nothing happened: the selection never resolved when the site was
 * rendered, never followed a project duplication, and was never cleared when its
 * target was deleted. The failure was invisible at every layer.
 *
 * These pin the four workflows that have to treat a theme setting exactly as they
 * treat a widget setting.
 *
 * Deliberately out of scope: references nested INSIDE a setting's value (a list of
 * rows each holding a link). The media walk recurses into those and the reference
 * walks do not, which is a real inconsistency — but nothing can currently produce
 * that shape, so it stays deferred rather than half-fixed here.
 *
 * Run with: node --test packages/builder-server/src/tests/themeSettingReferences.test.js
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-refs-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origWarn = console.warn;
console.warn = () => {};

const { getProjectDir, getProjectPagesDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { clearDeletedReferencesInSection, remapDuplicatedProjectUuids, enrichNewProjectReferences } = await import(
  "../utils/linkEnrichment.js"
);
const { resolveThemeSettingReferences } = await import("@widgetizer/render-engine");
const { remapCollectionItemLinkRefs, enrichSeededRichtextLinksFromDir } = await import(
  "../utils/linkEnrichment.js"
);
const { renderPageLayout, renderWidget } = await import("../services/renderingService.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "theme-refs-uuid";
const PROJECT_FOLDER = "theme-refs-project";
const PAGE_UUID = "u-about";
const MENU_UUID = "m-main";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

after(async () => {
  console.warn = _origWarn;
  closeDb();
  await fs.remove(TEST_ROOT);
});

const themeJsonPath = () => path.join(getProjectDir(PROJECT_FOLDER), "theme.json");

/**
 * A theme that declares a site-wide link and a site-wide menu — the two reference
 * types a theme may now use, alongside the image every theme already uses.
 */
const themeWith = ({ linkValue, menuValue, linkDefault } = {}) => ({
  name: "Refs",
  version: "1.0.0",
  settings: {
    global: {
      general: [
        { type: "image", id: "favicon", default: "" },
        {
          type: "link",
          id: "logo_link",
          ...(linkDefault !== undefined ? { default: linkDefault } : { default: "" }),
          ...(linkValue !== undefined ? { value: linkValue } : {}),
        },
        { type: "menu", id: "footer_nav", default: "", ...(menuValue !== undefined ? { value: menuValue } : {}) },
      ],
    },
  },
});

const readTheme = () => fs.readJson(themeJsonPath());
const writeTheme = (theme) => fs.outputJson(themeJsonPath(), theme, { spaces: 2 });

async function seedProject() {
  await fs.remove(getProjectDir(PROJECT_FOLDER));
  // Reset the row's own flags too, not just the files: Clean URLs and the default
  // language change the shape of every href these tests assert, so one case
  // leaving them set silently rewrites the next one's expectations.
  projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "en", languages: [], cleanUrls: false });

  await fs.outputJson(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"),
    { uuid: PAGE_UUID, slug: "about", name: "About", widgets: {} },
    { spaces: 2 },
  );
  await fs.outputJson(
    path.join(getProjectDir(PROJECT_FOLDER), "menus", "main-menu.json"),
    { uuid: MENU_UUID, id: "main-menu", name: "Main", items: [] },
    { spaces: 2 },
  );
}

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Theme Refs",
        theme: "__theme_refs__",
        defaultLanguage: "en",
        languages: [],
        created: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });
});

beforeEach(seedProject);

// ============================================================================

describe("rendering a site-wide selection", () => {
  const deps = () => ({
    projectDir: getProjectDir(PROJECT_FOLDER),
    listPages: async () => [{ uuid: PAGE_UUID, slug: "about", name: "About" }],
  });

  it("resolves a site-wide link to the target's current address", async () => {
    // The whole point: the picker already worked. What did not was the output.
    const processed = { general: { logo_link: { pageUuid: PAGE_UUID, href: "stale.html", text: "About" } } };

    await resolveThemeSettingReferences(processed, themeWith({}), deps(), {}, {});

    assert.equal(processed.general.logo_link.href, "about.html", "resolved from the page's current slug");
    assert.equal(processed.general.logo_link.text, "About", "and the label is untouched");
  });

  it("clears a site-wide link whose target is gone, rather than emitting a dead address", async () => {
    const processed = { general: { logo_link: { pageUuid: "u-vanished", href: "gone.html", text: "Gone" } } };

    await resolveThemeSettingReferences(processed, themeWith({}), deps(), {}, {});

    assert.equal(processed.general.logo_link.href, "", "a missing target resolves to no link");
  });

  it("resolves a site-wide menu selection into the menu itself", async () => {
    const processed = { general: { footer_nav: MENU_UUID } };

    await resolveThemeSettingReferences(processed, themeWith({}), deps(), {}, {});

    assert.equal(typeof processed.general.footer_nav, "object", "the uuid became the menu");
    assert.ok(Array.isArray(processed.general.footer_nav.items));
  });

  it("does nothing, and loads nothing, for a theme that declares neither type", async () => {
    // Every theme that has not adopted this must pay nothing for it.
    let loaded = false;
    const countingDeps = {
      projectDir: getProjectDir(PROJECT_FOLDER),
      listPages: async () => {
        loaded = true;
        return [];
      },
    };
    const plainTheme = { settings: { global: { general: [{ type: "image", id: "favicon", default: "" }] } } };
    const processed = { general: { favicon: "/uploads/images/f.png" } };

    await resolveThemeSettingReferences(processed, plainTheme, countingDeps, {}, {});

    assert.equal(loaded, false, "no page map loaded");
    assert.equal(processed.general.favicon, "/uploads/images/f.png", "and nothing touched");
  });
});

describe("deleting the target of a site-wide selection", () => {
  it("clears a site-wide link to a deleted page", async () => {
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "about.html", text: "About us" } }));

    await clearDeletedReferencesInSection(storage, scope, { pageUuids: [PAGE_UUID], defaultLanguage: "en" });

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "logo_link");
    assert.equal("pageUuid" in setting.value, false, "the reference goes");
    assert.equal(setting.value.href, "", "and so does the destination");
    assert.equal(setting.value.text, "About us", "the label is the author's and stays");
  });

  it("clears a site-wide menu selection when that menu is deleted", async () => {
    await writeTheme(themeWith({ menuValue: MENU_UUID }));

    await clearDeletedReferencesInSection(storage, scope, { menuUuids: [MENU_UUID], defaultLanguage: "en" });

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "footer_nav");
    assert.equal(setting.value, "", "the selection is cleared");
  });

  it("leaves a selection of something that still exists", async () => {
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "about.html", text: "About us" } }));

    await clearDeletedReferencesInSection(storage, scope, { pageUuids: ["u-other"], defaultLanguage: "en" });

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "logo_link");
    assert.equal(setting.value.pageUuid, PAGE_UUID);
  });
});

describe("duplicating a project", () => {
  it("points a site-wide link at the duplicate's own page, not the original's", async () => {
    // A duplicate holding the source project's uuid is a reference into another
    // project — the same thing the parent-page pass already guards against.
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "about.html", text: "About" } }));

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const pages = await fs.readdir(getProjectPagesDir(PROJECT_FOLDER));
    const about = await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), pages.find((f) => f === "about.json")));
    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "logo_link");

    assert.notEqual(about.uuid, PAGE_UUID, "the duplicate regenerated the page uuid");
    assert.equal(setting.value.pageUuid, about.uuid, "and the site-wide link followed it");
  });

  it("points a site-wide menu selection at the duplicate's own menu", async () => {
    await writeTheme(themeWith({ menuValue: MENU_UUID }));

    await remapDuplicatedProjectUuids(PROJECT_FOLDER);

    const menu = await fs.readJson(path.join(getProjectDir(PROJECT_FOLDER), "menus", "main-menu.json"));
    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "footer_nav");

    assert.notEqual(menu.uuid, MENU_UUID, "the duplicate regenerated the menu uuid");
    assert.equal(setting.value, menu.uuid, "and the site-wide selection followed it");
  });
});

describe("seeding a new project", () => {
  it("gives a theme's shipped link a stable reference, as it does for widgets", async () => {
    // A theme ships its defaults as addresses; seeding is what turns those into
    // references that survive a rename.
    await writeTheme(themeWith({ linkDefault: { href: "about.html", text: "About", target: "_self" } }));

    await enrichNewProjectReferences(
      getProjectPagesDir(PROJECT_FOLDER),
      path.join(getProjectDir(PROJECT_FOLDER), "menus"),
    );

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "logo_link");
    assert.equal(setting.default.pageUuid, PAGE_UUID, "the shipped address became a reference");
  });
});

// ============================================================================
// Regressions from code review. Three ways a site-wide reference could still be
// wrong: resolved against settings that were not ready, missed by the pass that
// gives preset content fresh identities, or applied to a setting that never held
// a reference at all.
// ============================================================================

describe("rendering a site-wide link through the real layout", () => {
  /** A layout that prints the resolved site-wide link, and nothing else of note. */
  async function writeLayout() {
    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "layout.liquid"),
      `<!DOCTYPE html><html><head><title>{{ page.name }}</title></head>` +
        `<body><a id="logo" href="{{ theme.general.logo_link.href }}">go</a>{{ main_content | raw }}</body></html>`,
    );
  }

  const sections = { headerContent: "", mainContent: "<p>x</p>", footerContent: "" };
  const pageData = { name: "Home", slug: "index" };

  it("uses the plain address when the page is in the site's default language", async () => {
    await writeLayout();
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "stale.html", text: "About" } }));

    const html = await renderPageLayout(PROJECT_ID, sections, pageData, await readTheme(), "publish", {});

    assert.match(html, /id="logo" href="about\.html"/, "no language folder for the default language");
  });

  it("does not prefix the default language's own folder on a Greek-default site", async () => {
    // Read straight off shared globals, the default language was "" while the page's
    // language was "el", so the site's own default language was treated as a
    // secondary one and got a folder: el/about.html for a page that lives at the root.
    projectRepo.updateProject(PROJECT_ID, { defaultLanguage: "el", languages: [] });
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"),
      { uuid: PAGE_UUID, slug: "about", name: "About", language: "el", widgets: {} },
      { spaces: 2 },
    );
    await writeLayout();
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "stale.html", text: "About" } }));

    const html = await renderPageLayout(PROJECT_ID, sections, pageData, await readTheme(), "publish", {});

    assert.match(html, /id="logo" href="about\.html"/, "the default language owns the root folder");
    assert.doesNotMatch(html, /href="el\/about\.html"/, "and must not be given a folder of its own");
  });

  it("honours Clean URLs, including on a layout-only render", async () => {
    // Nothing had stamped the flag yet on this path, so the setting was ignored.
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: true });
    await writeLayout();
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "stale.html", text: "About" } }));

    const html = await renderPageLayout(PROJECT_ID, sections, pageData, await readTheme(), "publish", {});

    assert.match(html, /id="logo" href="about"/, "extensionless under Clean URLs");
    assert.doesNotMatch(html, /href="about\.html"/);
  });

  it("still lets an explicit caller value win", async () => {
    // Deriving these must not override a caller that already knows better.
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: true });
    await writeLayout();
    await writeTheme(themeWith({ linkValue: { pageUuid: PAGE_UUID, href: "stale.html", text: "About" } }));

    const html = await renderPageLayout(PROJECT_ID, sections, pageData, await readTheme(), "publish", {
      cleanUrls: false,
    });

    assert.match(html, /id="logo" href="about\.html"/, "the caller's Clean URLs value is respected");
  });
});

describe("seeding a project from a preset", () => {
  it("points a site-wide link at the article this project just created", async () => {
    // Preset items get fresh identities on seed. Widget links followed them; a
    // site-wide link kept naming the preset's original article.
    await writeTheme(
      themeWith({ linkValue: { collectionItemUuid: "preset-item", collectionType: "news", href: "", text: "Read" } }),
    );

    await remapCollectionItemLinkRefs(PROJECT_FOLDER, new Map([["preset-item", "seeded-item"]]));

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "logo_link");
    assert.equal(setting.value.collectionItemUuid, "seeded-item", "the site-wide link followed the new identity");
  });

  it("leaves ordinary text alone, even when it reads like a menu name", async () => {
    // These transformers recognise a menu selection by its bare string. Applied
    // without consulting the declared type, seeding rewrote a plain text setting
    // whose value happened to be "main-menu" into that menu's internal uuid.
    const theme = themeWith({});
    theme.settings.global.general.push({ type: "text", id: "tagline", value: "main-menu" });
    theme.settings.global.general.push({ type: "select", id: "layout_choice", value: "main-menu" });
    await writeTheme(theme);

    await enrichNewProjectReferences(
      getProjectPagesDir(PROJECT_FOLDER),
      path.join(getProjectDir(PROJECT_FOLDER), "menus"),
    );

    const settings = (await readTheme()).settings.global.general;
    assert.equal(settings.find((s) => s.id === "tagline").value, "main-menu", "prose is not a reference");
    assert.equal(settings.find((s) => s.id === "layout_choice").value, "main-menu", "nor is a fixed choice");
  });
});

describe("richtext in a theme's own settings", () => {
  const richTheme = ({ value, def } = {}) => ({
    name: "Refs",
    version: "1.0.0",
    settings: {
      global: {
        general: [
          { type: "menu", id: "footer_nav", default: "" },
          {
            type: "richtext",
            id: "intro",
            ...(def !== undefined ? { default: def } : {}),
            ...(value !== undefined ? { value } : {}),
          },
        ],
      },
    },
  });

  it("does not mistake prose mentioning a menu's name for a menu selection", async () => {
    // Excluding plain text was not enough: richtext was still handed the generic
    // transformer, which recognises a menu by its bare string — so a paragraph
    // merely containing those words was replaced wholesale by the menu's uuid.
    await writeTheme(richTheme({ def: "main-menu" }));

    await enrichNewProjectReferences(
      getProjectPagesDir(PROJECT_FOLDER),
      path.join(getProjectDir(PROJECT_FOLDER), "menus"),
    );

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "intro");
    assert.equal(setting.default, "main-menu", "the author's words are left exactly as written");
  });

  it("still stamps a stable reference onto a richtext link during seeding", async () => {
    // The narrowing must not cost richtext its own handling.
    await writeTheme(richTheme({ def: '<p>Read <a href="about.html">about us</a></p>' }));

    await enrichNewProjectReferences(
      getProjectPagesDir(PROJECT_FOLDER),
      path.join(getProjectDir(PROJECT_FOLDER), "menus"),
    );

    const setting = (await readTheme()).settings.global.general.find((s) => s.id === "intro");
    assert.match(setting.default, new RegExp(`data-page-uuid="${PAGE_UUID}"`), "the anchor got a stable ref");
  });

  it("follows a rename when the page is rendered", async () => {
    // A reference that is never resolved is worse than none: the anchor keeps the
    // address the theme shipped and quietly stops tracking the page.
    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "layout.liquid"),
      `<!DOCTYPE html><html><body>{{ theme.general.intro | raw }}{{ main_content | raw }}</body></html>`,
    );
    await writeTheme(
      richTheme({ value: `<p>Read <a href="about.html" data-page-uuid="${PAGE_UUID}">about us</a></p>` }),
    );
    // The page moves; the reference is what is supposed to survive it.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"),
      { uuid: PAGE_UUID, slug: "about-renamed", name: "About", widgets: {} },
      { spaces: 2 },
    );

    const html = await renderPageLayout(
      PROJECT_ID,
      { headerContent: "", mainContent: "<p>x</p>", footerContent: "" },
      { name: "Home", slug: "index" },
      await readTheme(),
      "publish",
      {},
    );

    assert.match(html, /href="about-renamed\.html"/, "the anchor followed the rename");
    assert.doesNotMatch(html, /href="about\.html"/, "and dropped the address the theme shipped");
  });
});

describe("a preset's article link, in a widget and in a theme setting", () => {
  const ITEM_UUID = "u-item-story";
  const ARTICLE_HTML = '<p>Read <a href="news/story.html">the story</a></p>';

  /** A seeded project: one article, one page widget and one theme setting linking to it. */
  async function seedPresetProject() {
    await fs.outputJson(
      path.join(getProjectDir(PROJECT_FOLDER), "collection-types", "news", "schema.json"),
      {
        type: "news",
        schemaVersion: 1,
        hasItemPages: true,
        slugPrefix: "news",
        defaultSort: "manual",
        settings: [{ id: "title", type: "text", usedAsTitle: true, required: true }],
      },
      { spaces: 2 },
    );
    await fs.outputJson(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "story.json"),
      { uuid: ITEM_UUID, slug: "story", settings: { title: "Story" } },
      { spaces: 2 },
    );
    // The widget carries the shipped address, exactly as the theme setting does.
    await fs.outputJson(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json"),
      {
        uuid: "u-index",
        slug: "index",
        name: "Home",
        widgets: { w1: { type: "prose", settings: { body: ARTICLE_HTML } } },
        widgetsOrder: ["w1"],
      },
      { spaces: 2 },
    );
    await fs.outputJson(
      path.join(getProjectDir(PROJECT_FOLDER), "widgets", "prose", "schema.json"),
      { settings: [{ id: "body", type: "richtext" }] },
      { spaces: 2 },
    );
    await writeTheme({
      name: "Refs",
      version: "1.0.0",
      settings: { global: { general: [{ type: "richtext", id: "intro", value: ARTICLE_HTML }] } },
    });
  }

  const themeIntro = async () =>
    (await readTheme()).settings.global.general.find((s) => s.id === "intro").value;
  const widgetBody = async () =>
    (await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json"))).widgets.w1.settings.body;

  it("gives both the new article's identity", async () => {
    // Item refs are stamped by this later pass, because the items do not exist
    // during the main seed. A widget got one; a theme setting did not.
    await seedPresetProject();

    await enrichSeededRichtextLinksFromDir({ projectDir: getProjectDir(PROJECT_FOLDER) });

    const stamped = new RegExp(`data-collection-item-uuid="${ITEM_UUID}"`);
    assert.match(await widgetBody(), stamped, "the widget's link");
    assert.match(await themeIntro(), stamped, "and the theme setting's, on equal terms");
  });

  it("makes both follow the article when it is renamed", async () => {
    // The reference is only worth stamping if something resolves it afterwards.
    await seedPresetProject();
    await enrichSeededRichtextLinksFromDir({ projectDir: getProjectDir(PROJECT_FOLDER) });

    // The article moves.
    await fs.move(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "story.json"),
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "story-renamed.json"),
    );
    await fs.outputJson(
      path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "story-renamed.json"),
      { uuid: ITEM_UUID, slug: "story-renamed", settings: { title: "Story" } },
      { spaces: 2 },
    );

    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "layout.liquid"),
      `<!DOCTYPE html><html><body>{{ theme.general.intro | raw }}{{ main_content | raw }}</body></html>`,
    );
    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "widgets", "prose", "widget.liquid"),
      `{{ widget.settings.body | raw }}`,
    );

    // Item links resolve against the item map, which only loads when the caller
    // supplies collection deps — and the widget half has to go through the real
    // widget render, not be pasted in as raw HTML.
    const collectionDeps = { storage, scope };
    const sharedGlobals = {};
    const widgetHtml = await renderWidget(
      PROJECT_ID,
      "w1",
      { type: "prose", settings: { body: await widgetBody() } },
      await readTheme(),
      "publish",
      sharedGlobals,
      null,
      collectionDeps,
    );

    const html = await renderPageLayout(
      PROJECT_ID,
      { headerContent: "", mainContent: widgetHtml, footerContent: "" },
      { name: "Home", slug: "index" },
      await readTheme(),
      "publish",
      sharedGlobals,
      collectionDeps,
    );

    const renamed = (html.match(/news\/story-renamed\.html/g) || []).length;
    assert.equal(renamed, 2, "both the widget's link and the theme setting's followed the rename");
    assert.doesNotMatch(html, /news\/story\.html/, "and neither kept the address the preset shipped");
  });
});
