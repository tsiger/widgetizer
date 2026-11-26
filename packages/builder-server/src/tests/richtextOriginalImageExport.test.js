/**
 * A path written into content that names an image's original. An export leaves
 * the original out once the image has a `large` size, so such a path is
 * published as the `large` file; an image with no `large` size, and an SVG, keep
 * their original, which is in the export.
 *
 * Run with: node --test packages/builder-server/src/tests/richtextOriginalImageExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "richtext-original-uuid";
const PROJECT_FOLDER = "richtext-original-project";

const { storage, scope, getProjectDir, getProjectPagesDir, runExport, latestExportDir, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-richtext-original",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://example.com",
    projectName: "Richtext Original",
    siteTitle: "Richtext Original",
    theme: "__richtext_original_theme__",
  });
const { writeMediaFile } = await import("../controllers/mediaController.js");

const NEWS_SCHEMA = {
  type: "news",
  schemaVersion: 1,
  displayName: "News",
  displayNamePlural: "News",
  icon: "Newspaper",
  hasItemPages: true,
  slugPrefix: "news",
  defaultSort: "manual",
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "richtext", id: "body", label: "Body", allow_images: true },
  ],
};

// What the editor stores: portable paths that name the files as uploaded.
const BODY =
  '<p><a href="/uploads/images/hero.jpg">Full size</a><img src="/uploads/images/hero.jpg" alt="">' +
  '<img src="/uploads/images/small.jpg" alt=""><img src="/uploads/images/logo.svg" alt=""></p>';

let dir;
const read = (rel) => fs.readFile(path.join(dir, rel), "utf8");
const published = (rel) => fs.pathExists(path.join(dir, rel));

before(async () => {
  await seedProjectScaffold();
  const projectDir = getProjectDir(PROJECT_FOLDER);

  const images = path.join(projectDir, "uploads", "images");
  for (const name of ["hero.jpg", "hero-medium.jpg", "hero-large.jpg", "small.jpg", "small-medium.jpg", "logo.svg"]) {
    await fs.outputFile(path.join(images, name), name);
  }
  await writeMediaFile(PROJECT_ID, {
    files: [
      {
        id: "img-hero",
        filename: "hero.jpg",
        path: "/uploads/images/hero.jpg",
        type: "image/jpeg",
        width: 3000,
        height: 2000,
        usedIn: ["page:index"],
        sizes: {
          medium: { path: "/uploads/images/hero-medium.jpg", width: 1024, height: 683 },
          large: { path: "/uploads/images/hero-large.jpg", width: 1600, height: 1067 },
        },
      },
      {
        id: "img-small",
        filename: "small.jpg",
        path: "/uploads/images/small.jpg",
        type: "image/jpeg",
        width: 1200,
        height: 800,
        usedIn: ["page:index"],
        sizes: { medium: { path: "/uploads/images/small-medium.jpg", width: 1024, height: 683 } },
      },
      { id: "img-logo", filename: "logo.svg", path: "/uploads/images/logo.svg", type: "image/svg+xml", usedIn: ["page:index"] },
    ],
  });

  const widgetDir = path.join(projectDir, "widgets", "prose");
  await fs.outputFile(
    path.join(widgetDir, "schema.json"),
    JSON.stringify({ type: "prose", displayName: "Prose", settings: [{ type: "richtext", id: "body", label: "Body", allow_images: true }, { type: "text", id: "banner", label: "Banner" }] }),
  );
  // The second line prints a stored path as written, as a theme's inline style does.
  await fs.outputFile(
    path.join(widgetDir, "widget.liquid"),
    `<div class="prose">{{ widget.settings.body | raw }}</div>\n<div class="banner" style="background-image: url('{{ widget.settings.banner }}')"></div>`,
  );
  await fs.outputFile(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json"),
    JSON.stringify({
      id: "index",
      uuid: "p-index",
      slug: "index",
      name: "Home",
      seo: { title: "Home" },
      widgets: { w1: { type: "prose", settings: { body: BODY, banner: "/uploads/images/hero.jpg" } } },
      widgetsOrder: ["w1"],
    }),
  );
  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  await storage.write(scope, "collection-types/news/template.liquid", `<article>{{ item.settings.body | raw }}</article>`);
  await storage.write(
    scope,
    "collections/news/hello.json",
    JSON.stringify({ id: "hello", uuid: "i-hello", slug: "hello", schemaVersion: 1, settings: { title: "Hello", body: BODY } }),
  );

  const res = await runExport();
  assert.equal(res._status, 200, JSON.stringify(res._json));
  dir = latestExportDir();
});

after(async () => {
  await cleanup();
});

describe("a path in content that names an image's original", () => {
  it("is published as the large size when the image has one, in a link and in an image", async () => {
    const html = await read("index.html");
    assert.ok(html.includes('href="assets/images/hero-large.jpg"'), html);
    assert.ok(html.includes('src="assets/images/hero-large.jpg"'), html);
    assert.ok(!html.includes("assets/images/hero.jpg"), "no reference to the original is left");
  });

  it("points at a file the export holds, and the original stays out", async () => {
    assert.equal(await published("assets/images/hero-large.jpg"), true);
    assert.equal(await published("assets/images/hero.jpg"), false);
  });

  it("keeps the original of an image with no large size, and of an SVG, which are published", async () => {
    const html = await read("index.html");
    assert.ok(html.includes('src="assets/images/small.jpg"'), html);
    assert.ok(html.includes('src="assets/images/logo.svg"'), html);
    assert.equal(await published("assets/images/small.jpg"), true);
    assert.equal(await published("assets/images/logo.svg"), true);
  });

  it("is renamed in a stored path a template prints as written", async () => {
    const html = await read("index.html");
    assert.match(html, /url\((&quot;|&#39;|')assets\/images\/hero-large\.jpg(&quot;|&#39;|')\)/);
  });

  it("is renamed on a collection item's page too, one folder down", async () => {
    const html = await read("news/hello.html");
    assert.ok(html.includes('href="../assets/images/hero-large.jpg"'), html);
    assert.ok(html.includes('src="../assets/images/hero-large.jpg"'), html);
    assert.ok(html.includes('src="../assets/images/small.jpg"'), html);
    assert.ok(!html.includes("assets/images/hero.jpg"), "no reference to the original is left");
  });
});
