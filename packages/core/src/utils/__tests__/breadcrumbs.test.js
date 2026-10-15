import { describe, it, expect } from "vitest";
import { buildBreadcrumbs, indexListingPages, listingParentStatus } from "../breadcrumbs.js";

const page = (slug, name, extra = {}) => ({ uuid: `u-${slug}`, slug, name, ...extra });

const pagesByUuid = (...pages) => new Map(pages.map((p) => [p.uuid, p]));

const HOME = page("index", "Home");
const ABOUT = page("about", "About Us");
const TEAM = page("team", "Our Team", { parentPageUuid: ABOUT.uuid });
const ALICE = page("alice", "Alice", { parentPageUuid: TEAM.uuid });
const BLOG = page("blog", "Blog");

const labels = (trail) => trail.map((c) => c.label);
const hrefs = (trail) => trail.map((c) => c.href);

describe("buildBreadcrumbs — paginated copies", () => {
  it("links the page back to page 1 and ends on the page number", () => {
    const trail = buildBreadcrumbs({
      page: BLOG,
      pagesByUuid: pagesByUuid(HOME, BLOG),
      outputPathPrefix: "../../",
      pageNumber: 2,
    });
    expect(labels(trail)).toEqual(["Home", "Blog", "2"]);
    expect(hrefs(trail)).toEqual(["../../index.html", "../../blog.html", "../../blog/page/2.html"]);
    expect(trail.map((c) => c.current)).toEqual([false, false, true]);
    expect(trail[2].pageNumber).toBe(2);
    expect(trail[2].canonicalPath).toBe("blog/page/2.html");
  });

  it("gives the homepage's later pages Home → page number", () => {
    const trail = buildBreadcrumbs({
      page: HOME,
      pagesByUuid: pagesByUuid(HOME, BLOG),
      cleanUrls: true,
      outputPathPrefix: "../",
      pageNumber: 3,
    });
    expect(labels(trail)).toEqual(["Home", "3"]);
    expect(hrefs(trail)).toEqual(["../", "../page/3"]);
    expect(trail[0].home).toBe(true);
  });

  it("leaves page 1 as an ordinary trail", () => {
    const trail = buildBreadcrumbs({ page: BLOG, pagesByUuid: pagesByUuid(HOME, BLOG), pageNumber: 1 });
    expect(labels(trail)).toEqual(["Home", "Blog"]);
    expect(buildBreadcrumbs({ page: HOME, pagesByUuid: pagesByUuid(HOME), pageNumber: 1 })).toEqual([]);
  });
});

