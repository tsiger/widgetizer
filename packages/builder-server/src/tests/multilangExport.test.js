/**
 * Export on a translated site (§7, §7a, §7b).
 *
 * The folder layout, the language an export refuses to publish, the SEO
 * artifacts that describe every language, and the form streams that must not
 * merge across them.
 *
 * Run with: node --test packages/builder-server/src/tests/multilangExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

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

const PROJECT_ID = "multilang-export-uuid";
const PROJECT_FOLDER = "multilang-export-project";
const SITE = "https://example.com";

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
  rootPrefix: "widgetizer-multilang-export",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE,
  projectName: "Multilang Export",
  siteTitle: "Multilang Export",
  theme: "__multilang_export_theme__",
});

const page = (slug, name, extra = {}) => ({
  id: slug,
  uuid: `p-${extra.language || "en"}-${slug}`,
  slug,
  name,
  seo: { title: name },
  widgets: {},
  widgetsOrder: [],
  ...extra,
});

const writePage = async (language, slug, name, extra = {}) => {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(path.join(dir, `${slug}.json`), JSON.stringify(page(slug, name, { ...extra, language })));
};

const formWidget = (label) => ({
  w1: {
    type: "core-form",
    settings: { form_name: label },
    blocks: { b1: { type: "field", settings: { label: "Your name", type: "text", required: true } } },
    blocksOrder: ["b1"],
  },
});

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { siteUrl: SITE });
  projectRepo.updateProject(PROJECT_ID, { languages: ["el", "de"] }, { seeded: true });

  await writePage("", "index", "Home");
  await writePage("", "about", "About");
  await writePage("el", "index", "Arxiki");
  await writePage("el", "sxetika", "Sxetika", { uuid: "p-el-sxetika", translationGroupId: "p-en-about" });
  // German has a page but NO homepage, so the export must refuse to publish it.
  await writePage("de", "ueber-uns", "Ueber uns", { uuid: "p-de-ueber", translationGroupId: "p-en-about" });
});

after(async () => {
  await cleanup();
});

async function exportSite(options = {}) {
  await resetExports();
  const res = await runExport(options);
  assert.equal(res._status, 200, JSON.stringify(res._json));
  return { dir: latestExportDir(), body: res._json };
}

describe("the folder layout", () => {
  it("puts the default language at the root and every other one in its own folder", async () => {
    const { dir } = await exportSite();
    assert.equal(await fs.pathExists(path.join(dir, "index.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "about.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "el", "index.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "el", "sxetika.html")), true);
  });
});

// §7b: an enabled language is not an exportable one. A language with no
// homepage is left out whole, and NAMED, because a partially published site is
// otherwise invisible until a visitor finds the hole.
describe("a language with no homepage", () => {
  it("is not written at all", async () => {
    const { dir } = await exportSite();
    assert.equal(await fs.pathExists(path.join(dir, "de")), false);
  });

  it("is named in the export result", async () => {
    const { body } = await exportSite();
    assert.deepEqual(body.warnings, [{ code: "LANGUAGE_SKIPPED", language: "de" }]);
  });

  it("says nothing when every language has one", async () => {
    await writePage("de", "index", "Startseite", { uuid: "p-de-home" });
    try {
      const { dir, body } = await exportSite();
      assert.deepEqual(body.warnings, []);
      assert.equal(await fs.pathExists(path.join(dir, "de", "index.html")), true);
    } finally {
      await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "de", "index.json"));
    }
  });

  it("still fails outright when the DEFAULT language has no homepage", async () => {
    const homePath = path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json");
    const saved = await fs.readFile(homePath, "utf8");
    await fs.remove(homePath);
    try {
      await resetExports();
      const res = await runExport();
      assert.equal(res._status, 400);
      assert.match(res._json.error || res._json.message || "", /homepage/i);
    } finally {
      await fs.outputFile(homePath, saved);
    }
  });
});

describe("the SEO artifacts", () => {
  it("describe every published language, and no skipped one", async () => {
    const { dir } = await exportSite();
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");

    assert.ok(sitemap.includes(`<loc>${SITE}/about.html</loc>`));
    assert.ok(sitemap.includes(`<loc>${SITE}/el/sxetika.html</loc>`));
    assert.ok(sitemap.includes(`<loc>${SITE}/el/</loc>`), "a homepage is its folder");
    assert.ok(!sitemap.includes("/de/"), "a language that was not published is not described");
  });

  it("carry the alternates of a page that has a sibling", async () => {
    const { dir } = await exportSite();
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");

    assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), sitemap);
    // The formatter reflows attributes, so each alternate is read as its own
    // <xhtml:link> rather than as one exact string.
    const links = sitemap.match(/<xhtml:link[^>]*>/g) || [];
    const linkFor = (hreflang) => links.find((link) => link.includes(`hreflang="${hreflang}"`)) || "";
    assert.ok(linkFor("el").includes(`${SITE}/el/sxetika.html`), links.join(", "));
    assert.ok(linkFor("en").includes(`${SITE}/about.html`), links.join(", "));
    assert.ok(linkFor("x-default").includes(`${SITE}/about.html`), links.join(", "));
  });

  it("block a translated page at the address it is actually published under", async () => {
    await writePage("el", "krifo", "Krifo", { uuid: "p-el-krifo", seo: { robots: "noindex" } });
    try {
      const { dir } = await exportSite();
      const robots = await fs.readFile(path.join(dir, "robots.txt"), "utf8");
      assert.ok(robots.includes("Disallow: /el/krifo.html"), robots);
    } finally {
      await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "krifo.json"));
    }
  });
});

// A form copied into another language collects that language's submissions. One
// merged stream would either mix them or fail the export the moment a
// translated field drifts from its source.
describe("forms", () => {
  before(async () => {
    await writePage("", "contact", "Contact", { widgets: formWidget("Contact"), widgetsOrder: ["w1"] });
    await writePage("el", "epikoinonia", "Epikoinonia", {
      uuid: "p-el-epikoinonia",
      widgets: formWidget("Contact"),
      widgetsOrder: ["w1"],
    });
  });

  after(async () => {
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "contact.json"));
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "epikoinonia.json"));
  });

  it("keeps each language's form its own, keyed by the language and pointing at its own page", async () => {
    const { dir } = await exportSite();
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "widgetizer.forms.json"), "utf8"));
    const byKey = new Map(manifest.forms.map((form) => [form.key, form]));

    assert.ok(byKey.has("contact"), [...byKey.keys()].join(", "));
    assert.ok(byKey.has("el:contact"), [...byKey.keys()].join(", "));
    assert.equal(byKey.get("contact").page_path, "/contact.html");
    assert.equal(byKey.get("el:contact").page_path, "/el/epikoinonia.html");
  });

  // A manifest key the page does not actually submit is worse than no manifest:
  // the submission is accepted under a key nothing describes.
  it("submits under the key the manifest lists", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "el", "epikoinonia.html"), "utf8");
    assert.ok(html.includes('data-widgetizer-form="el:contact"'), html);
    assert.ok(!html.includes('data-widgetizer-form="contact"'), html);
  });
});

// The export writes every language, so it must validate every language. An item
// broken only in its translation would otherwise be dropped in silence.
describe("an item that is invalid only in a translation", () => {
  before(async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
    await storage.write(scope, "collection-types/news/template.liquid", "<h1>{{ item.settings.title }}</h1>");
    await storage.write(
      scope,
      "collections/news/alpha.json",
      JSON.stringify({ id: "alpha", uuid: "n-alpha", slug: "alpha", schemaVersion: 1, settings: { title: "Alpha" } }),
    );
    await storage.write(
      scope,
      "collections/news/el/alpha.json",
      JSON.stringify({ id: "alpha", uuid: "n-el-alpha", slug: "alpha", schemaVersion: 1, settings: { title: "" } }),
    );
  });

  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  });

  it("blocks the export instead of quietly leaving the page out", async () => {
    await resetExports();
    const res = await runExport();
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.message, /1 collection item\(s\) have validation errors/);
  });

  it("is the translation, and only the translation, that blocks it", async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: [] }, { seeded: true });
    try {
      await resetExports();
      const res = await runExport();
      assert.equal(res._status, 200, JSON.stringify(res._json));
    } finally {
      projectRepo.updateProject(PROJECT_ID, { languages: ["el", "de"] }, { seeded: true });
    }
  });
});

// Having more than one language is not a reason to demand a template nothing
// would render.
describe("a collection with no items in any language", () => {
  before(async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
  });

  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  });

  it("exports fine without a template", async () => {
    const { dir } = await exportSite();
    assert.equal(await fs.pathExists(path.join(dir, "news")), false);
    assert.equal(await fs.pathExists(path.join(dir, "el", "news")), false);
  });
});

// Chrome belongs to the page that asked for it. The last page's header was
// built for that page's depth and language and cannot stand in for a missing one.
describe("a language with no header of its own", () => {
  const headerDir = () => path.join(getProjectDir(PROJECT_FOLDER), "widgets", "global", "header");

  before(async () => {
    await fs.outputFile(path.join(headerDir(), "widget.liquid"), "<header>ENGLISH HEADER</header>");
    await fs.outputFile(
      path.join(headerDir(), "schema.json"),
      JSON.stringify({ name: "Header", settings: [] }),
    );
    await fs.outputFile(
      path.join(getProjectPagesDir(PROJECT_FOLDER), "global", "header.json"),
      JSON.stringify({ type: "header", settings: {} }),
    );
  });

  after(async () => {
    await fs.remove(headerDir());
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "global", "header.json"));
  });

  it("renders none rather than the previous page's", async () => {
    const { dir } = await exportSite();
    assert.ok((await fs.readFile(path.join(dir, "index.html"), "utf8")).includes("ENGLISH HEADER"));
    const greek = await fs.readFile(path.join(dir, "el", "index.html"), "utf8");
    assert.ok(!greek.includes("ENGLISH HEADER"), greek);
  });
});

// A page that claims its canonical is elsewhere tells crawlers to index the
// other address instead — here, the English page or nothing at all.
describe("the canonical of a translated page", () => {
  before(async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
    await storage.write(scope, "collection-types/news/template.liquid", "<h1>{{ item.settings.title }}</h1>");
    await storage.write(
      scope,
      "collections/news/alpha.json",
      JSON.stringify({ id: "alpha", uuid: "n-alpha", slug: "alpha", schemaVersion: 1, settings: { title: "Alpha" } }),
    );
    await storage.write(
      scope,
      "collections/news/el/alpha.json",
      JSON.stringify({ id: "alpha", uuid: "n-el-alpha", slug: "alpha", schemaVersion: 1, settings: { title: "Alfa" } }),
    );
  });

  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  });

  it("is the address it was written to, page and item alike", async () => {
    const { dir } = await exportSite();
    const canonicalOf = async (...parts) => {
      const html = await fs.readFile(path.join(dir, ...parts), "utf8");
      return (html.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/) || [])[1];
    };

    assert.equal(await canonicalOf("about.html"), `${SITE}/about.html`);
    assert.equal(await canonicalOf("el", "sxetika.html"), `${SITE}/el/sxetika.html`);
    assert.equal(await canonicalOf("el", "index.html"), `${SITE}/el/`);
    assert.equal(await canonicalOf("news", "alpha.html"), `${SITE}/news/alpha.html`);
    assert.equal(await canonicalOf("el", "news", "alpha.html"), `${SITE}/el/news/alpha.html`);
  });

  it("still lets an explicit canonical win", async () => {
    await writePage("el", "sxetika", "Sxetika", {
      uuid: "p-el-sxetika",
      translationGroupId: "p-en-about",
      seo: { title: "Sxetika", canonical_url: "https://example.com/somewhere-else" },
    });
    try {
      const { dir } = await exportSite();
      const html = await fs.readFile(path.join(dir, "el", "sxetika.html"), "utf8");
      assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/somewhere-else"\s*\/?>/);
    } finally {
      await writePage("el", "sxetika", "Sxetika", { uuid: "p-el-sxetika", translationGroupId: "p-en-about" });
    }
  });
});

// Nothing above may change what a one-language site ships.
describe("a single-language project", () => {
  it("exports exactly as it did before languages existed", async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: [] }, { seeded: true });
    try {
      const { dir, body } = await exportSite();
      assert.deepEqual(body.warnings, []);
      assert.equal(await fs.pathExists(path.join(dir, "el")), false);

      const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
      assert.ok(!sitemap.includes("xhtml"), "no alternates namespace when there is nothing to alternate");
      assert.ok(sitemap.includes(`<loc>${SITE}/about.html</loc>`));
    } finally {
      projectRepo.updateProject(PROJECT_ID, { languages: ["el", "de"] }, { seeded: true });
    }
  });
});

// Unused in assertions but proves the storage adapter reached the fixture.
void storage;
void scope;

// §7b again, from the other side: deciding not to publish a language is only
// half a decision. Whatever the rest of the site says ABOUT that language has
// to agree, or the export ships links to files it deliberately did not write.
describe("a link into a language that was not published", () => {
  const widgetDir = () => path.join(getProjectDir(PROJECT_FOLDER), "widgets", "linker");

  before(async () => {
    await fs.outputFile(
      path.join(widgetDir(), "schema.json"),
      JSON.stringify({
        name: "Linker",
        settings: [
          { type: "link", id: "cta", label: "CTA" },
          { type: "richtext", id: "body", label: "Body" },
        ],
      }),
    );
    await fs.outputFile(
      path.join(widgetDir(), "widget.liquid"),
      `<a id="cta" href="{{ widget.settings.cta.href }}">{{ widget.settings.cta.text }}</a>{{ widget.settings.body | raw }}`,
    );
    await writePage("", "links", "Links", {
      widgets: {
        w1: {
          type: "linker",
          settings: {
            // The German page exists on disk but its language has no homepage.
            cta: { pageUuid: "p-de-ueber", href: "de/ueber-uns.html", text: "Read it in German", target: "_self" },
            body: `<p>See <a href="de/ueber-uns.html" data-page-uuid="p-de-ueber">the German page</a> and <a href="el/sxetika.html" data-page-uuid="p-el-sxetika">the Greek one</a>.</p>`,
          },
        },
      },
      widgetsOrder: ["w1"],
    });
  });

  after(async () => {
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "links.json"));
    await fs.remove(widgetDir());
  });

  it("is cleared, not published as a link to a file that was never written", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "links.html"), "utf8");
    assert.ok(!html.includes("de/ueber-uns"), html);
    const cta = html.match(/<a id="cta"[^>]*>/)[0];
    assert.ok(!/href="[^"]+"/.test(cta), cta);
  });

  it("leaves the anchor's words behind in richtext, minus the destination", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "links.html"), "utf8");
    assert.ok(html.includes("the German page"), html);
    assert.ok(!html.includes('data-page-uuid="p-de-ueber"'), html);
  });

  it("still resolves a link into a language that WAS published", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "links.html"), "utf8");
    assert.ok(html.includes('href="el/sxetika.html"'), html);
  });
});

// The manifest describes the export. A number scoped to one language sitting
// next to a flag scoped to the whole site is not a summary anyone can use.
describe("the collection summary in the manifest", () => {
  before(async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
    await storage.write(scope, "collection-types/news/template.liquid", "<h1>{{ item.settings.title }}</h1>");
    for (const [key, title] of [["alpha", "Alpha"], ["beta", "Beta"]]) {
      await storage.write(
        scope,
        `collections/news/${key}.json`,
        JSON.stringify({ id: key, uuid: `n-${key}`, slug: key, schemaVersion: 1, settings: { title } }),
      );
    }
    await storage.write(
      scope,
      "collections/news/el/alpha.json",
      JSON.stringify({ id: "alpha", uuid: "n-el-alpha", slug: "alpha-el", schemaVersion: 1, settings: { title: "Alpha EL" } }),
    );
  });

  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  });

  it("counts every item the export actually published, not just the default language's", async () => {
    const { dir } = await exportSite();
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
    const news = manifest.collections.find((entry) => entry.type === "news");

    assert.equal(await fs.pathExists(path.join(dir, "news", "alpha.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "news", "beta.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "el", "news", "alpha-el.html")), true);
    assert.equal(news.itemCount, 3);
  });

  it("breaks the total down by language, and names no language it skipped", async () => {
    const { dir } = await exportSite();
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
    const news = manifest.collections.find((entry) => entry.type === "news");

    assert.deepEqual(news.itemCountByLanguage, { en: 2, el: 1 });
  });
});

// A noindex page has asked not to be indexed. An hreflang cluster is a set of
// pages a crawler may index, so the two cannot both be honoured: search engines
// discard the annotation and report the sitemap entry as an error.
describe("a translation that asked not to be indexed", () => {
  before(async () => {
    await writePage("", "secret", "Secret", { uuid: "p-en-secret", translationGroupId: "p-en-secret" });
    await writePage("el", "kryfi", "Kryfi", {
      uuid: "p-el-kryfi",
      translationGroupId: "p-en-secret",
      seo: { title: "Kryfi", robots: "noindex,follow" },
    });
  });

  after(async () => {
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "secret.json"));
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "kryfi.json"));
  });

  it("is not offered as the alternate of the page it translates", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "secret.html"), "utf8");
    assert.ok(!html.includes("el/kryfi"), html);
    assert.ok(html.includes(`hreflang="en" href="${SITE}/secret.html"`), html);
  });

  it("is not named in the sitemap, as a URL of its own or as anyone's alternate", async () => {
    const { dir } = await exportSite();
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(!sitemap.includes("el/kryfi"), sitemap);
  });

  it("publishes no cluster of its own, because it cannot be a member of one", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "el", "kryfi.html"), "utf8");
    assert.ok(!html.includes('rel="alternate"'), html);
    assert.ok(html.includes('content="noindex,follow"'), html);
    // Its canonical is untouched: dropping the cluster is not the same as
    // refusing to say where the page lives.
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/el/kryfi\\.html"\\s*/?>`), html);
  });

  it("leaves an indexable sibling's cluster alone", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "about.html"), "utf8");
    assert.ok(html.includes(`hreflang="el" href="${SITE}/el/sxetika.html"`), html);
  });
});

// The two halves of the same rule, found by review: the HTML and the sitemap
// read a sibling's robots directive through DIFFERENT objects, so one of them
// agreeing is not evidence the other does.
describe("a collection item whose translation asked not to be indexed", () => {
  before(async () => {
    await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA));
    await storage.write(scope, "collection-types/news/template.liquid", "<h1>{{ item.settings.title }}</h1>");
    await storage.write(
      scope,
      "collections/news/story.json",
      JSON.stringify({
        id: "story",
        uuid: "n-story",
        slug: "story",
        translationGroupId: "n-story",
        schemaVersion: 1,
        settings: { title: "Story" },
      }),
    );
    await storage.write(
      scope,
      "collections/news/el/story.json",
      JSON.stringify({
        id: "story",
        uuid: "n-el-story",
        slug: "story-el",
        translationGroupId: "n-story",
        schemaVersion: 1,
        settings: { title: "Story EL" },
        seo: { robots: "noindex,follow" },
      }),
    );
  });

  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections"));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types"));
  });

  it("is left out of the item page's alternates, the way a page's is", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "news", "story.html"), "utf8");
    const alternates = (html.match(/<link[^>]*rel="alternate"[^>]*>/g) || []).filter((tag) =>
      tag.includes("el/news/story-el"),
    );
    assert.deepEqual(alternates, []);
  });

  it("is left out of the sitemap too, so the two artifacts agree", async () => {
    const { dir } = await exportSite();
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(!sitemap.includes("el/news/story-el"), sitemap);
  });

  it("still publishes the item page itself, and the sibling it translates", async () => {
    const { dir } = await exportSite();
    assert.equal(await fs.pathExists(path.join(dir, "news", "story.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "el", "news", "story-el.html")), true);
  });
});

// A page with no sibling in some language falls back to that language's
// homepage, and x-default is the one place such an entry is legitimate. Whether
// it may be published is a question about the HOMEPAGE, not about the
// translation that does not exist.
describe("a fallback alternate pointing at a homepage that asked not to be indexed", () => {
  const homePath = () => path.join(getProjectPagesDir(PROJECT_FOLDER), "index.json");
  let savedHome;

  before(async () => {
    savedHome = await fs.readFile(homePath(), "utf8");
    await writePage("", "index", "Home", { seo: { title: "Home", robots: "noindex,follow" } });
    await writePage("el", "mono-ellinika", "Mono Ellinika", { uuid: "p-el-mono" });
  });

  after(async () => {
    await fs.outputFile(homePath(), savedHome);
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "mono-ellinika.json"));
  });

  it("is not published as x-default, in the HTML or in the sitemap", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "el", "mono-ellinika.html"), "utf8");
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");

    assert.deepEqual(html.match(/<link[^>]*hreflang="x-default"[^>]*>/g) || [], []);
    const xDefaults = (sitemap.match(/<xhtml:link[^>]*>/g) || []).filter(
      (tag) => tag.includes('hreflang="x-default"') && tag.includes(`href="${SITE}/"`),
    );
    assert.deepEqual(xDefaults, []);
  });

  it("still gives the visitor a way to reach that language", async () => {
    const { dir } = await exportSite();
    const html = await fs.readFile(path.join(dir, "el", "mono-ellinika.html"), "utf8");
    // The switcher reads `translations`, which keeps the entry; only the
    // crawler-facing tags drop it.
    assert.equal(await fs.pathExists(path.join(dir, "index.html")), true);
    assert.ok(!html.includes('hreflang="en"'), html);
  });
});
