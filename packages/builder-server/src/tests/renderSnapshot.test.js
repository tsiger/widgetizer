/**
 * Byte-for-byte render snapshots.
 *
 * One fixture project rendered through every path the shells use — the editor
 * preview document, a widget re-render (morph), the collection-item preview and
 * the export (publish mode) — compared with the HTML stored under
 * `fixtures/renderSnapshot/`. The fixture emits every URL the engine builds from
 * its bases: theme and widget assets, core and theme placeholders, uploaded
 * images and files (tags, richtext and collection items), site icons and the
 * form widget's action. A change to how any of them is built shows up as a diff
 * here, so a render change that is meant to leave output alone is checked
 * rather than assumed.
 *
 * Export output carries a per-export cache-busting token (`?v=…`) and the app
 * version in its banner comment; both are replaced by placeholders before
 * comparing. Nothing else is normalised.
 *
 * After an intended output change, rewrite the stored HTML with
 *   UPDATE_RENDER_SNAPSHOTS=1 node --test packages/builder-server/src/tests/renderSnapshot.test.js
 * and review the diff.
 *
 * Run with: node --test packages/builder-server/src/tests/renderSnapshot.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import sharp from "sharp";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-render-snapshot-${Date.now()}`);
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

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath, getProjectImagesDir, getPublishDir } =
  await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");
const { createPreviewToken, renderPreviewToken, createCollectionPreviewToken, renderSingleWidget } =
  await import("../controllers/previewController.js");
const { exportProject } = await import("../controllers/exportController.js");
const { closeDb } = await import("../db/index.js");
const exportRepo = await import("../db/repositories/exportRepository.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const SNAPSHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "renderSnapshot");
const UPDATE = process.env.UPDATE_RENDER_SNAPSHOTS === "1";

const PROJECT_ID = "render-snapshot-uuid";
const PROJECT_FOLDER = "render-snapshot-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };
const project = { id: PROJECT_ID, folderName: PROJECT_FOLDER, defaultLanguage: "en", languages: [] };

const THEME_SETTINGS = {
  settings: { global: { general: [{ id: "favicon", type: "image", value: "favicon.svg" }], colors: [] } },
};

const LAYOUT =
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>\n` +
  `{% asset src: "base.css" %}\n` +
  `{% asset src: "site.js" %}\n` +
  `{% if site_icons.primaryIconHref != blank %}<link rel="icon" href="{{ site_icons.primaryIconHref }}">{% endif %}\n` +
  `{% if site_icons.appleTouchIconHref != blank %}<link rel="apple-touch-icon" href="{{ site_icons.appleTouchIconHref }}">{% endif %}\n` +
  `{% header_assets %}\n` +
  `</head><body class="{{ body_class }}">{{ header | raw }}<main>\n` +
  `{{ main_content | raw }}\n` +
  `<p class="bases" data-image="{{ imagePath }}" data-file="{{ filePath }}"></p>\n` +
  `{% image src: "hero.jpg" %}\n` +
  `{% placeholder_image %}\n` +
  `{% placeholder_image src: "custom-placeholder.svg" %}\n` +
  `</main>{{ footer | raw }}{% footer_assets %}</body></html>`;

const MEDIA_TEXT_SCHEMA = {
  type: "media-text",
  displayName: "Media text",
  settings: [
    { type: "image", id: "image", label: "Image" },
    { type: "richtext", id: "body", label: "Body", allow_images: true },
  ],
};

const MEDIA_TEXT_TEMPLATE =
  `{% enqueue_style src: "media-text.css" %}{% enqueue_script src: "media-text.js" %}` +
  `<section class="media-text" data-widget-id="{{ widget.id }}" data-widget-type="media-text">` +
  `{% image src: widget.settings.image %}<div class="body">{{ widget.settings.body | raw }}</div></section>`;

const NEWS_LIST_SCHEMA = { type: "news-list", displayName: "News list", settings: [] };
const NEWS_LIST_TEMPLATE =
  `<section data-widget-id="{{ widget.id }}" data-widget-type="news-list">` +
  `{% assign items = 'news' | collection %}{% for item in items %}` +
  `<a href="{{ item.url }}">{{ item.settings.title }}</a>{% image src: item.settings.image %}` +
  `<div class="item-body">{{ item.settings.body | raw }}</div>{% endfor %}</section>`;

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "Story",
  displayNamePlural: "News",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "image", id: "image", label: "Image" },
    { type: "richtext", id: "body", label: "Body", allow_images: true },
  ],
};

const NEWS_TEMPLATE =
  `<article class="news-item"><h1>{{ item.settings.title }}</h1>{% image src: item.settings.image %}` +
  `<div class="body">{{ item.settings.body | raw }}</div>{% placeholder_image aspect: "square" %}</article>`;

const RICHTEXT =
  `<p>Read <a href="/uploads/files/guide.pdf">the guide</a>.</p>` +
  `<p><img src="/uploads/images/hero.jpg" alt="Hero"></p>`;

const HEADER = { type: "header", settings: { logo: "/uploads/images/hero.jpg" }, blocks: {}, blocksOrder: [] };
const FOOTER = { type: "footer", settings: { text: "Footer" }, blocks: {}, blocksOrder: [] };

const PAGE = {
  id: "index",
  name: "Home",
  slug: "index",
  uuid: "p-index",
  seo: { title: "Home" },
  widgets: {
    w1: {
      type: "media-text",
      settings: { image: "/uploads/images/hero.jpg", body: RICHTEXT },
      blocks: {},
      blocksOrder: [],
    },
    w2: { type: "news-list", settings: {}, blocks: {}, blocksOrder: [] },
    w3: {
      type: "core-form",
      settings: { form_name: "Contact" },
      blocks: { b1: { type: "field", settings: { label: "Email", type: "email", required: true } } },
      blocksOrder: ["b1"],
    },
  },
  widgetsOrder: ["w1", "w2", "w3"],
};

const STORY = {
  id: "story",
  uuid: "u-story",
  slug: "story",
  schemaVersion: 1,
  created: "2026-01-02T00:00:00.000Z",
  updated: "2026-01-02T00:00:00.000Z",
  settings: { title: "Story", image: "/uploads/images/hero.jpg", body: RICHTEXT },
};

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3498db"/></svg>`;

async function seed() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Render Snapshot",
        siteTitle: "Render Snapshot",
        theme: "__render_snapshot_theme__",
        themeVersion: "1.0.0",
        siteUrl: "https://example.com/",
        created: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-01T00:00:00.000Z",
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  const imagesDir = getProjectImagesDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.outputFile(getProjectThemeJsonPath(PROJECT_FOLDER), JSON.stringify(THEME_SETTINGS, null, 2));
  await fs.writeFile(path.join(projectDir, "layout.liquid"), LAYOUT);

  await fs.outputFile(path.join(projectDir, "assets", "base.css"), "body{margin:0}");
  await fs.outputFile(path.join(projectDir, "assets", "site.js"), "void 0;");
  await fs.outputFile(path.join(projectDir, "assets", "custom-placeholder.svg"), FAVICON_SVG);

  const widget = async (dir, schema, template, assets = {}) => {
    await fs.outputFile(path.join(projectDir, "widgets", dir, "schema.json"), JSON.stringify(schema, null, 2));
    await fs.outputFile(path.join(projectDir, "widgets", dir, "widget.liquid"), template);
    for (const [name, body] of Object.entries(assets)) {
      await fs.outputFile(path.join(projectDir, "widgets", dir, name), body);
    }
  };
  await widget("media-text", MEDIA_TEXT_SCHEMA, MEDIA_TEXT_TEMPLATE, {
    "media-text.css": ".media-text{display:flex}",
    "media-text.js": "void 0;",
  });
  await widget("news-list", NEWS_LIST_SCHEMA, NEWS_LIST_TEMPLATE);
  await widget(
    path.join("global", "header"),
    { name: "header", settings: [{ type: "image", id: "logo", label: "Logo" }] },
    `<header data-widget-id="header">{% image src: widget.settings.logo %}</header>`,
  );
  await widget(
    path.join("global", "footer"),
    { name: "footer", settings: [{ type: "text", id: "text", label: "Text" }] },
    `<footer data-widget-id="footer">{{ widget.settings.text }}</footer>`,
  );

  await storage.write(scope, "pages/index.json", JSON.stringify(PAGE));
  await storage.write(scope, "pages/global/header.json", JSON.stringify(HEADER));
  await storage.write(scope, "pages/global/footer.json", JSON.stringify(FOOTER));
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
  await storage.write(scope, "collections/news/story.json", JSON.stringify(STORY));

  await fs.ensureDir(imagesDir);
  await fs.writeFile(path.join(imagesDir, "favicon.svg"), FAVICON_SVG);
  await fs.writeFile(
    path.join(imagesDir, "hero.jpg"),
    await sharp({ create: { width: 200, height: 150, channels: 3, background: { r: 100, g: 150, b: 200 } } })
      .jpeg()
      .toBuffer(),
  );
  await fs.outputFile(path.join(getProjectDir(PROJECT_FOLDER), "uploads", "files", "guide.pdf"), "%PDF-1.4\n%%EOF\n");

  await writeMediaFile(PROJECT_ID, {
    files: [
      {
        id: "hero",
        filename: "hero.jpg",
        type: "image/jpeg",
        path: "/uploads/images/hero.jpg",
        width: 200,
        height: 150,
        usedIn: ["page:index"],
      },
      {
        id: "fav",
        filename: "favicon.svg",
        type: "image/svg+xml",
        path: "/uploads/images/favicon.svg",
        usedIn: ["page:theme"],
      },
      {
        id: "guide",
        filename: "guide.pdf",
        type: "application/pdf",
        path: "/uploads/files/guide.pdf",
        usedIn: ["page:index"],
      },
    ],
  });
}

function mockReq(body = {}, { params = {}, query = {} } = {}) {
  return {
    body,
    query,
    params,
    scope,
    activeProject: project,
    adapters: { storage },
    app: { locals: {} },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = { _status: 200, _json: null, _sent: null, headersSent: false };
  res.status = (code) => {
    res._status = code;
    return res;
  };
  res.json = (payload) => {
    res._json = payload;
    res.headersSent = true;
    return res;
  };
  res.send = (payload) => {
    res._sent = payload;
    res.headersSent = true;
    return res;
  };
  res.setHeader = () => res;
  return res;
}

async function renderToken(token) {
  const res = mockRes();
  renderPreviewToken(mockReq({}, { params: { token } }), res);
  assert.equal(res._status, 200);
  return res._sent;
}

async function matchesSnapshot(name, html) {
  assert.equal(typeof html, "string", `${name}: nothing rendered`);
  const file = path.join(SNAPSHOT_DIR, name);
  if (UPDATE) {
    await fs.outputFile(file, html);
    return;
  }
  assert.ok(await fs.pathExists(file), `${name}: no stored snapshot (run with UPDATE_RENDER_SNAPSHOTS=1)`);
  assert.equal(html, await fs.readFile(file, "utf8"), `${name} differs from the stored snapshot`);
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

describe("render snapshots", () => {
  const pageData = { ...PAGE, globalWidgets: { header: HEADER, footer: FOOTER } };

  it("editor preview document", async () => {
    const res = mockRes();
    await createPreviewToken(mockReq({ pageData, themeSettings: THEME_SETTINGS, previewMode: "editor" }), res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    await matchesSnapshot("preview-editor.html", await renderToken(res._json.token));
  });

  it("standalone preview document", async () => {
    const res = mockRes();
    await createPreviewToken(mockReq({ pageData, themeSettings: THEME_SETTINGS, previewMode: "standalone" }), res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    await matchesSnapshot("preview-standalone.html", await renderToken(res._json.token));
  });

  it("widget re-render (morph)", async () => {
    const res = mockRes();
    await renderSingleWidget(
      mockReq({
        widgetId: "w1",
        widget: PAGE.widgets.w1,
        themeSettings: THEME_SETTINGS,
        page: PAGE,
        withThemeReads: true,
      }),
      res,
    );
    assert.equal(res._status, 200, JSON.stringify(res._json));
    await matchesSnapshot("preview-morph.html", res._json.html);
  });

  it("collection item preview document", async () => {
    const res = mockRes();
    await createCollectionPreviewToken(
      mockReq({ collectionType: "news", slug: "story", settings: STORY.settings }),
      res,
    );
    assert.equal(res._status, 200, JSON.stringify(res._json));
    await matchesSnapshot("preview-collection-item.html", await renderToken(res._json.token));
  });

  describe("export (publish mode)", () => {
    let dir;

    before(async () => {
      const res = mockRes();
      await exportProject(mockReq({}, { params: { projectId: PROJECT_ID } }), res);
      assert.equal(res._status, 200, JSON.stringify(res._json));
      const outputDir = exportRepo.getExports(PROJECT_ID)[0].outputDir;
      dir = path.isAbsolute(outputDir) ? outputDir : path.join(getPublishDir(), outputDir);
    });

    const exported = async (file) =>
      (await fs.readFile(path.join(dir, file), "utf8"))
        .replace(/\?v=[^"&#\s]+/g, "?v=TOKEN")
        .replace(/Made with Widgetizer v\S+/, "Made with Widgetizer vVERSION");

    it("page", async () => {
      await matchesSnapshot("export-index.html", await exported("index.html"));
    });

    it("collection item page", async () => {
      await matchesSnapshot("export-news-story.html", await exported(path.join("news", "story.html")));
    });
  });
});
