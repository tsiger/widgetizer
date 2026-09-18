import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "pagination-export-uuid";
const PROJECT_FOLDER = "pagination-export-project";
const SITE = "https://pagination.example.com";

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
  rootPrefix: "widgetizer-pagination-export-test",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: SITE,
  projectName: "Pagination Export Project",
  siteTitle: "Site",
  theme: "__pagination_export_theme__",
});

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

const GRID_SCHEMA = {
  type: "news-grid",
  collection: { type: "news", perPageSetting: "limit" },
  settings: [{ type: "number", id: "limit", default: 3 }],
};

const GRID_TEMPLATE =
  `{% assign items = 'news' | collection: limit: widget.settings.limit %}` +
  `<ul class="items">{% for item in items %}<li>{{ item.settings.title }}</li>{% endfor %}</ul>` +
  `{% if pagination %}<nav class="pager">` +
  `{% if pagination.prevHref %}<a class="prev" href="{{ pagination.prevHref }}">prev</a>{% endif %}` +
  `{% for entry in pagination.pages %}<a class="num" href="{{ entry.href }}">{{ entry.number }}</a>{% endfor %}` +
  `{% if pagination.nextHref %}<a class="next" href="{{ pagination.nextHref }}">next</a>{% endif %}` +
  `</nav>{% endif %}`;

const TEASER_TEMPLATE =
  `{% assign teaser_items = 'news' | collection: limit: 1 %}` +
  `<ol class="teaser">{% for item in teaser_items %}<b>{{ item.settings.title }}</b>{% endfor %}</ol>` +
  `{% if pagination %}<nav class="teaser-pager"></nav>{% endif %}`;

const TITLES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
const GREEK_TITLES = ["Alfa", "Vita", "Gama", "Delta", "Epsilonas"];

const grid = (settings) => ({ w1: { type: "news-grid", settings } });

const FORM_WIDGET = {
  type: "core-form",
  settings: { form_name: "Newsletter" },
  blocks: { b1: { type: "field", settings: { label: "Email", type: "email", required: true } } },
  blocksOrder: ["b1"],
};

async function writePage(slug, name, widgets) {
  await fs.writeFile(
    path.join(getProjectPagesDir(PROJECT_FOLDER), `${slug}.json`),
    JSON.stringify({ name, slug, uuid: `p-${slug}`, seo: { title: name }, widgets, widgetsOrder: Object.keys(widgets) }),
  );
}

async function seedFixture() {
  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>{% seo %}</head>` +
      `<body class="{{ body_class }}">{% render 'breadcrumbs', class_nav: 'bc' %}<main>{{ main_content | raw }}</main></body></html>`,
  );
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "schema.json"), JSON.stringify(GRID_SCHEMA));
  await fs.outputFile(path.join(projectDir, "widgets", "news-grid", "widget.liquid"), GRID_TEMPLATE);
  await fs.outputFile(path.join(projectDir, "widgets", "news-teaser", "schema.json"), JSON.stringify({ settings: [] }));
  await fs.outputFile(path.join(projectDir, "widgets", "news-teaser", "widget.liquid"), TEASER_TEMPLATE);

  await storage.write(scope, "collection-types/news/schema.json", JSON.stringify(NEWS_SCHEMA, null, 2));
  await storage.write(scope, "collection-types/news/template.liquid", `<article>{{ item.settings.title }}</article>`);
  for (const [index, title] of TITLES.entries()) {
    const slug = title.toLowerCase();
    const created = `2026-01-0${9 - index}T00:00:00.000Z`;
    await storage.write(
      scope,
      `collections/news/${slug}.json`,
      JSON.stringify({ id: slug, uuid: `u-${slug}`, slug, schemaVersion: 1, created, updated: created, settings: { title } }),
    );
  }

  await writePage("index", "Home", grid({ limit: 2 }));
  await writePage("blog", "Blog", {
    ...grid({ limit: 2, paginate: true }),
    teaser: { type: "news-teaser", settings: {} },
    form: FORM_WIDGET,
  });
}

const compact = (html) =>
  html.replace(/\s+/g, " ").replace(/\s*\/>/g, ">").replace(/\s+>/g, ">").replace(/<\s+/g, "<");

async function read(dir, relativePath) {
  return compact(await fs.readFile(path.join(dir, ...relativePath.split("/")), "utf8"));
}

const trailOf = (html) => {
  const nav = html.match(/<nav class="bc".*?<\/nav>/);
  if (!nav) return null;
  return {
    labels: [...nav[0].matchAll(/>([^<>]+)<\/(?:a|span)>/g)].map((match) => match[1].trim()),
    hrefs: [...nav[0].matchAll(/href="([^"]*)"/g)].map((match) => match[1]),
  };
};

const itemsOf = (html) => [...html.matchAll(/<li>\s*([^<]+?)\s*<\/li>/g)].map((match) => match[1]);
const hrefsOf = (html, className) =>
  [...html.matchAll(new RegExp(`class="${className}" href="([^"]*)"`, "g"))].map((match) => match[1]);