describe("buildBreadcrumbs — pages", () => {
  it("gives a top-level page Home → page", () => {
    const trail = buildBreadcrumbs({ page: ABOUT, pagesByUuid: pagesByUuid(HOME, ABOUT) });
    expect(labels(trail)).toEqual(["Home", "About Us"]);
    expect(hrefs(trail)).toEqual(["index.html", "about.html"]);
    expect(trail[0].home).toBe(true);
    expect(trail[1].current).toBe(true);
  });

  it("walks a parent chain top-down", () => {
    const trail = buildBreadcrumbs({ page: ALICE, pagesByUuid: pagesByUuid(HOME, ABOUT, TEAM, ALICE) });
    expect(labels(trail)).toEqual(["Home", "About Us", "Our Team", "Alice"]);
    expect(trail.filter((c) => c.current)).toHaveLength(1);
    expect(trail.filter((c) => c.home)).toHaveLength(1);
  });

  it("gives the homepage an empty trail", () => {
    expect(buildBreadcrumbs({ page: HOME, pagesByUuid: pagesByUuid(HOME, ABOUT) })).toEqual([]);
    const homeSlug = page("home", "Start");
    expect(buildBreadcrumbs({ page: homeSlug, pagesByUuid: pagesByUuid(homeSlug) })).toEqual([]);
  });

  it("carries canonicalPath un-prefixed and with .html, whatever the href shape", () => {
    const trail = buildBreadcrumbs({
      page: TEAM,
      pagesByUuid: pagesByUuid(HOME, ABOUT, TEAM),
      cleanUrls: true,
      outputPathPrefix: "../",
    });
    expect(hrefs(trail)).toEqual(["../", "../about", "../team"]);
    expect(trail.map((c) => c.canonicalPath)).toEqual(["index.html", "about.html", "team.html"]);
  });

  it("does not repeat Home when a page names it as its parent", () => {
    const child = page("contact", "Contact", { parentPageUuid: HOME.uuid });
    const trail = buildBreadcrumbs({ page: child, pagesByUuid: pagesByUuid(HOME, child) });
    expect(labels(trail)).toEqual(["Home", "Contact"]);
  });

  it("falls back to Home → page when the parent was deleted", () => {
    const orphan = page("solo", "Solo", { parentPageUuid: "u-gone" });
    const trail = buildBreadcrumbs({ page: orphan, pagesByUuid: pagesByUuid(HOME, orphan) });
    expect(labels(trail)).toEqual(["Home", "Solo"]);
  });

  it("omits Home when the project has no homepage", () => {
    const trail = buildBreadcrumbs({ page: ABOUT, pagesByUuid: pagesByUuid(ABOUT) });
    expect(labels(trail)).toEqual(["About Us"]);
    expect(trail[0].home).toBe(false);
  });

  it("prefers the `index` page over `home` so the choice never depends on map order", () => {
    const homeSlug = page("home", "Landing");
    const both = new Map([
      [homeSlug.uuid, homeSlug],
      [HOME.uuid, HOME],
      [ABOUT.uuid, ABOUT],
    ]);
    expect(buildBreadcrumbs({ page: ABOUT, pagesByUuid: both })[0].label).toBe("Home");
  });

  it("falls back to the slug when a page has no name", () => {
    const unnamed = page("legal", "");
    const trail = buildBreadcrumbs({ page: unnamed, pagesByUuid: pagesByUuid(HOME, unnamed) });
    expect(labels(trail)).toEqual(["Home", "legal"]);
  });
});

// Broken data must not hang a render or produce an endless trail.
describe("buildBreadcrumbs — malformed hierarchies", () => {
  it("drops a parent cycle instead of looping", () => {
    const a = page("a", "A", { parentPageUuid: "u-b" });
    const b = page("b", "B", { parentPageUuid: "u-a" });
    const trail = buildBreadcrumbs({ page: a, pagesByUuid: pagesByUuid(HOME, a, b) });
    expect(labels(trail)).toEqual(["Home", "B", "A"]);
  });

  it("stops a self-parent at once", () => {
    const self = page("loop", "Loop");
    self.parentPageUuid = self.uuid;
    const trail = buildBreadcrumbs({ page: self, pagesByUuid: pagesByUuid(HOME, self) });
    expect(labels(trail)).toEqual(["Home", "Loop"]);
  });

  it("caps a very deep chain rather than walking it all", () => {
    const deep = [];
    for (let i = 0; i < 20; i += 1) {
      deep.push(page(`p${i}`, `P${i}`, i > 0 ? { parentPageUuid: `u-p${i - 1}` } : {}));
    }
    const trail = buildBreadcrumbs({ page: deep[19], pagesByUuid: pagesByUuid(HOME, ...deep) });
    // Home + 10 ancestors + the page itself.
    expect(trail).toHaveLength(12);
    expect(trail[0].label).toBe("Home");
    expect(trail.at(-1).label).toBe("P19");
  });

  it("returns nothing when given neither a page nor an item", () => {
    expect(buildBreadcrumbs({ pagesByUuid: pagesByUuid(HOME) })).toEqual([]);
    expect(buildBreadcrumbs()).toEqual([]);
  });
});

