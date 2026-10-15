/**
 * `{% image %}` inside a `{% render %}`'d snippet, end to end.
 *
 * A snippet sees only its arguments and the render globals. The engine puts the
 * media map and the image base path on the globals, so a card snippet drawn from
 * a widget (root page) and from a collection item template (one directory deep)
 * must emit the same full image tag the top level does: depth-correct src,
 * srcset from the stored sizes, and the stored alt text. Before, both came out
 * as `src="undefined/…"` with no alt, width, height or srcset.
 *
 * The unit-level scope rules live in
 * packages/core/src/tags/__tests__/imageTagSnippet.test.js; this pins that the
 * engine actually stamps the values where a snippet can reach them.
 *
 * Run with: node --test packages/builder-server/src/tests/snippetImageExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "snippet-image-export-uuid";
const PROJECT_FOLDER = "snippet-image-export-project";

const {
  storage,
  scope,
  projectRepo,
  getProjectDir,
  getProjectPagesDir,
  runExport,
  latestExportDir,
  resetExports,
  seedProjectScaffold,
  cleanup,
} = await createExportHarness({
  rootPrefix: "widgetizer-snippet-image-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: "",
  projectName: "Snippet Image Project",
  siteTitle: "Snippet Image Site",
  theme: "__snippet_image_theme__",
});

const { getProjectImagesDir } = await import("../config.js");
const { writeMediaFile } = await import("../controllers/mediaController.js");

const CARD_SNIPPET = `<figure class="card">{% image src: src, size: 'medium', srcset: true, sizes: '50vw' %}</figure>`;

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  icon: "Newspaper",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
};

const ALT = "A coffee shop homepage";
const ALT_EL = "Αρχική σελίδα καφετέριας";

async function seedFixture() {
  const projectDir = getProjectDir(PROJECT_FOLDER);
  const imagesDir = getProjectImagesDir(PROJECT_FOLDER);
  await fs.ensureDir(imagesDir);

  await fs.outputFile(path.join(projectDir, "snippets", "card.liquid"), CARD_SNIPPET);
  await fs.outputFile(path.join(projectDir, "widgets", "cards", "schema.json"), JSON.stringify({ type: "cards", settings: [] }));
  await fs.outputFile(
    path.join(projectDir, "widgets", "cards", "widget.liquid"),
    `<section class="cards">{% render 'card', src: '/uploads/images/shot.jpg' %}</section>`,
  );
  await fs.writeFile(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json"),
    JSON.stringify({
      name: "Home",
      slug: "index",
      uuid: "p-index",
      seo: { title: "Home" },
      widgets: { w1: { type: "cards", settings: {} } },
      widgetsOrder: ["w1"],
    }),
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(
    scope,
    "collection-types/news/template.liquid",
    `<article>{% render 'card', src: '/uploads/images/shot.jpg' %}</article>`,
  );
  await storage.write(
    scope,
    "collections/news/alpha.json",
    JSON.stringify({
      id: "alpha",
      uuid: "u-alpha",
      slug: "alpha",
      schemaVersion: 1,
      created: "2026-01-02T00:00:00.000Z",
      updated: "2026-01-02T00:00:00.000Z",
      settings: { title: "Alpha" },
    }),
  );

  for (const [name, width] of [["shot.jpg", 1920], ["shot-small.jpg", 480], ["shot-medium.jpg", 1024]]) {
    const height = Math.round((width * 10) / 16);
    await fs.writeFile(
      path.join(imagesDir, name),
      await sharp({ create: { width, height, channels: 3, background: { r: 60, g: 90, b: 120 } } }).jpeg().toBuffer(),
    );
  }
  await writeMediaFile(PROJECT_ID, {
    files: [
      {
        id: "shot",
        filename: "shot.jpg",
        type: "image/jpeg",
        path: "/uploads/images/shot.jpg",
        width: 1920,
        height: 1200,
        metadata: { alt: ALT, title: "", caption: "" },
        translations: { el: { alt: ALT_EL, title: null, caption: null } },
        sizes: {
          small: { path: "/uploads/images/shot-small.jpg", width: 480, height: 300 },
          medium: { path: "/uploads/images/shot-medium.jpg", width: 1024, height: 640 },
        },
        usedIn: ["page:index"],
      },
    ],
  });
}

// Export pretty-prints the HTML, spreading attributes and srcset entries over lines.
const compact = (html) => html.replace(/\s+/g, " ").replace(/="\s+/g, '="').replace(/\s+"/g, '"');
const imgIn = (html, wrapper) => compact(html).match(new RegExp(`<${wrapper}[^>]*>[\\s\\S]*?(<img[^>]*>)`))?.[1];

async function exportSite() {
  await resetExports();
  const res = await runExport();
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
}

before(async () => {
  await seedProjectScaffold();
  await seedFixture();
});

after(async () => {
  await cleanup();
});

describe("export — {% image %} inside a render'd snippet", () => {
  before(exportSite);

  it("draws the full image tag from a widget on a root page", async () => {
    const img = imgIn(await fs.readFile(path.join(latestExportDir(), "index.html"), "utf8"), "section");
    assert.ok(img, "the card snippet should emit an <img>");
    assert.match(img, /src="assets\/images\/shot-medium\.jpg"/);
    assert.match(img, /srcset="assets\/images\/shot-small\.jpg 480w, assets\/images\/shot-medium\.jpg 1024w, assets\/images\/shot\.jpg 1920w"/);
    assert.match(img, new RegExp(`alt="${ALT}"`));
    assert.match(img, /width="1024" height="640"/);
  });

  it("draws it one directory deep from a collection item template", async () => {
    const img = imgIn(await fs.readFile(path.join(latestExportDir(), "news", "alpha.html"), "utf8"), "article");
    assert.ok(img, "the card snippet should emit an <img>");
    assert.match(img, /src="\.\.\/assets\/images\/shot-medium\.jpg"/);
    assert.match(img, /\.\.\/assets\/images\/shot-small\.jpg 480w/);
    assert.match(img, new RegExp(`alt="${ALT}"`));
  });

  it("never falls back to an undefined base path", async () => {
    for (const file of ["index.html", path.join("news", "alpha.html")]) {
      const html = await fs.readFile(path.join(latestExportDir(), file), "utf8");
      assert.doesNotMatch(html, /undefined\//, file);
    }
  });
});

// A snippet has no `page`, so the language comes from the page on the globals.
// The header renders before the page body, and on an item page before the item
// template, so this is the path where a stale or missing language would show.
describe("export — a header snippet's image on a translated site", () => {
  before(async () => {
    const projectDir = getProjectDir(PROJECT_FOLDER);
    const pagesDir = getProjectPagesDir(PROJECT_FOLDER);
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });

    const headerDir = path.join(projectDir, "widgets", "global", "header");
    await fs.outputFile(path.join(headerDir, "schema.json"), JSON.stringify({ name: "Header", settings: [] }));
    await fs.outputFile(
      path.join(headerDir, "widget.liquid"),
      `<header class="site">{% render 'card', src: '/uploads/images/shot.jpg' %}</header>`,
    );
    for (const dir of [pagesDir, path.join(pagesDir, "el")]) {
      await fs.outputFile(path.join(dir, "global", "header.json"), JSON.stringify({ type: "header", settings: {} }));
    }
    await fs.outputFile(
      path.join(pagesDir, "el", "index.json"),
      JSON.stringify({ id: "index", slug: "index", uuid: "p-el-index", name: "Arxiki", language: "el", seo: { title: "Arxiki" }, widgets: {}, widgetsOrder: [] }),
    );
    await storage.write(
      scope,
      "collections/news/el/alpha.json",
      JSON.stringify({
        id: "alpha",
        uuid: "u-el-alpha",
        translationGroupId: "u-alpha",
        slug: "alpha",
        schemaVersion: 1,
        created: "2026-01-02T00:00:00.000Z",
        updated: "2026-01-02T00:00:00.000Z",
        settings: { title: "Alfa" },
      }),
    );

    await exportSite();
  });

  const headerImg = async (...file) =>
    imgIn(await fs.readFile(path.join(latestExportDir(), ...file), "utf8"), "header class=\"site\"");

  it("uses the default language's alt on a default-language page", async () => {
    assert.match(await headerImg("index.html"), new RegExp(`alt="${ALT}"`));
  });

  it("uses the translated alt on a translated page", async () => {
    const img = await headerImg("el", "index.html");
    assert.ok(img, "the header snippet should emit an <img>");
    assert.match(img, new RegExp(`alt="${ALT_EL}"`));
    assert.match(img, /src="\.\.\/assets\/images\/shot-medium\.jpg"/);
  });

  it("uses the translated alt on a translated collection item page", async () => {
    const img = await headerImg("el", "news", "alpha.html");
    assert.ok(img, "the header snippet should emit an <img>");
    assert.match(img, new RegExp(`alt="${ALT_EL}"`));
    assert.match(img, /src="\.\.\/\.\.\/assets\/images\/shot-medium\.jpg"/);
  });
});
