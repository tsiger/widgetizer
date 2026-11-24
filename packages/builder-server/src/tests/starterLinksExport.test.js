/**
 * Starter links end to end: a new project's slug-format links get their stable
 * references from the post-seed pass, then follow a renamed page and a renamed
 * collection item into the export, `#part` included, from a root page, a page in
 * a second language and an item page.
 *
 * Run with: node --test packages/builder-server/src/tests/starterLinksExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "starter-links-uuid";
const PROJECT_FOLDER = "starter-links-project";

const { storage, scope, projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-starter-links",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: "https://example.com",
    projectName: "Starter Links",
    siteTitle: "Starter Links",
    theme: "__starter_links_theme__",
  });

const { enrichSeededRichtextLinksFromDir } = await import("../utils/linkEnrichment.js");

const PROJECTS_SCHEMA = {
  type: "projects",
  schemaVersion: 1,
  displayName: "Project",
  displayNamePlural: "Projects",
  icon: "Folder",
  hasItemPages: true,
  slugPrefix: "projects",
  defaultSort: "manual",
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "link", id: "back", label: "Back" },
  ],
};

const CTA_SCHEMA = {
  type: "cta",
  displayName: "CTA",
  settings: [
    { type: "link", id: "part", label: "Part" },
    { type: "link", id: "item", label: "Item" },
    { type: "richtext", id: "body", label: "Body" },
  ],
};
const CTA_TEMPLATE =
  `<a class="part" href="{{ widget.settings.part.href }}">part</a>` +
  `<a class="item" href="{{ widget.settings.item.href }}">item</a>` +
  `<div class="body">{{ widget.settings.body | raw }}</div>`;

// What a theme ships: slug-format addresses, no references.
const starterWidgets = () => ({
  cta1: {
    type: "cta",
    settings: {
      part: { href: "furniture.html#living", text: "Living", target: "_self" },
      item: { href: "projects/industrial.html", text: "Industrial", target: "_self" },
      body: '<p><a href="furniture.html#living">Living</a> <a href="projects/industrial.html#photos">Photos</a></p>',
    },
  },
});

const pagesDir = () => getProjectPagesDir(PROJECT_FOLDER);
const writePage = (rel, page) => fs.outputFile(path.join(pagesDir(), rel), JSON.stringify(page));
const hrefOf = (html, className) => html.match(new RegExp(`<a class="${className}" href="([^"]*)"`))?.[1];

let dir;

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
  const projectDir = getProjectDir(PROJECT_FOLDER);

  await fs.outputFile(path.join(projectDir, "widgets", "cta", "schema.json"), JSON.stringify(CTA_SCHEMA));
  await fs.outputFile(path.join(projectDir, "widgets", "cta", "widget.liquid"), CTA_TEMPLATE);
  await storage.write(scope, "collection-types/projects/schema.json", JSON.stringify(PROJECTS_SCHEMA));
  await storage.write(
    scope,
    "collection-types/projects/template.liquid",
    `<a class="back" href="{{ item.settings.back.href }}">back</a>`,
  );

  await writePage("index.json", {
    id: "index",
    uuid: "p-index",
    slug: "index",
    name: "Home",
    seo: { title: "Home" },
    widgets: starterWidgets(),
    widgetsOrder: ["cta1"],
  });
  await writePage("furniture.json", {
    id: "furniture",
    uuid: "p-furniture",
    slug: "furniture",
    name: "Furniture",
    seo: { title: "Furniture" },
    widgets: {},
    widgetsOrder: [],
  });
  const item = {
    id: "industrial",
    uuid: "i-industrial",
    slug: "industrial",
    schemaVersion: 1,
    created: "2026-01-02T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    settings: { title: "Industrial", back: { href: "furniture.html#living", text: "Back", target: "_self" } },
  };
  await storage.write(scope, "collections/projects/industrial.json", JSON.stringify(item));

  // Project creation's last step, once the preset's items are seeded.
  await enrichSeededRichtextLinksFromDir({ projectDir });

  // A page in a second language holds the same widgets, references included,
  // as the app copies them when it makes one.
  const enrichedIndex = await fs.readJSON(path.join(pagesDir(), "index.json"));
  await writePage("el/index.json", { ...enrichedIndex, uuid: "p-el-index", language: "el", translationGroupId: "p-index" });

  // The owner renames the page and the item.
  const furniture = await fs.readJSON(path.join(pagesDir(), "furniture.json"));
  await fs.remove(path.join(pagesDir(), "furniture.json"));
  await writePage("sofas.json", { ...furniture, id: "sofas", slug: "sofas" });
  const enrichedItem = JSON.parse((await storage.read(scope, "collections/projects/industrial.json")).toString());
  await fs.remove(path.join(projectDir, "collections", "projects", "industrial.json"));
  await storage.write(scope, "collections/projects/factory.json", JSON.stringify({ ...enrichedItem, id: "factory", slug: "factory" }));

  const res = await runExport();
  assert.equal(res._status, 200, JSON.stringify(res._json));
  dir = latestExportDir();
});

after(async () => {
  await cleanup();
});

describe("starter links after their targets are renamed", () => {
  it("a page in the main language links to the new addresses, #part kept", async () => {
    const html = await fs.readFile(path.join(dir, "index.html"), "utf8");
    assert.equal(hrefOf(html, "part"), "sofas.html#living");
    assert.equal(hrefOf(html, "item"), "projects/factory.html");
    assert.ok(html.includes('href="sofas.html#living"'), html);
    assert.ok(html.includes('href="projects/factory.html#photos"'), html);
    assert.ok(!html.includes("furniture.html") && !html.includes("industrial.html"), "no old address is left");
  });

  it("a page in a second language reaches them with ../ in front", async () => {
    const html = await fs.readFile(path.join(dir, "el", "index.html"), "utf8");
    assert.equal(hrefOf(html, "part"), "../sofas.html#living");
    assert.equal(hrefOf(html, "item"), "../projects/factory.html");
    assert.ok(html.includes('href="../projects/factory.html#photos"'), html);
  });

  it("a link field inside a collection item follows the renamed page", async () => {
    const html = await fs.readFile(path.join(dir, "projects", "factory.html"), "utf8");
    assert.equal(hrefOf(html, "back"), "../sofas.html#living");
  });
});