describe("buildBreadcrumbs — collection items", () => {
  const item = { slug: "hello-world", name: "Hello World", slugPrefix: "news" };
  const build = (listingPages, pages = pagesByUuid(HOME, BLOG)) =>
    buildBreadcrumbs({ item, collectionType: "news", pagesByUuid: pages, listingPages });

  it("hangs the item under its anchor page", () => {
    const trail = build(new Map([["news", { anchorPageUuid: BLOG.uuid, pageUuids: [BLOG.uuid] }]]));
    expect(labels(trail)).toEqual(["Home", "Blog", "Hello World"]);
    expect(hrefs(trail)).toEqual(["index.html", "blog.html", "news/hello-world.html"]);
    expect(trail.at(-1).current).toBe(true);
  });

  it("continues up the anchor page's own parent chain", () => {
    const nested = page("blog", "Blog", { parentPageUuid: ABOUT.uuid });
    const trail = build(
      new Map([["news", { anchorPageUuid: nested.uuid, pageUuids: [nested.uuid] }]]),
      pagesByUuid(HOME, ABOUT, nested),
    );
    expect(labels(trail)).toEqual(["Home", "About Us", "Blog", "Hello World"]);
  });

  it("uses the only listing page when no anchor is set", () => {
    const trail = build(new Map([["news", { anchorPageUuid: null, pageUuids: [BLOG.uuid] }]]));
    expect(labels(trail)).toEqual(["Home", "Blog", "Hello World"]);
  });

  it("goes Home → item when two pages list the collection and none is the anchor", () => {
    const other = page("news-archive", "Archive");
    const trail = build(
      new Map([["news", { anchorPageUuid: null, pageUuids: [BLOG.uuid, other.uuid] }]]),
      pagesByUuid(HOME, BLOG, other),
    );
    expect(labels(trail)).toEqual(["Home", "Hello World"]);
  });

  it("goes Home → item when nothing lists the collection", () => {
    expect(labels(build(new Map()))).toEqual(["Home", "Hello World"]);
  });

  it("falls back when the anchor page was deleted", () => {
    const trail = build(new Map([["news", { anchorPageUuid: "u-gone", pageUuids: ["u-gone"] }]]));
    expect(labels(trail)).toEqual(["Home", "Hello World"]);
  });

  it("applies depth and Clean URLs to item and ancestor hrefs alike", () => {
    const trail = buildBreadcrumbs({
      item,
      collectionType: "news",
      pagesByUuid: pagesByUuid(HOME, BLOG),
      listingPages: new Map([["news", { anchorPageUuid: BLOG.uuid, pageUuids: [BLOG.uuid] }]]),
      cleanUrls: true,
      outputPathPrefix: "../",
    });
    expect(hrefs(trail)).toEqual(["../", "../blog", "../news/hello-world"]);
    expect(trail.map((c) => c.canonicalPath)).toEqual(["index.html", "blog.html", "news/hello-world.html"]);
  });
});

describe("listingParentStatus", () => {
  const pages = pagesByUuid(HOME, BLOG);

  it("resolves an anchor or a single listing page, the homepage included", () => {
    expect(listingParentStatus({ anchorPageUuid: BLOG.uuid, pageUuids: [BLOG.uuid] }, pages)).toBe("resolved");
    expect(listingParentStatus({ anchorPageUuid: HOME.uuid, pageUuids: [HOME.uuid, BLOG.uuid] }, pages)).toBe("resolved");
    expect(listingParentStatus({ anchorPageUuid: null, pageUuids: [HOME.uuid] }, pages)).toBe("resolved");
  });

  it("calls two unanchored listing pages ambiguous", () => {
    expect(listingParentStatus({ anchorPageUuid: null, pageUuids: [HOME.uuid, BLOG.uuid] }, pages)).toBe("ambiguous");
  });

  it("calls a collection nothing lists missing, including a stale anchor with no page left", () => {
    expect(listingParentStatus(undefined, pages)).toBe("missing");
    expect(listingParentStatus({ anchorPageUuid: null, pageUuids: [] }, pages)).toBe("missing");
    expect(listingParentStatus({ anchorPageUuid: "u-gone", pageUuids: ["u-gone"] }, pages)).toBe("missing");
  });
});

