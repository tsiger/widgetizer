import { describe, it, expect } from "vitest";
import { buildBreadcrumbs, indexListingPages } from "../breadcrumbs.js";

const page = (slug, name, extra = {}) => ({ uuid: `u-${slug}`, slug, name, ...extra });

const pagesByUuid = (...pages) => new Map(pages.map((p) => [p.uuid, p]));

const HOME = page("index", "Home");
const ABOUT = page("about", "About Us");
const TEAM = page("team", "Our Team", { parentPageUuid: ABOUT.uuid });
const ALICE = page("alice", "Alice", { parentPageUuid: TEAM.uuid });
const BLOG = page("blog", "Blog");

const labels = (trail) => trail.map((c) => c.label);
const hrefs = (trail) => trail.map((c) => c.href);

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
