import { describe, it, expect } from "vitest";
import { buildGraph } from "../index.js";
import { buildBreadcrumbs } from "../../utils/breadcrumbs.js";

const SITE = "https://crumbly.example";

const pageRow = (slug, name, extra = {}) => ({ slug, name, uuid: `p-${slug}`, ...extra });
const PAGES = [
  pageRow("index", "Home"),
  pageRow("about", "About Us"),
  pageRow("team", "Our Team", { parentPageUuid: "p-about" }),
  pageRow("alice", "Alice", { parentPageUuid: "p-team" }),
  pageRow("blog", "Blog"),
];
const pagesByUuid = (pages = PAGES) => new Map(pages.map((page) => [page.uuid, page]));

function pageWithTrail(slug, { pages = PAGES, pageNumber = 1, project = {} } = {}) {
  const page = pages.find((candidate) => candidate.slug === slug);
  const breadcrumbs = buildBreadcrumbs({ page, pagesByUuid: pagesByUuid(pages), pageNumber, cleanUrls: !!project.cleanUrls });
  const pagination = pageNumber > 1 ? { current: pageNumber, total: pageNumber } : undefined;
  return { ...page, breadcrumbs, ...(pagination ? { pagination } : {}) };
}

function itemWithTrail(listingPages = new Map()) {
  const item = { slug: "alpha", name: "Alpha Post", slugPrefix: "news" };
  const breadcrumbs = buildBreadcrumbs({ item, collectionType: "news", pagesByUuid: pagesByUuid(), listingPages });
  return { slug: "news/alpha", name: "Alpha Post", breadcrumbs };
}

const graphFor = (page, project = {}) => buildGraph({ page, project: { siteUrl: SITE, siteTitle: "Crumbly", ...project } });
const listOf = (page, project) => graphFor(page, project).find((node) => node["@type"] === "BreadcrumbList");
const trail = (list) => list.itemListElement.map((entry) => [entry.position, entry.name, entry.item]);

describe("BreadcrumbList", () => {
  it("walks a parent chain, positions counted from 1", () => {
    const list = listOf(pageWithTrail("alice"));
    expect(list["@id"]).toBe(`${SITE}/alice.html#breadcrumb`);
    expect(trail(list)).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "About Us", `${SITE}/about.html`],
      [3, "Our Team", `${SITE}/team.html`],
      [4, "Alice", `${SITE}/alice.html`],
    ]);
    expect(list.itemListElement[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` });
  });

  it("gives a page with no parent Home → page", () => {
    expect(trail(listOf(pageWithTrail("about")))).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "About Us", `${SITE}/about.html`],
    ]);
  });

  it("hangs an item under its anchor page", () => {
    const listing = new Map([["news", { anchorPageUuid: "p-blog", pageUuids: ["p-blog"] }]]);
    expect(trail(listOf(itemWithTrail(listing)))).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "Blog", `${SITE}/blog.html`],
      [3, "Alpha Post", `${SITE}/news/alpha.html`],
    ]);
  });

  it("gives an item with no listing page Home → item", () => {
    expect(trail(listOf(itemWithTrail()))).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "Alpha Post", `${SITE}/news/alpha.html`],
    ]);
  });

  it("gives the homepage none", () => {
    const home = pageWithTrail("index");
    expect(home.breadcrumbs).toEqual([]);
    expect(listOf(home)).toBeUndefined();
    expect(graphFor(home).find((node) => node["@type"] === "WebPage").breadcrumb).toBeUndefined();
  });

  it("links the WebPage to its trail", () => {
    const webPage = graphFor(pageWithTrail("about")).find((node) => node["@type"] === "WebPage");
    expect(webPage.breadcrumb).toEqual({ "@id": `${SITE}/about.html#breadcrumb` });
  });

  it("follows Clean URLs and a subfolder Site URL, keeping Home at the root", () => {
    const project = { siteUrl: "https://user.github.io/repo", cleanUrls: true };
    const list = listOf(pageWithTrail("team", { project }), project);
    expect(list["@id"]).toBe("https://user.github.io/repo/team#breadcrumb");
    expect(trail(list)).toEqual([
      [1, "Home", "https://user.github.io/repo/"],
      [2, "About Us", "https://user.github.io/repo/about"],
      [3, "Our Team", "https://user.github.io/repo/team"],
    ]);
  });

  it("puts a homepage named home at the root too", () => {
    const pages = [pageRow("home", "Start"), pageRow("about", "About Us")];
    expect(trail(listOf(pageWithTrail("about", { pages })))).toEqual([
      [1, "Start", `${SITE}/`],
      [2, "About Us", `${SITE}/about.html`],
    ]);
  });

  it("ends a paginated copy on Page N, at the copy's own address", () => {
    const list = listOf(pageWithTrail("blog", { pageNumber: 2 }));
    expect(list["@id"]).toBe(`${SITE}/blog/page/2.html#breadcrumb`);
    expect(trail(list)).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "Blog", `${SITE}/blog.html`],
      [3, "Page 2", `${SITE}/blog/page/2.html`],
    ]);

    const homeCopy = listOf(pageWithTrail("index", { pageNumber: 3 }));
    expect(trail(homeCopy)).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "Page 3", `${SITE}/page/3.html`],
    ]);
  });

  it("emits none when the trail has a single entry (a project with no homepage)", () => {
    const pages = [pageRow("about", "About Us")];
    const page = pageWithTrail("about", { pages });
    expect(page.breadcrumbs).toHaveLength(1);
    expect(listOf(page)).toBeUndefined();
  });

  it("skips an entry with no address or label and renumbers the rest", () => {
    const page = {
      slug: "about",
      name: "About Us",
      breadcrumbs: [
        { label: "Home", canonicalPath: "index.html", home: true },
        { label: "Ghost", canonicalPath: null },
        { label: "  ", canonicalPath: "blank.html" },
        { label: "About Us", canonicalPath: "about.html", current: true },
      ],
    };
    expect(trail(listOf(page))).toEqual([
      [1, "Home", `${SITE}/`],
      [2, "About Us", `${SITE}/about.html`],
    ]);
  });

  it("emits nothing without a Site URL", () => {
    expect(graphFor(pageWithTrail("alice"), { siteUrl: "" })).toEqual([]);
  });
});
