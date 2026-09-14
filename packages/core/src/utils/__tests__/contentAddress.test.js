import { describe, it, expect } from "vitest";
import {
  isReservedPageSlug,
  isReservedItemSlug,
  isReservedSlugPrefix,
  pageOutputPath,
  itemOutputPath,
  publicPath,
  pagedHref,
  parsePagedPath,
  pagedPreviewPath,
} from "../contentAddress.js";
import { outputPathPrefixFor } from "../linkPrefixer.js";

describe("reserved names", () => {
  it("reserves page for pages, but leaves index and home to them", () => {
    expect(isReservedPageSlug("page")).toBe(true);
    expect(isReservedPageSlug("index")).toBe(false);
    expect(isReservedPageSlug("home")).toBe(false);
    expect(isReservedPageSlug("pages")).toBe(false);
  });

  it("reserves index and page for items", () => {
    expect(isReservedItemSlug("index")).toBe(true);
    expect(isReservedItemSlug("page")).toBe(true);
    expect(isReservedItemSlug("home")).toBe(false);
  });

  it("reserves assets as a collection prefix, but not page, which existing collections may use", () => {
    expect(isReservedSlugPrefix("assets")).toBe(true);
    expect(isReservedSlugPrefix("page")).toBe(false);
    expect(isReservedSlugPrefix("news")).toBe(false);
  });
});

describe("output paths", () => {
  it("puts page 1 at the page itself and later pages under it", () => {
    expect(pageOutputPath("blog")).toBe("blog.html");
    expect(pageOutputPath("blog", 1)).toBe("blog.html");
    expect(pageOutputPath("blog", 2)).toBe("blog/page/2.html");
    expect(pageOutputPath("index")).toBe("index.html");
    expect(pageOutputPath("home")).toBe("index.html");
    expect(pageOutputPath("index", 3)).toBe("page/3.html");
    expect(itemOutputPath("news", "alpha")).toBe("news/alpha.html");
  });

  it("gives every output path its depth", () => {
    expect(outputPathPrefixFor(pageOutputPath("blog"))).toBe("");
    expect(outputPathPrefixFor(pageOutputPath("index", 2))).toBe("../");
    expect(outputPathPrefixFor(itemOutputPath("news", "alpha"))).toBe("../");
    expect(outputPathPrefixFor(pageOutputPath("blog", 2))).toBe("../../");
  });

  it("drops .html and the homepage file name when Clean URLs is on", () => {
    expect(publicPath("blog/page/2.html")).toBe("blog/page/2.html");
    expect(publicPath("blog/page/2.html", { cleanUrls: true })).toBe("blog/page/2");
    expect(publicPath("index.html", { cleanUrls: true })).toBe("");
    expect(publicPath("page/2.html", { cleanUrls: true })).toBe("page/2");
  });
});

describe("pagedHref", () => {
  const shapes = [
    { cleanUrls: false, outputPathPrefix: "", one: "blog.html", two: "blog/page/2.html", home: "index.html", homeTwo: "page/2.html" },
    { cleanUrls: true, outputPathPrefix: "", one: "blog", two: "blog/page/2", home: "./", homeTwo: "page/2" },
    { cleanUrls: false, outputPathPrefix: "../", one: "../blog.html", two: "../blog/page/2.html", home: "../index.html", homeTwo: "../page/2.html" },
    { cleanUrls: true, outputPathPrefix: "../../", one: "../../blog", two: "../../blog/page/2", home: "../../", homeTwo: "../../page/2" },
  ];

  it.each(shapes)("links pages at Clean URLs $cleanUrls and prefix '$outputPathPrefix'", (shape) => {
    const opts = { cleanUrls: shape.cleanUrls, outputPathPrefix: shape.outputPathPrefix };
    expect(pagedHref("blog", 1, opts)).toBe(shape.one);
    expect(pagedHref("blog", 2, opts)).toBe(shape.two);
    expect(pagedHref("index", 1, opts)).toBe(shape.home);
    expect(pagedHref("index", 2, opts)).toBe(shape.homeTwo);
    expect(pagedHref("home", 1, opts)).toBe(shape.home);
    expect(pagedHref("home", 2, opts)).toBe(shape.homeTwo);
  });
});

describe("paged path inverses", () => {
  it("reads a page copy back from either Clean URLs shape", () => {
    expect(parsePagedPath("blog/page/2.html")).toEqual({ slug: "blog", pageNumber: 2 });
    expect(parsePagedPath("blog/page/12")).toEqual({ slug: "blog", pageNumber: 12 });
    expect(parsePagedPath("page/3")).toEqual({ slug: "index", pageNumber: 3 });
    expect(parsePagedPath("blog.html")).toBeNull();
    expect(parsePagedPath("news/alpha.html")).toBeNull();
    expect(parsePagedPath("blog/page/0")).toBeNull();
  });

  it("maps a page copy to its preview route", () => {
    expect(pagedPreviewPath("blog", 1)).toBe("/preview/blog");
    expect(pagedPreviewPath("blog", 2)).toBe("/preview/paged/blog/2");
  });
});