async function exportWith(cleanUrls) {
  await resetExports();
  projectRepo.updateProject(PROJECT_ID, { cleanUrls });
  const res = await runExport();
  assert.equal(res._status, 200, `export failed: ${JSON.stringify(res._json)}`);
  return latestExportDir();
}

before(async () => {
  await seedProjectScaffold();
  await seedFixture();
});

after(async () => {
  await cleanup();
});

describe("export — paginated listing, Clean URLs off", () => {
  let dir;
  before(async () => {
    dir = await exportWith(false);
  });

  it("writes page 1 at the page itself and the rest under it", async () => {
    assert.ok(await fs.pathExists(path.join(dir, "blog.html")));
    assert.ok(await fs.pathExists(path.join(dir, "blog", "page", "2.html")));
    assert.ok(await fs.pathExists(path.join(dir, "blog", "page", "3.html")));
    assert.ok(!(await fs.pathExists(path.join(dir, "blog", "page", "1.html"))));
    assert.ok(!(await fs.pathExists(path.join(dir, "blog", "page", "4.html"))));
  });

  it("slices the collection across the copies in listing order", async () => {
    assert.deepEqual(itemsOf(await read(dir, "blog.html")), ["Alpha", "Beta"]);
    assert.deepEqual(itemsOf(await read(dir, "blog/page/2.html")), ["Gamma", "Delta"]);
    assert.deepEqual(itemsOf(await read(dir, "blog/page/3.html")), ["Epsilon"]);
  });

  it("links the pager correctly from every depth", async () => {
    const first = await read(dir, "blog.html");
    assert.deepEqual(hrefsOf(first, "num"), ["blog.html", "blog/page/2.html", "blog/page/3.html"]);
    assert.deepEqual(hrefsOf(first, "prev"), []);
    assert.deepEqual(hrefsOf(first, "next"), ["blog/page/2.html"]);

    const second = await read(dir, "blog/page/2.html");
    assert.deepEqual(hrefsOf(second, "num"), ["../../blog.html", "../../blog/page/2.html", "../../blog/page/3.html"]);
    assert.deepEqual(hrefsOf(second, "prev"), ["../../blog.html"]);
    assert.deepEqual(hrefsOf(second, "next"), ["../../blog/page/3.html"]);
  });

  it("gives each copy its own title, canonical and prev/next", async () => {
    const second = await read(dir, "blog/page/2.html");
    assert.ok(second.includes("<title>Blog - 2 - Site</title>"), second);
    assert.ok(second.includes(`<link rel="canonical" href="${SITE}/blog/page/2.html">`), second);
    assert.ok(second.includes(`<link rel="prev" href="${SITE}/blog.html">`), second);
    assert.ok(second.includes(`<link rel="next" href="${SITE}/blog/page/3.html">`), second);

    const first = await read(dir, "blog.html");
    assert.ok(first.includes(`<link rel="canonical" href="${SITE}/blog.html">`), first);
    assert.ok(!first.includes('rel="prev"'), first);
  });

  it("ends the breadcrumb trail on the page number from page 2 on", async () => {
    assert.deepEqual(trailOf(await read(dir, "blog.html")).labels, ["Home", "Blog"]);

    const second = trailOf(await read(dir, "blog/page/2.html"));
    assert.deepEqual(second.labels, ["Home", "Blog", "Page 2"]);
    assert.deepEqual(second.hrefs, ["../../index.html", "../../blog.html"]);
  });

  it("leaves a teaser of the same collection on another page alone", async () => {
    const home = await read(dir, "index.html");
    assert.deepEqual(itemsOf(home), ["Alpha", "Beta"]);
    assert.ok(!home.includes('class="pager"'), home);
  });

  it("gives another listing on the same page neither the slice nor the pager", async () => {
    const second = await read(dir, "blog/page/2.html");
    assert.match(second, /<ol class="teaser">\s*<b>Alpha<\/b>\s*<\/ol>/);
    assert.ok(!second.includes("teaser-pager"), second);
  });

  it("keeps a form on the paginated page as one form", async () => {
    const manifest = await fs.readJson(path.join(dir, "widgetizer.forms.json"));
    assert.equal(manifest.forms.length, 1);
  });

  it("lists the copies in the sitemap", async () => {
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`<loc>${SITE}/blog.html</loc>`), sitemap);
    assert.ok(sitemap.includes(`<loc>${SITE}/blog/page/2.html</loc>`), sitemap);
    assert.ok(sitemap.includes(`<loc>${SITE}/blog/page/3.html</loc>`), sitemap);
  });
});

