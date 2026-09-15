/**
 * Structured data end-to-end export test.
 *
 * Drives the real `exportProject` controller and reads the JSON-LD graph back out
 * of the exported HTML: the homepage's site and identity nodes, WebPage on every
 * other page and item, the BlogPosting a collection schema declares (built from
 * the same values the page shows), Clean URLs ids, the logo and featured image
 * actually shipped, the readiness list in the export result, and no script at all
 * without a Site URL.
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
  structuredData: {
    type: "BlogPosting",
    headline: "title",
    datePublished: "date",
    description: "excerpt",
    image: "featured_image",
    articleBody: "body",
  },
  settings: [
    { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
    { type: "date", id: "date", label: "Date", usedAsDate: true },
    { type: "textarea", id: "excerpt", label: "Excerpt" },
    { type: "image", id: "featured_image", label: "Featured image" },
    { type: "richtext", id: "body", label: "Body" },
  ],
};

const NEWS_TEMPLATE =
  `<article><h1 class="headline">{{ item.settings.title }}</h1>` +
  `<time>{{ item.settings.date }}</time><p class="excerpt">{{ item.settings.excerpt }}</p>` +
  `<div class="body">{{ item.settings.body | raw }}</div></article>`;

const ALPHA_SETTINGS = {
  title: "Fresh bread & butter",
  date: "2026-01-02",
  excerpt: "Warm, crusty <and> honest",
  featured_image: "/uploads/images/loaf.svg",
  body:
    "<p>Flour &amp; water.</p>" +
    '<p>un<strong>break</strong>able <a href="https://example.com/?q=a>b">Read more</a></p>' +
    "<p>We are <strong>open</strong>.</p><script>alert(1)</script>",
};

function graphOf(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  if (scripts.length === 0) return null;
  assert.equal(scripts.length, 1, "one JSON-LD script per page");
  return JSON.parse(scripts[0][1])["@graph"];
}

async function exportedHtml(dir, relativePath) {
  return fs.readFile(path.join(dir, ...relativePath.split("/")), "utf8");
}

async function exportedGraph(dir, relativePath) {
  return graphOf(await exportedHtml(dir, relativePath));
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
  await storage.write(scope, "collection-types/news/template.liquid", NEWS_TEMPLATE);
  await storage.write(
    scope,
    "collections/news/alpha.json",
    JSON.stringify({
      id: "alpha",
      uuid: "u-alpha",
      slug: "alpha",
      schemaVersion: 1,
      created: "2026-01-02T00:00:00.000Z",
      updated: "2026-01-05T09:30:00.000Z",
      settings: ALPHA_SETTINGS,
    }),
  );

  await storage.write(
    scope,
    "collections/news/beta.json",
    JSON.stringify({
      id: "beta",
      uuid: "u-beta",
      slug: "beta",
      schemaVersion: 1,
      created: "2026-01-03T00:00:00.000Z",
      updated: "2026-01-03T00:00:00.000Z",
      settings: { title: "Beta", date: "2026-01-03", excerpt: "", body: "<p>Some text</p>" },
    }),
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>`;
  await fs.outputFile(path.join(projectDir, "uploads", "images", "logo.svg"), svg);
  await fs.outputFile(path.join(projectDir, "uploads", "images", "loaf.svg"), svg);
  await writeMediaFile(PROJECT_ID, {
    files: [
      { id: "logo", filename: "logo.svg", type: "image/svg+xml", path: "/uploads/images/logo.svg", usedIn: [] },
      { id: "loaf", filename: "loaf.svg", type: "image/svg+xml", path: "/uploads/images/loaf.svg", usedIn: [] },
    ],
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

  it("ships the logo and the featured image the graph points at", async () => {
    assert.ok(await fs.pathExists(path.join(dir, "assets", "images", "logo.svg")));
    assert.ok(await fs.pathExists(path.join(dir, "assets", "images", "loaf.svg")));
  });

  it("gives an ordinary page its WebPage and breadcrumb trail", async () => {
    assert.deepEqual(await exportedGraph(dir, "about.html"), [
      {
        "@type": "WebPage",
        "@id": `${SITE}/about.html#webpage`,
        url: `${SITE}/about.html`,
        name: "About us",
        isPartOf: { "@id": `${SITE}/#website` },
        breadcrumb: { "@id": `${SITE}/about.html#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE}/about.html#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about.html` },
        ],
      },
    ]);
  });

  it("gives a News item its WebPage and a BlogPosting built from the fields the schema maps", async () => {
    const graph = await exportedGraph(dir, "news/alpha.html");
    assert.deepEqual(
      graph.map((node) => [node["@type"], node["@id"]]),
      [
        ["WebPage", `${SITE}/news/alpha.html#webpage`],
        ["BlogPosting", `${SITE}/news/alpha.html#article`],
        ["BreadcrumbList", `${SITE}/news/alpha.html#breadcrumb`],
      ],
    );
    assert.deepEqual(graph[1], {
      "@type": "BlogPosting",
      "@id": `${SITE}/news/alpha.html#article`,
      url: `${SITE}/news/alpha.html`,
      headline: "Fresh bread & butter",
      datePublished: "2026-01-02",
      dateModified: "2026-01-05T09:30:00.000Z",
      description: "Warm, crusty <and> honest",
      image: `${SITE}/assets/images/loaf.svg`,
      articleBody: "Flour & water.\nunbreakable Read more\nWe are open.",
      isPartOf: { "@id": `${SITE}/news/alpha.html#webpage` },
      publisher: { "@id": `${SITE}/#identity` },
    });
  });

  it("matches what the page visibly shows", async () => {
    const html = await exportedHtml(dir, "news/alpha.html");
    const article = (await exportedGraph(dir, "news/alpha.html"))[1];
    const visible = (className) =>
      html
        .match(new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)</`))[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
    assert.equal(article.headline, visible("headline"));
    assert.equal(article.description, visible("excerpt"));
    assert.ok(!html.includes("<script>alert(1)</script>"), "the body is sanitized before render");
  });

  it("reports readiness in the export result", () => {
    assert.deepEqual(result.structuredData.readiness, [
      { item: "siteUrl", ok: true },
      { item: "name", ok: true },
      { item: "logo", ok: true },
      { item: "address", ok: true },
    ]);
  });

  it("reports items with empty article fields and items no page lists", () => {
    const byPathThenCode = (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code);
    assert.deepEqual([...result.structuredData.warnings].sort(byPathThenCode), [
      { path: "news/alpha.html", code: "noListingPage" },
      { path: "news/beta.html", code: "emptyArticleFields", fields: ["description", "image"] },
      { path: "news/beta.html", code: "noListingPage" },
    ]);
  });
});

describe("export — structured data with Clean URLs", () => {
  it("drops .html from page and article ids, keeping absolute image URLs", async () => {
    const { dir } = await exportWith({ cleanUrls: true, siteUrl: SITE });
    const [page] = await exportedGraph(dir, "about.html");
    assert.equal(page["@id"], `${SITE}/about#webpage`);
    const [itemPage, article] = await exportedGraph(dir, "news/alpha.html");
    assert.equal(itemPage["@id"], `${SITE}/news/alpha#webpage`);
    assert.equal(article["@id"], `${SITE}/news/alpha#article`);
    assert.deepEqual(article.isPartOf, { "@id": `${SITE}/news/alpha#webpage` });
    assert.equal(article.image, `${SITE}/assets/images/loaf.svg`);
  });
});

describe("export — listing page reporting", () => {
  let originalIndex;
  let originalAbout;

  const pagePath = (slug) => path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`);
  const writePage = (slug, name, widgets) =>
    fs.writeFile(
      pagePath(slug),
      JSON.stringify({ name, slug, uuid: `p-${slug}`, seo: { title: name }, widgets, widgetsOrder: Object.keys(widgets) }),
    );
  const grid = (anchor) => ({ w1: { type: "news-grid", settings: anchor ? { listing_anchor: true } : {} } });

  const listingWarnings = async () => {
    const { result } = await exportWith({ cleanUrls: false, siteUrl: SITE });
    return result.structuredData.warnings
      .filter((warning) => warning.code !== "emptyArticleFields")
      .sort((a, b) => a.path.localeCompare(b.path));
  };

  before(async () => {
    const widgetDir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "news-grid");
    await fs.outputFile(
      path.join(widgetDir, "schema.json"),
      JSON.stringify({ type: "news-grid", collection: { type: "news" }, settings: [] }),
    );
    await fs.outputFile(path.join(widgetDir, "widget.liquid"), `<div class="grid"></div>`);
    originalIndex = await fs.readFile(pagePath("index"), "utf8");
    originalAbout = await fs.readFile(pagePath("about"), "utf8");
  });

  after(async () => {
    await fs.writeFile(pagePath("index"), originalIndex);
    await fs.writeFile(pagePath("about"), originalAbout);
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "widgets", "news-grid"));
  });

  it("accepts a homepage listing flagged as the collection's anchor", async () => {
    await writePage("index", "Home", grid(true));
    await writePage("about", "About", grid(false));
    assert.deepEqual(await listingWarnings(), []);
  });

  it("accepts the homepage as the only page listing the collection", async () => {
    await writePage("index", "Home", grid(false));
    await fs.writeFile(pagePath("about"), originalAbout);
    assert.deepEqual(await listingWarnings(), []);
  });

  it("reports two unanchored listing pages as ambiguous, not as missing", async () => {
    await writePage("index", "Home", grid(false));
    await writePage("about", "About", grid(false));
    assert.deepEqual(await listingWarnings(), [
      { path: "news/alpha.html", code: "ambiguousListingPage" },
      { path: "news/beta.html", code: "ambiguousListingPage" },
    ]);
  });
});

describe("export — structured data without a Site URL", () => {
  it("writes no script and says why in the result", async () => {
    const { dir, result } = await exportWith({ cleanUrls: false, siteUrl: "" });
    assert.equal(await exportedGraph(dir, "index.html"), null);
    assert.equal(await exportedGraph(dir, "about.html"), null);
    assert.equal(await exportedGraph(dir, "news/alpha.html"), null);
    assert.deepEqual(result.structuredData.readiness[0], { item: "siteUrl", ok: false });
  });
});