describe("indexListingPages", () => {
  const schemas = {
    "news-grid": { collection: { type: "news" } },
    "blog-grid": { collection: { type: "news" } },
    "projects-grid": { collection: { type: "projects" } },
    hero: {},
  };
  const withWidgets = (slug, widgets) => ({ ...page(slug, slug), widgets });

  it("records every page that lists a collection", () => {
    const blog = withWidgets("blog", { w1: { type: "news-grid" } });
    const home = withWidgets("index", { w1: { type: "news-grid" } });
    const index = indexListingPages([blog, home], schemas);
    expect(index.get("news").pageUuids.sort()).toEqual([blog.uuid, home.uuid].sort());
    expect(index.get("news").anchorPageUuid).toBe(null);
  });

  it("records the anchor when a listing widget is flagged", () => {
    const blog = withWidgets("blog", { w1: { type: "news-grid", settings: { listing_anchor: true } } });
    const other = withWidgets("archive", { w1: { type: "blog-grid" } });
    const index = indexListingPages([other, blog], schemas);
    expect(index.get("news").anchorPageUuid).toBe(blog.uuid);
  });

  it("ignores widgets whose schema declares no collection", () => {
    const home = withWidgets("index", { w1: { type: "hero" }, w2: { type: "unknown-widget" } });
    expect(indexListingPages([home], schemas).size).toBe(0);
  });

  it("keeps collections apart", () => {
    const p = withWidgets("work", { w1: { type: "projects-grid" }, w2: { type: "news-grid" } });
    const index = indexListingPages([p], schemas);
    expect([...index.keys()].sort()).toEqual(["news", "projects"]);
  });

  it("resolves two anchors to the first page by slug, so every render agrees", () => {
    const a = withWidgets("alpha", { w1: { type: "news-grid", settings: { listing_anchor: true } } });
    const z = withWidgets("zulu", { w1: { type: "news-grid", settings: { listing_anchor: true } } });
    expect(indexListingPages([z, a], schemas).get("news").anchorPageUuid).toBe(a.uuid);
    expect(indexListingPages([a, z], schemas).get("news").anchorPageUuid).toBe(a.uuid);
  });

  it("accepts schemas as a Map and pages without widgets", () => {
    const map = new Map(Object.entries(schemas));
    const blog = withWidgets("blog", { w1: { type: "news-grid" } });
    const bare = page("plain", "Plain");
    const index = indexListingPages([blog, bare], map);
    expect(index.get("news").pageUuids).toEqual([blog.uuid]);
  });
});

