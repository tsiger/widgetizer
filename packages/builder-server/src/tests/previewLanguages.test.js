/**
 * The preview controllers on a translated site.
 *
 * Everything here goes through the real controller rather than the renderer,
 * because the bugs this pins were in the wiring between them: a language read
 * from the request and then dropped on the way to the render is invisible to
 * any test that starts after that point.
 *
 * Run with: node --test packages/builder-server/src/tests/previewLanguages.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-preview-lang-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _log = console.log;
const _warn = console.warn;
const _error = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { createCollectionPreviewToken, createPreviewToken, renderSingleWidget } = await import(
  "../controllers/previewController.js"
);
const { getToken } = await import("../services/previewTokenStore.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "preview-lang-uuid";
const PROJECT_FOLDER = "preview-lang-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const RAW_THEME_SETTINGS = { settings: { global: { general: [], colors: [] } } };

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "Story",
  displayNamePlural: "News",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

// The template prints the language it was rendered as, so a dropped language is
// visible in the output rather than only in what it breaks downstream.
const NEWS_TEMPLATE =
  `<article data-language="{{ page.language }}"><h1>{{ item.settings.title }}</h1>` +
  `<ul class="more">{% assign siblings = 'news' | collection %}` +
  `{% for i in siblings %}<li>{{ i.settings.title }}</li>{% endfor %}</ul>` +
  `<nav class="langs">{% for t in page.translations %}` +
  `<a href="{{ t.href }}" data-lang="{{ t.language }}" data-fallback="{{ t.fallback }}">{{ t.label }}</a>` +
  `{% endfor %}</nav></article>`;

const headerWidget = (text) => ({
  type: "header",
  settings: { text },
  blocks: {},
  blocksOrder: [],
});

async function seed() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Preview Languages",
        siteTitle: "Preview Languages",
        theme: "__preview_lang_theme__",
        themeVersion: "1.0.0",
        siteUrl: "https://example.com/",
        defaultLanguage: "en",
        languages: ["el"],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.outputFile(getProjectThemeJsonPath(PROJECT_FOLDER), JSON.stringify(RAW_THEME_SETTINGS, null, 2));

  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html lang="{{ page.language }}" dir="{{ page.dir }}"><head>{% seo %}<title>{{ page.seo.title }}</title></head>` +
      `<body>{{ header | raw }}` +
      `<nav class="langs">{% for t in page.translations %}` +
      `<a href="{{ t.href }}" data-lang="{{ t.language }}" data-fallback="{{ t.fallback }}"{% if t.active %} aria-current="true"{% endif %}>{{ t.label }}</a>` +
      `{% endfor %}</nav>` +
      `<nav class="crumbs">{% for crumb in page.breadcrumbs %}<span>{{ crumb.label }}</span>{% endfor %}</nav>` +
      `<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>`,
  );

  // A header per language, each saying which one it is.
  await storage.write(scope, "pages/global/header.json", JSON.stringify(headerWidget("ENGLISH HEADER")));
  await storage.write(scope, "pages/global/footer.json", JSON.stringify({ ...headerWidget("ENGLISH FOOTER"), type: "footer" }));
  await storage.write(scope, "pages/el/global/header.json", JSON.stringify(headerWidget("GREEK HEADER")));
  await storage.write(scope, "pages/el/global/footer.json", JSON.stringify({ ...headerWidget("GREEK FOOTER"), type: "footer" }));

  // Global widgets render from the project's own widgets/global/<type>/.
  for (const type of ["header", "footer"]) {
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", type, "widget.liquid"),
      `<${type === "header" ? "header" : "footer"}>{{ widget.settings.text }}</${type === "header" ? "header" : "footer"}>`,
    );
    await fs.outputFile(
      path.join(projectDir, "widgets", "global", type, "schema.json"),
      JSON.stringify({ name: type, settings: [{ type: "text", id: "text", label: "Text" }] }, null, 2),
    );
  }

  await fs.outputFile(
    path.join(projectDir, "widgets", "crumbs", "widget.liquid"),
    `<nav class="bc">{% for crumb in page.breadcrumbs %}<span>{{ crumb.label }}</span>{% endfor %}</nav>`,
  );
  await fs.outputFile(
    path.join(projectDir, "widgets", "crumbs", "schema.json"),
    JSON.stringify({ name: "crumbs", settings: [] }),
  );

  // A home page and a listing page, so there is a trail to lose.
  await storage.write(
    scope,
    "pages/index.json",
    JSON.stringify({ id: "index", uuid: "u-home", slug: "index", name: "Home", widgets: {}, widgetsOrder: [] }),
  );
  await storage.write(
    scope,
    "pages/blog.json",
    JSON.stringify({ id: "blog", uuid: "u-blog", slug: "blog", name: "Blog", widgets: {}, widgetsOrder: [] }),
  );
  // An English page with a Greek sibling, one without, and a Greek homepage so
  // Greek counts as a published language at all.
  await storage.write(
    scope,
    "pages/about.json",
    JSON.stringify({ id: "about", uuid: "u-about", slug: "about", name: "About", widgets: {}, widgetsOrder: [] }),
  );
  await storage.write(
    scope,
    "pages/careers.json",
    JSON.stringify({ id: "careers", uuid: "u-careers", slug: "careers", name: "Careers", widgets: {}, widgetsOrder: [] }),
  );
  await storage.write(
    scope,
    "pages/el/index.json",
    JSON.stringify({ id: "index", uuid: "u-el-home", slug: "index", name: "Arxiki", widgets: {}, widgetsOrder: [] }),
  );
  await storage.write(
    scope,
    "pages/el/sxetika.json",
    JSON.stringify({
      id: "sxetika",
      uuid: "u-el-about",
      translationGroupId: "u-about",
      slug: "sxetika",
      name: "Sxetika",
      widgets: {},
      widgetsOrder: [],
    }),
  );

  await storage.write(
    scope,
    "collections/news/story.json",
    JSON.stringify({
      id: "story",
      uuid: "u-story",
      translationGroupId: "u-story",
      slug: "story",
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
      settings: { title: "Story" },
    }),
  );
  await storage.write(
    scope,
    "collections/news/el/istoria.json",
    JSON.stringify({
      id: "istoria",
      uuid: "u-el-story",
      translationGroupId: "u-story",
      slug: "istoria",
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
      settings: { title: "Istoria" },
    }),
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
}

function mockReq(body, query = {}) {
  const project = projectRepo.getProjectById(PROJECT_ID);
  return {
    body,
    query,
    params: {},
    scope,
    activeProject: project,
    adapters: { storage },
  };
}

function mockRes() {
  const res = { _status: 200, _json: null };
  res.status = (code) => {
    res._status = code;
    return res;
  };
  res.json = (payload) => {
    res._json = payload;
    return res;
  };
  return res;
}

async function previewItemHtml(query) {
  const req = mockReq(
    { collectionType: "news", slug: "story", settings: { title: "Story" } },
    query,
  );
  const res = mockRes();
  await createCollectionPreviewToken(req, res);
  assert.equal(res._status, 200, JSON.stringify(res._json));
  return getToken(res._json.token);
}

before(async () => {
  await seed();
});

after(async () => {
  console.log = _log;
  console.warn = _warn;
  console.error = _error;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("a collection item preview in another language", () => {
  it("wraps it in that language's header and footer", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /GREEK HEADER/);
    assert.match(html, /GREEK FOOTER/);
    assert.doesNotMatch(html, /ENGLISH HEADER/);
  });

  it("renders the item AS that language, so everything downstream resolves in it", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /data-language="el"/);
  });

  // An item page carries a listing like any other page, and it lists the
  // language the item is in.
  it("lists its own language's items in a collection widget on the item template", async () => {
    const greek = await previewItemHtml({ language: "el" });
    assert.match(greek, /<li>Istoria<\/li>/);
    assert.doesNotMatch(greek, /<li>Story<\/li>/);

    const english = await previewItemHtml({});
    assert.match(english, /<li>Story<\/li>/);
    assert.doesNotMatch(english, /<li>Istoria<\/li>/);
  });

  it("tells the runtime which codes are languages", async () => {
    const html = await previewItemHtml({ language: "el" });
    assert.match(html, /data-languages="el"/);
    assert.match(html, /data-default-language="en"/);
  });

  it("is the default language's page when no language is asked for", async () => {
    const html = await previewItemHtml({});
    assert.match(html, /ENGLISH HEADER/);
    assert.match(html, /data-language="en"/);
    assert.doesNotMatch(html, /GREEK HEADER/);
  });

  it("refuses a language the project has not enabled", async () => {
    const req = mockReq({ collectionType: "news", slug: "story", settings: {} }, { language: "fr" });
    const res = mockRes();
    await createCollectionPreviewToken(req, res);
    assert.equal(res._status, 400);
  });
});

// A page is listed under its FIRST copy's path, so the lookup that finds it has
// to ask for page one however deep into the pagination the preview is. The
// numbered crumb comes from the pagination plan, not from this path.
describe("a numbered page preview", () => {
  async function pageHtml(pageNumber) {
    const req = mockReq({
      pageData: { id: "blog", uuid: "u-blog", slug: "blog", name: "Blog", widgets: {}, widgetsOrder: [] },
      themeSettings: RAW_THEME_SETTINGS,
      previewMode: "standalone",
      pageNumber,
    });
    const res = mockRes();
    await createPreviewToken(req, res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    return getToken(res._json.token);
  }

  it("keeps its breadcrumb trail on page one", async () => {
    const html = await pageHtml(1);
    assert.match(html, /<nav class="crumbs">.*Blog.*<\/nav>/s);
  });

  it("keeps the same trail on a later page", async () => {
    const html = await pageHtml(2);
    assert.match(html, /<nav class="crumbs">.*Blog.*<\/nav>/s);
  });
});

// §7c/§7d end to end: what a theme is handed, and what a crawler is handed.
describe("a page rendered in a translated site", () => {
  async function pageHtml(pageData) {
    const req = mockReq({
      pageData,
      themeSettings: RAW_THEME_SETTINGS,
      previewMode: "standalone",
      pageNumber: 1,
    });
    const res = mockRes();
    await createPreviewToken(req, res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    return getToken(res._json.token);
  }

  const ABOUT_EN = {
    id: "about",
    uuid: "u-about",
    slug: "about",
    name: "About",
    language: "en",
    widgets: {},
    widgetsOrder: [],
  };

  it("says which language it is, and which way it reads", async () => {
    const html = await pageHtml(ABOUT_EN);
    assert.match(html, /<html lang="en" dir="ltr">/);

    const greek = await pageHtml({ ...ABOUT_EN, id: "sxetika", uuid: "u-el-about", slug: "sxetika", language: "el" });
    assert.match(greek, /<html lang="el" dir="ltr">/);
  });

  it("hands the theme one entry per language, the page itself marked", async () => {
    const html = await pageHtml(ABOUT_EN);
    assert.match(html, /data-lang="en"[^>]*aria-current="true"/);
    assert.match(html, /<a href="el\/sxetika.html" data-lang="el" data-fallback="false"/);
    assert.match(html, />\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac</);
  });

  it("falls a language with no sibling back to its homepage, and says it is a fallback", async () => {
    const html = await pageHtml({
      id: "careers",
      uuid: "u-careers",
      slug: "careers",
      name: "Careers",
      language: "en",
      widgets: {},
      widgetsOrder: [],
    });
    assert.match(html, /<a href="el\/index.html" data-lang="el" data-fallback="true"/);
  });

  it("declares the alternates, itself, and x-default", async () => {
    const html = await pageHtml(ABOUT_EN);
    assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/example.com\/about.html">/);
    assert.match(html, /<link rel="alternate" hreflang="el" href="https:\/\/example.com\/el\/sxetika.html">/);
    assert.match(html, /<link rel="alternate" hreflang="x-default" href="https:\/\/example.com\/about.html">/);
  });

  it("never declares a fallback as a language's alternate", async () => {
    const html = await pageHtml({
      id: "careers",
      uuid: "u-careers",
      slug: "careers",
      name: "Careers",
      language: "en",
      widgets: {},
      widgetsOrder: [],
    });
    assert.doesNotMatch(html, /hreflang="el"/);
    assert.match(html, /hreflang="x-default"/);
  });
});

// An item preview renders POSTED settings, but it is still some saved item: its
// identity is what puts it in a translation group, and without one the switcher
// falls every language back to a homepage.
describe("a collection item's own switcher", () => {
  async function itemHtml(query, slug = "story") {
    const req = mockReq({ collectionType: "news", slug, settings: { title: "Story" } }, query);
    const res = mockRes();
    await createCollectionPreviewToken(req, res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    return getToken(res._json.token);
  }

  it("links to the item's sibling, not to a homepage", async () => {
    const html = await itemHtml({});
    assert.match(html, /<a href="el\/news\/istoria.html" data-lang="el" data-fallback="false"/);
  });

  it("reads the same group from the other side", async () => {
    const html = await itemHtml({ language: "el" }, "istoria");
    assert.match(html, /<a href="news\/story.html" data-lang="en" data-fallback="false"/);
  });

  it("declares the sibling as an alternate, not just x-default", async () => {
    const html = await itemHtml({});
    assert.match(html, /hreflang="el" href="https:\/\/example.com\/el\/news\/istoria.html"/);
  });

  it("falls back to the homepage for an item that has no sibling", async () => {
    await storage.write(
      scope,
      "collections/news/alone.json",
      JSON.stringify({
        id: "alone",
        uuid: "u-alone",
        translationGroupId: "u-alone",
        slug: "alone",
        created: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-01T00:00:00.000Z",
        settings: { title: "Alone" },
      }),
    );
    const html = await itemHtml({}, "alone");
    assert.match(html, /<a href="el\/index.html" data-lang="el" data-fallback="true"/);
    assert.doesNotMatch(html, /hreflang="el"/);
  });
});

// A morph re-renders one widget with no page around it. The editor sends the
// bare slug, so the language has to come from the page data — otherwise a
// translated page is looked up at the default language's address and finds
// nothing there.
describe("a morphed widget on a translated page", () => {
  const morph = async (page, currentCanonicalPath) => {
    let html = "";
    const res = {
      send(body) {
        html = body;
        return res;
      },
      status() {
        return res;
      },
      json(body) {
        html = JSON.stringify(body);
        return res;
      },
    };
    await renderSingleWidget(
      mockReq({
        widgetId: "crumbs",
        widget: { type: "crumbs", settings: {} },
        themeSettings: RAW_THEME_SETTINGS,
        currentCanonicalPath,
        page,
      }),
      res,
    );
    return html;
  };

  const labels = (html) => [...html.matchAll(/<span>([^<]*)<\/span>/g)].map((match) => match[1]);

  it("draws the trail of the page it is on, not the one at that slug in the default language", async () => {
    const greek = JSON.parse(await storage.read(scope, "pages/el/sxetika.json"));
    const html = await morph({ ...greek, language: "el" }, "sxetika.html");
    assert.deepEqual(labels(html), ["Arxiki", "Sxetika"]);
  });

  it("leaves the default language exactly where it was", async () => {
    const about = JSON.parse(await storage.read(scope, "pages/about.json"));
    const html = await morph({ ...about, language: "en" }, "about.html");
    assert.deepEqual(labels(html), ["Home", "About"]);
  });
});

// The canvas is the first place an owner sees the words, and it renders one
// widget at a time. This theme has no `locales/` at all, so anything readable
// here came from the built-in widgets' own dictionary.
describe("a built-in widget on the canvas", () => {
  const morphForm = async (page, settings = {}) => {
    let html = "";
    const res = {
      send(body) {
        html = body;
        return res;
      },
      status() {
        return res;
      },
      json(body) {
        html = JSON.stringify(body);
        return res;
      },
    };
    await renderSingleWidget(
      mockReq({
        widgetId: "form",
        widget: {
          type: "core-form",
          settings,
          blocks: { b1: { type: "field", settings: { label: "Your name", type: "text", required: true } } },
          blocksOrder: ["b1"],
        },
        themeSettings: RAW_THEME_SETTINGS,
        currentCanonicalPath: page.slug === "index" ? "index.html" : `${page.slug}.html`,
        page,
      }),
      res,
    );
    return html;
  };

  it("reads in the language of the page being edited", async () => {
    const greek = JSON.parse(await storage.read(scope, "pages/el/sxetika.json"));
    const html = await morphForm({ ...greek, language: "el" });

    assert.ok(html.includes("Υποχρεωτικά πεδία"), html.slice(0, 800));
    assert.ok(html.includes("Αποστολή μηνύματος"));
  });

  it("reads in English on the default language's page", async () => {
    const about = JSON.parse(await storage.read(scope, "pages/about.json"));
    const html = await morphForm({ ...about, language: "en" });

    assert.ok(html.includes("Required fields"), html.slice(0, 800));
    assert.ok(html.includes("Send message"));
  });

  it("shows what the owner typed instead", async () => {
    const greek = JSON.parse(await storage.read(scope, "pages/el/sxetika.json"));
    const html = await morphForm({ ...greek, language: "el" }, { submit_label: "Πάμε" });

    assert.ok(html.includes("Πάμε"));
    assert.ok(!html.includes("Αποστολή μηνύματος"));
  });
});
