/**
 * Structured data end-to-end export test.
 *
 * Drives the real `exportProject` controller and reads the JSON-LD graph back out
 * of the exported HTML: the homepage's site and identity nodes, WebPage on every
 * other page and item, Clean URLs ids, the logo file actually shipped, the
 * readiness list in the export result, and no script at all without a Site URL.
 *
 * Run with: node --test packages/builder-server/src/tests/structuredDataExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "structured-data-export-uuid";
const PROJECT_FOLDER = "structured-data-export-project";
const SITE = "https://crumbly.example";

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
  rootPrefix: "widgetizer-structured-data-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE,
  projectName: "Structured Data Export Project",
  siteTitle: "Crumbly",
  theme: "__structured_data_export_theme__",
});

const { writeMediaFile } = await import("../controllers/mediaController.js");
const { refreshAllMediaUsage } = await import("../services/mediaUsageService.js");

const IDENTITY = {
  category: "bakery",
  logo: "/uploads/images/logo.svg",
  email: "hello@crumbly.example",
  profiles: { instagram: "https://instagram.com/crumbly" },
  locations: [
    {
      streetAddress: "1 Baker St",
      addressLocality: "Athens",
      addressCountry: "GR",
      openingHours: { monday: [{ opens: "07:00", closes: "14:00" }] },
    },
  ],
  text: { publicName: "Crumbly Bakery" },
};

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

function graphOf(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  if (scripts.length === 0) return null;
  assert.equal(scripts.length, 1, "one JSON-LD script per page");
  return JSON.parse(scripts[0][1])["@graph"];
}

async function exportedGraph(dir, relativePath) {
  return graphOf(await fs.readFile(path.join(dir, ...relativePath.split("/")), "utf8"));
}

async function exportWith(projectChanges) {
  await resetExports();
  projectRepo.updateProject(PROJECT_ID, projectChanges);
  const res = await runExport();
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  return { dir: latestExportDir(), result: res._json };
}

before(async () => {
  await seedProjectScaffold();
  const projectDir = getProjectDir(PROJECT_FOLDER);

  await fs.writeFile(
    path.join(getProjectPagesDir(PROJECT_FOLDER), "about.json"),
    JSON.stringify({ name: "About", slug: "about", uuid: "p-about", seo: { title: "About us" }, widgets: {}, widgetsOrder: [] }),
  );

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", `<article>{{ item.settings.title }}</article>`);
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

  await fs.outputFile(
    path.join(projectDir, "uploads", "images", "logo.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>`,
  );
  await writeMediaFile(PROJECT_ID, {
    files: [{ id: "logo", filename: "logo.svg", type: "image/svg+xml", path: "/uploads/images/logo.svg", usedIn: [] }],
  });

  projectRepo.updateProject(PROJECT_ID, { siteIdentity: IDENTITY });
  await refreshAllMediaUsage(PROJECT_ID);
});

after(async () => {
  await cleanup();
});

describe("export — structured data with a Site URL", () => {
  let dir;
  let result;

  before(async () => {
    ({ dir, result } = await exportWith({ cleanUrls: false, siteUrl: SITE }));
  });

  it("puts the site, the business and the page on the homepage", async () => {
    const graph = await exportedGraph(dir, "index.html");
    assert.deepEqual(
      graph.map((node) => node["@id"]),
      [`${SITE}/#website`, `${SITE}/#identity`, `${SITE}/#webpage`],
    );
    const [website, bakery] = graph;
    assert.equal(website.name, "Crumbly Bakery");
    assert.deepEqual(website.publisher, { "@id": `${SITE}/#identity` });
    assert.equal(bakery["@type"], "Bakery");
    assert.equal(bakery.logo, `${SITE}/assets/images/logo.svg`);
    assert.equal(bakery.address.streetAddress, "1 Baker St");
    assert.deepEqual(bakery.sameAs, ["https://instagram.com/crumbly"]);
  });

  it("ships the logo file the graph points at", async () => {
    assert.ok(await fs.pathExists(path.join(dir, "assets", "images", "logo.svg")));
  });

  it("gives other pages and items only a WebPage", async () => {
    assert.deepEqual(await exportedGraph(dir, "about.html"), [
      {
        "@type": "WebPage",
        "@id": `${SITE}/about.html#webpage`,
        url: `${SITE}/about.html`,
        name: "About us",
        isPartOf: { "@id": `${SITE}/#website` },
      },
    ]);
    const item = await exportedGraph(dir, "news/alpha.html");
    assert.deepEqual(
      item.map((node) => [node["@type"], node["@id"]]),
      [["WebPage", `${SITE}/news/alpha.html#webpage`]],
    );
  });

  it("reports readiness in the export result", () => {
    assert.deepEqual(result.structuredData.readiness, [
      { item: "siteUrl", ok: true },
      { item: "name", ok: true },
      { item: "logo", ok: true },
      { item: "address", ok: true },
    ]);
  });
});

describe("export — structured data with Clean URLs", () => {
  it("drops .html from page ids", async () => {
    const { dir } = await exportWith({ cleanUrls: true, siteUrl: SITE });
    const [page] = await exportedGraph(dir, "about.html");
    assert.equal(page["@id"], `${SITE}/about#webpage`);
    const item = await exportedGraph(dir, "news/alpha.html");
    assert.equal(item[0]["@id"], `${SITE}/news/alpha#webpage`);
  });
});

describe("export — structured data without a Site URL", () => {
  it("writes no script and says why in the result", async () => {
    const { dir, result } = await exportWith({ cleanUrls: false, siteUrl: "" });
    assert.equal(await exportedGraph(dir, "index.html"), null);
    assert.equal(await exportedGraph(dir, "about.html"), null);
    assert.deepEqual(result.structuredData.readiness[0], { item: "siteUrl", ok: false });
  });
});