// A trail stays inside its own language: its home crumb, its ancestors and its
// own href all come from the language being rendered.
describe("buildBreadcrumbs — languages", () => {
  const EN_HOME = { uuid: "u-en-home", slug: "index", name: "Home", language: "en", translationGroupId: "g-home" };
  const EL_HOME = { uuid: "u-el-home", slug: "index", name: "Arxiki", language: "el", translationGroupId: "g-home" };
  const EN_ABOUT = {
    uuid: "u-en-about",
    slug: "about",
    name: "About",
    language: "en",
    translationGroupId: "g-about",
  };
  const EL_ABOUT = {
    uuid: "u-el-about",
    slug: "sxetika",
    name: "Sxetika",
    language: "el",
    translationGroupId: "g-about",
  };
  const EL_TEAM = {
    uuid: "u-el-team",
    slug: "omada",
    name: "Omada",
    language: "el",
    parentPageUuid: EL_ABOUT.uuid,
  };
  // Authored in Greek but pointing at the English About — what a seeded menu leaves behind.
  const EL_CROSS = {
    uuid: "u-el-cross",
    slug: "epafi",
    name: "Epafi",
    language: "el",
    parentPageUuid: EN_ABOUT.uuid,
  };
  const all = pagesByUuid(EN_HOME, EL_HOME, EN_ABOUT, EL_ABOUT, EL_TEAM, EL_CROSS);
  const build = (page, extra = {}) =>
    buildBreadcrumbs({ page, pagesByUuid: all, defaultLanguage: "en", language: page.language, ...extra });

  it("draws the home crumb of the page's own language", () => {
    expect(hrefs(build(EL_ABOUT))).toEqual(["el/index.html", "el/sxetika.html"]);
    expect(labels(build(EL_ABOUT))).toEqual(["Arxiki", "Sxetika"]);
    expect(hrefs(build(EN_ABOUT))).toEqual(["index.html", "about.html"]);
  });

  it("walks a parent chain inside the language", () => {
    const trail = build(EL_TEAM);
    expect(labels(trail)).toEqual(["Arxiki", "Sxetika", "Omada"]);
    expect(hrefs(trail)).toEqual(["el/index.html", "el/sxetika.html", "el/omada.html"]);
    expect(trail.map((c) => c.canonicalPath)).toEqual(["el/index.html", "el/sxetika.html", "el/omada.html"]);
  });

  it("swaps a parent in another language for its sibling in this one", () => {
    const trail = build(EL_CROSS);
    expect(labels(trail)).toEqual(["Arxiki", "Sxetika", "Epafi"]);
    expect(hrefs(trail)).toEqual(["el/index.html", "el/sxetika.html", "el/epafi.html"]);
  });

  it("finds the sibling of a parent that was never rewritten to record its group", () => {
    // Translating does not rewrite the source, so an untranslated-until-now page
    // carries no translationGroupId: it answers to its own uuid instead.
    const unstamped = { uuid: "u-en-plain", slug: "about", name: "About", language: "en" };
    const greekSibling = {
      uuid: "u-el-plain",
      slug: "sxetika",
      name: "Sxetika",
      language: "el",
      translationGroupId: unstamped.uuid,
    };
    const child = {
      uuid: "u-el-kid",
      slug: "omada",
      name: "Omada",
      language: "el",
      parentPageUuid: unstamped.uuid,
    };
    const trail = buildBreadcrumbs({
      page: child,
      pagesByUuid: pagesByUuid(EN_HOME, EL_HOME, unstamped, greekSibling, child),
      defaultLanguage: "en",
      language: "el",
    });
    expect(labels(trail)).toEqual(["Arxiki", "Sxetika", "Omada"]);
    expect(hrefs(trail)).toEqual(["el/index.html", "el/sxetika.html", "el/omada.html"]);
  });

  it("ignores a parent that exists only in another language", () => {
    const orphanParent = { uuid: "u-en-only", slug: "careers", name: "Careers", language: "en" };
    const child = { uuid: "u-el-c", slug: "kariera", name: "Kariera", language: "el", parentPageUuid: "u-en-only" };
    const trail = buildBreadcrumbs({
      page: child,
      pagesByUuid: pagesByUuid(EN_HOME, EL_HOME, orphanParent, child),
      defaultLanguage: "en",
      language: "el",
    });
    expect(labels(trail)).toEqual(["Arxiki", "Kariera"]);
  });

  it("follows Clean URLs and depth per language", () => {
    const trail = build(EL_TEAM, { cleanUrls: true, outputPathPrefix: "../" });
    expect(hrefs(trail)).toEqual(["../el/", "../el/sxetika", "../el/omada"]);
    expect(trail.map((c) => c.canonicalPath)).toEqual(["el/index.html", "el/sxetika.html", "el/omada.html"]);
  });

  it("puts a Greek item under its Greek listing page", () => {
    const listing = { uuid: "u-el-news", slug: "nea", name: "Nea", language: "el" };
    const enListing = { uuid: "u-en-news", slug: "news", name: "News", language: "en" };
    const trail = buildBreadcrumbs({
      item: { slug: "istoria", name: "Istoria", slugPrefix: "news", language: "el" },
      collectionType: "news",
      pagesByUuid: pagesByUuid(EN_HOME, EL_HOME, listing, enListing),
      listingPages: new Map([["news", { pageUuids: [enListing.uuid, listing.uuid] }]]),
      defaultLanguage: "en",
      language: "el",
    });
    expect(labels(trail)).toEqual(["Arxiki", "Nea", "Istoria"]);
    expect(hrefs(trail)).toEqual(["el/index.html", "el/nea.html", "el/news/istoria.html"]);
  });

  it("numbers a paginated Greek copy under its own folder", () => {
    const blog = { uuid: "u-el-blog", slug: "blog", name: "Nea", language: "el" };
    const trail = buildBreadcrumbs({
      page: blog,
      pagesByUuid: pagesByUuid(EN_HOME, EL_HOME, blog),
      defaultLanguage: "en",
      language: "el",
      pageNumber: 2,
      outputPathPrefix: "../../../",
    });
    expect(labels(trail)).toEqual(["Arxiki", "Nea", "2"]);
    expect(hrefs(trail)).toEqual(["../../../el/index.html", "../../../el/blog.html", "../../../el/blog/page/2.html"]);
    expect(trail[2].canonicalPath).toBe("el/blog/page/2.html");
  });
});