describe("export — paginated listing, Clean URLs on", () => {
  let dir;
  before(async () => {
    dir = await exportWith(true);
  });

  it("drops .html from pager links, canonical and sitemap, files stay .html", async () => {
    assert.ok(await fs.pathExists(path.join(dir, "blog", "page", "2.html")));
    const second = await read(dir, "blog/page/2.html");
    assert.deepEqual(hrefsOf(second, "num"), ["../../blog", "../../blog/page/2", "../../blog/page/3"]);
    assert.ok(second.includes(`<link rel="canonical" href="${SITE}/blog/page/2">`), second);

    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`<loc>${SITE}/blog/page/2</loc>`), sitemap);
  });
});

describe("preview morph — a widget re-rendered alone on a paginated page", () => {
  const HEADER = { type: "header", settings: {} };
  let blog;

  before(async () => {
    const headerDir = path.join(getProjectDir(PROJECT_FOLDER), "widgets", "global", "header");
    await fs.outputFile(path.join(headerDir, "schema.json"), JSON.stringify({ type: "header", settings: [] }));
    await fs.outputFile(
      path.join(headerDir, "widget.liquid"),
      `<header>{% if page.pagination %}<i class="pg">{{ page.pagination.current }}/{{ page.pagination.total }}</i>{% endif %}</header>`,
    );
    blog = await fs.readJson(path.join(getProjectPagesDir(PROJECT_FOLDER), "blog.json"));
  });

  const morph = async (widgetId, widget, page) => {
    const { renderSingleWidget } = await import("../controllers/previewController.js");
    let html = "";
    const res = {
      send(body) { html = body; return res; },
      status() { return res; },
      json(body) { html = JSON.stringify(body); return res; },
    };
    await renderSingleWidget(
      {
        body: { widgetId, widget, themeSettings: {}, currentCanonicalPath: "blog.html", ...(page ? { page } : {}) },
        activeProject: { id: PROJECT_ID },
        adapters: { storage },
        scope,
      },
      res,
    );
    return compact(html);
  };

  it("keeps page.pagination on a morphed header", async () => {
    assert.ok((await morph("header", HEADER, blog)).includes('<i class="pg">1/3</i>'));
  });

  it("skips widget order entries that are not ids", async () => {
    const page = { ...blog, widgetsOrder: [{ toString: null }, 42, "w1"] };
    assert.ok((await morph("header", HEADER, page)).includes('<i class="pg">1/3</i>'));
  });

  it("has no pagination without the page", async () => {
    assert.ok(!(await morph("header", HEADER)).includes('class="pg"'));
  });

  it("uses the edited listing widget over the page's copy of it", async () => {
    const edited = { ...blog.widgets.w1, settings: { ...blog.widgets.w1.settings, limit: 5 } };
    const html = await morph("w1", edited, blog);
    assert.deepEqual(itemsOf(html), TITLES);
    assert.ok(!html.includes('class="pager"'), html);
  });
});