describe("listing pages across languages", () => {
  const EN_HOME = { uuid: "u-en-home", slug: "index", name: "Home", language: "en" };
  const EL_HOME = { uuid: "u-el-home", slug: "index", name: "Arxiki", language: "el" };
  const EN_NEWS = { uuid: "u-en-news", slug: "news", name: "News", language: "en", translationGroupId: "g-news" };
  const EL_NEWS = { uuid: "u-el-news", slug: "nea", name: "Nea", language: "el", translationGroupId: "g-news" };
  const EL_OTHER = { uuid: "u-el-other", slug: "arxeio", name: "Arxeio", language: "el" };
  const item = { slug: "istoria", name: "Istoria", slugPrefix: "news", language: "el" };

  const trailFor = (pages, listingPages) =>
    buildBreadcrumbs({
      item,
      collectionType: "news",
      pagesByUuid: pagesByUuid(...pages),
      listingPages: new Map([["news", listingPages]]),
      defaultLanguage: "en",
      language: "el",
    });

  it("treats a translated pair of listings as one parent, not an ambiguous choice", () => {
    const entry = { anchorPageUuid: null, anchorByLanguage: {}, pageUuids: [EN_NEWS.uuid, EL_NEWS.uuid] };
    const pages = pagesByUuid(EN_HOME, EL_HOME, EN_NEWS, EL_NEWS);
    expect(labels(trailFor([EN_HOME, EL_HOME, EN_NEWS, EL_NEWS], entry))).toEqual(["Arxiki", "Nea", "Istoria"]);
    expect(listingParentStatus(entry, pages, "el")).toBe("resolved");
  });

  it("uses the anchor this language chose, not the one another language chose", () => {
    const EN_ONLY = { uuid: "u-en-only", slug: "press", name: "Press", language: "en" };
    const entry = {
      anchorPageUuid: EN_ONLY.uuid,
      anchorByLanguage: { en: EN_ONLY.uuid, el: EL_OTHER.uuid },
      pageUuids: [EN_ONLY.uuid, EL_OTHER.uuid, EL_NEWS.uuid],
    };
    const trail = trailFor([EN_HOME, EL_HOME, EN_ONLY, EL_OTHER, EL_NEWS], entry);
    expect(labels(trail)).toEqual(["Arxiki", "Arxeio", "Istoria"]);
  });

  it("indexes an anchor per language and keeps the first as the cross-language fallback", () => {
    const schemas = { "news-grid": { collection: { type: "news" } } };
    const anchored = (uuid, slug, language) => ({
      uuid,
      slug,
      language,
      widgets: { w1: { type: "news-grid", settings: { listing_anchor: true } } },
    });
    const index = indexListingPages(
      [anchored("u-en", "news", "en"), anchored("u-el", "nea", "el"), { uuid: "u-el2", slug: "arxeio", language: "el", widgets: { w1: { type: "news-grid", settings: {} } } }],
      schemas,
    );
    const entry = index.get("news");
    expect(entry.anchorByLanguage).toEqual({ en: "u-en", el: "u-el" });
    // The fallback is the first anchor in slug order ("nea" precedes "news").
    expect(entry.anchorPageUuid).toBe("u-el");
    expect(entry.pageUuids.sort()).toEqual(["u-el", "u-el2", "u-en"]);
  });

  it("still indexes one anchor when no page carries a language", () => {
    const schemas = { "news-grid": { collection: { type: "news" } } };
    const index = indexListingPages(
      [
        { uuid: "u-a", slug: "news", widgets: { w1: { type: "news-grid", settings: { listing_anchor: true } } } },
        { uuid: "u-b", slug: "archive", widgets: { w1: { type: "news-grid", settings: {} } } },
      ],
      schemas,
    );
    expect(index.get("news").anchorPageUuid).toBe("u-a");
    expect(listingParentStatus(index.get("news"), pagesByUuid({ uuid: "u-a", slug: "news" }))).toBe("resolved");
  });
});