describe("export — homepage pagination", () => {
  let dir;
  before(async () => {
    await writePage("index", "Home", grid({ limit: 2, paginate: true }));
    dir = await exportWith(false);
  });

  after(async () => {
    await writePage("index", "Home", grid({ limit: 2 }));
  });

  it("puts the homepage copies at the root", async () => {
    assert.ok(await fs.pathExists(path.join(dir, "page", "2.html")));
    const second = await read(dir, "page/2.html");
    assert.deepEqual(itemsOf(second), ["Gamma", "Delta"]);
    assert.deepEqual(hrefsOf(second, "num"), ["../index.html", "../page/2.html", "../page/3.html"]);
    assert.ok(second.includes(`<link rel="prev" href="${SITE}/">`), second);
    assert.deepEqual(trailOf(second), { labels: ["Home", "Page 2"], hrefs: ["../index.html"] });
    assert.equal(trailOf(await read(dir, "index.html")), null);
  });
});

describe("export — homepage copies clash with a collection published under page/", () => {
  before(async () => {
    await writePage("index", "Home", grid({ limit: 2, paginate: true }));
    await storage.write(
      scope,
      "collection-types/archive/schema.json",
      JSON.stringify({ ...NEWS_SCHEMA, type: "archive", displayName: "Archive", displayNamePlural: "Archive", slugPrefix: "page" }),
    );
  });

  after(async () => {
    await writePage("index", "Home", grid({ limit: 2 }));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collection-types", "archive"));
  });

  it("refuses the export and names the collection", async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });
    const res = await runExport();
    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(JSON.stringify(res._json), /Archive/);
  });
});

describe("collection reads within one export", () => {
  it("slices every copy from the same read, even if the collection changes mid-export", async () => {
    const { buildCollectionRenderDeps } = await import("../services/renderingService.js");
    const renderDeps = buildCollectionRenderDeps({ storage, scope, snapshot: new Map() });
    const load = renderDeps.buildCollectionItemsLoader({ globals: {}, imageBasePath: "", fileBasePath: "" });

    assert.equal(await renderDeps.countCollectionItems("news"), 5);
    const first = await load("news", { limit: 2 });

    const created = "2026-02-01T00:00:00.000Z";
    await storage.write(
      scope,
      "collections/news/newest.json",
      JSON.stringify({ id: "newest", uuid: "u-newest", slug: "newest", schemaVersion: 1, created, updated: created, settings: { title: "Newest" } }),
    );
    try {
      const second = await load("news", { limit: 2, offset: 2 });
      assert.deepEqual(
        [...first, ...second].map((item) => item.settings.title),
        ["Alpha", "Beta", "Gamma", "Delta"],
      );
      assert.equal(await renderDeps.countCollectionItems("news"), 5);
    } finally {
      await storage.delete(scope, "collections/news/newest.json");
    }
  });
});

describe("export — a collection edited while the export runs", () => {
  it("publishes every item the listing and sitemap link to", async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false });

    const epsilonKey = "collections/news/epsilon.json";
    const epsilon = await storage.read(scope, epsilonKey);
    let deleted = false;
    const mutating = new Proxy(storage, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof value !== "function") return value;
        if (prop !== "read") return value.bind(target);
        return async (readScope, key, ...rest) => {
          const result = await value.call(target, readScope, key, ...rest);
          if (!deleted && key === "collection-types/news/template.liquid") {
            deleted = true;
            await target.delete(readScope, epsilonKey);
          }
          return result;
        };
      },
    });

    try {
      const res = await runExport({}, { storage: mutating });
      assert.equal(res._status, 200, JSON.stringify(res._json));
      assert.ok(deleted, "the item should be deleted during the export");

      const dir = latestExportDir();
      assert.ok(await fs.pathExists(path.join(dir, "news", "epsilon.html")));
      assert.ok((await fs.readFile(path.join(dir, "sitemap.xml"), "utf8")).includes(`<loc>${SITE}/news/epsilon.html</loc>`));
      assert.deepEqual(itemsOf(await read(dir, "blog/page/3.html")), ["Epsilon"]);
    } finally {
      await storage.write(scope, epsilonKey, epsilon);
    }
  });
});

describe("export — a collection that fits on one page", () => {
  let dir;
  before(async () => {
    await writePage("blog", "Blog", grid({ limit: 10, paginate: true }));
    dir = await exportWith(false);
  });

  it("writes no copies and no pager", async () => {
    assert.ok(!(await fs.pathExists(path.join(dir, "blog", "page"))));
    const blog = await read(dir, "blog.html");
    assert.deepEqual(itemsOf(blog), TITLES);
    assert.ok(!blog.includes('class="pager"'), blog);
    assert.ok(!blog.includes('rel="next"'), blog);
  });
});

describe("export — the same slug paginating in two languages", () => {
  const greekPagePath = () => path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "blog.json");
  const greekHomePath = () => path.join(getProjectPagesDir(PROJECT_FOLDER), "el", "index.json");

  before(async () => {
    // Greek "blog" lists three per page where the English one lists two; the
    // plans must not share a key. Greek also needs a homepage, or the export
    // leaves the language out entirely (§7b). Its own five items too: a listing
    // shows its own language, so borrowing the English ones would only prove
    // that nothing filters.
    await writePage("blog", "Blog", grid({ limit: 2, paginate: true }));
    for (const [index, title] of GREEK_TITLES.entries()) {
      const slug = title.toLowerCase();
      const created = `2026-01-0${9 - index}T00:00:00.000Z`;
      await storage.write(
        scope,
        `collections/news/el/${slug}.json`,
        JSON.stringify({
          id: slug,
          uuid: `u-el-${slug}`,
          slug,
          schemaVersion: 1,
          created,
          updated: created,
          settings: { title },
        }),
      );
    }
    // The export publishes the languages the PROJECT has enabled; a folder on
    // disk for a language nobody enabled is stale content, not a language.
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
    await fs.outputFile(
      greekHomePath(),
      JSON.stringify({ name: "Arxiki", slug: "index", uuid: "p-el-home", widgets: {}, widgetsOrder: [] }),
    );
    await fs.outputFile(
      greekPagePath(),
      JSON.stringify({
        name: "Nea",
        slug: "blog",
        uuid: "p-el-blog",
        seo: { title: "Nea" },
        widgets: grid({ limit: 3, paginate: true }),
        widgetsOrder: ["w1"],
      }),
    );
  });

  after(async () => {
    await fs.remove(path.dirname(greekPagePath()));
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "el"));
    projectRepo.updateProject(PROJECT_ID, { languages: [] }, { seeded: true });
    projectRepo.updateProject(PROJECT_ID, { siteUrl: SITE });
  });

  it("keeps each language's own plan and writes the copies under the language folder", async () => {
    const dir = await exportWith(false);
    assert.equal(await fs.pathExists(path.join(dir, "blog", "page", "3.html")), true, "English: 5 items, 2 per page");
    assert.equal(await fs.pathExists(path.join(dir, "el", "blog.html")), true);
    assert.equal(await fs.pathExists(path.join(dir, "el", "blog", "page", "2.html")), true, "Greek: 3 per page");
    assert.equal(await fs.pathExists(path.join(dir, "el", "blog", "page", "3.html")), false);
    // A pager that left the language would walk the reader out of the Greek site
    // on the second page.
    assert.deepEqual(hrefsOf(await read(dir, "el/blog.html"), "num"), [
      "../el/blog.html",
      "../el/blog/page/2.html",
    ]);
    assert.deepEqual(hrefsOf(await read(dir, "blog.html"), "num"), [
      "blog.html",
      "blog/page/2.html",
      "blog/page/3.html",
    ]);
    assert.deepEqual(itemsOf(await read(dir, "el/blog.html")), ["Alfa", "Vita", "Gama"]);
    assert.deepEqual(itemsOf(await read(dir, "el/blog/page/2.html")), ["Delta", "Epsilonas"]);
    assert.deepEqual(itemsOf(await read(dir, "blog.html")), ["Alpha", "Beta"]);
  });

  // Two more Greek items, so Greek's total (7 @ 3 = 3 pages) can only come from
  // Greek — with five each, a count taken from the wrong language looks right.
  async function withSevenGreekItems(run) {
    const extras = ["zita", "ita"];
    for (const slug of extras) {
      await storage.write(
        scope,
        `collections/news/el/${slug}.json`,
        JSON.stringify({
          id: slug,
          uuid: `u-el-${slug}`,
          slug,
          schemaVersion: 1,
          created: "2026-01-03T00:00:00.000Z",
          updated: "2026-01-03T00:00:00.000Z",
          settings: { title: slug },
        }),
      );
    }
    try {
      await run();
    } finally {
      for (const slug of extras) {
        await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "collections", "news", "el", `${slug}.json`));
      }
    }
  }

  // The count behind the pager is the same count the listing draws from, or a
  // language pages over a total it never shows.
  it("pages over its own language's total, not the default one's", async () => {
    await withSevenGreekItems(async () => {
      const dir = await exportWith(false);
      assert.equal(await fs.pathExists(path.join(dir, "el", "blog", "page", "3.html")), true, "Greek: 7 items, 3 per page");
      assert.equal(await fs.pathExists(path.join(dir, "blog", "page", "4.html")), false, "English still has five");
    });
  });

  // A morph re-renders one widget with no page around it, so the language has to
  // reach it from the page data the editor sent.
  it("plans a morphed widget in the page's own language", async () => {
    await withSevenGreekItems(async () => {
      const greek = await fs.readJson(greekPagePath());
      const { renderSingleWidget } = await import("../controllers/previewController.js");
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
        {
          body: {
            widgetId: "header",
            widget: { type: "header", settings: {} },
            themeSettings: {},
            currentCanonicalPath: "blog.html",
            page: { ...greek, language: "el" },
          },
          activeProject: { id: PROJECT_ID },
          adapters: { storage },
          scope,
        },
        res,
      );
      assert.ok(compact(html).includes('<i class="pg">1/3</i>'), html);
    });
  });

  it("describes every published language in the sitemap, each with its own paging", async () => {
    const dir = await exportWith(false);
    const sitemap = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`${SITE}/blog/page/3.html`), "English: 5 items, 2 per page");
    assert.ok(sitemap.includes(`${SITE}/el/blog.html`));
    assert.ok(sitemap.includes(`${SITE}/el/blog/page/2.html`), "Greek: 3 per page");
    assert.ok(!sitemap.includes(`${SITE}/el/blog/page/3.html`), "each language keeps its own total");
  });

  it("writes each language's markdown twin beside its page, linked at the page's depth", async () => {
    await resetExports();
    projectRepo.updateProject(PROJECT_ID, { cleanUrls: false, siteUrl: "" });
    const res = await runExport({ exportMarkdown: true });
    assert.equal(res._status, 200, JSON.stringify(res._json));
    const dir = latestExportDir();

    assert.equal(await fs.pathExists(path.join(dir, "el", "blog.md")), true);
    const englishMd = await fs.readFile(path.join(dir, "blog.md"), "utf8");
    assert.ok(englishMd.includes("title: Blog"), "the root file is the English page's");
    const greekMd = await fs.readFile(path.join(dir, "el", "blog.md"), "utf8");
    assert.ok(greekMd.includes("title: Nea"));
    assert.ok(greekMd.includes("html: 'el/blog.html'"));
    assert.ok(greekMd.includes("md: 'el/blog.md'"));

    const greekHtml = await read(dir, "el/blog.html");
    assert.ok(greekHtml.includes(`href="../el/blog.md"`), "the alternate link is depth-prefixed");
    const englishHtml = await read(dir, "blog.html");
    assert.ok(englishHtml.includes(`href="blog.md"`));
  });
});
