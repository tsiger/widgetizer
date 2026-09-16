import { describe, it, expect } from "vitest";
import {
  isHomeSlug,
  resolveLanguage,
  languageFolder,
  isReservedPageSlug,
  isReservedItemSlug,
  isReservedSlugPrefix,
  pagesDir,
  pageKey,
  globalsDir,
  globalKey,
  menusDir,
  menuKey,
  itemsDir,
  itemKey,
  parseContentKey,
  languageFromKey,
  pageOutputPath,
  itemOutputPath,
  publicPath,
  outputHref,
  homeHref,
  pagedHref,
  parsePagedPath,
  usageId,
  previewRoute,
  parsePreviewRoute,
  pagedPreviewPath,
} from "../contentAddress.js";
import { outputPathPrefixFor } from "../linkPrefixer.js";

const EL = { language: "el", defaultLanguage: "en" };
const DEFAULTS = [
  { label: "no language", lang: undefined },
  { label: "empty language", lang: { language: "", defaultLanguage: "en" } },
  { label: "the default itself", lang: { language: "en", defaultLanguage: "en" } },
  { label: "a non-English default", lang: { language: "el", defaultLanguage: "el" } },
  { label: "no defaultLanguage given", lang: { language: "en" } },
];
const DEPTHS = ["", "../", "../../"];

describe("resolveLanguage / languageFolder", () => {
  it("reads empty as the default, and the default as en when nothing says otherwise", () => {
    expect(resolveLanguage("", "el")).toBe("el");
    expect(resolveLanguage(undefined, "el")).toBe("el");
    expect(resolveLanguage("it", "el")).toBe("it");
    expect(resolveLanguage("", "")).toBe("en");
    expect(resolveLanguage(" IT ", "el")).toBe("it");
  });

  it.each(DEFAULTS)("puts the default language at the root: $label", ({ lang }) => {
    expect(languageFolder(lang)).toBe("");
  });

  it("gives every other language a folder named by its code", () => {
    expect(languageFolder(EL)).toBe("el");
    expect(languageFolder({ language: "el" })).toBe("el");
    expect(languageFolder({ language: "PT-BR", defaultLanguage: "en" })).toBe("pt-br");
    expect(languageFolder({ language: "en", defaultLanguage: "el" })).toBe("en");
  });

  it("refuses a code that is not a language, so it can never become a path", () => {
    expect(() => languageFolder({ language: "../x" })).toThrow(TypeError);
    expect(() => languageFolder({ language: "global" })).toThrow(TypeError);
  });
});

describe("reserved names", () => {
  it("reserves page for pages, but leaves index and home to them", () => {
    expect(isReservedPageSlug("page")).toBe(true);
    expect(isReservedPageSlug("index")).toBe(false);
    expect(isReservedPageSlug("home")).toBe(false);
    expect(isReservedPageSlug("pages")).toBe(false);
    expect(isHomeSlug("home")).toBe(true);
  });

  it("reserves the enabled language codes for root pages only", () => {
    const languages = ["el", "it"];
    expect(isReservedPageSlug("el", { languages })).toBe(true);
    expect(isReservedPageSlug("it", { languages, language: "en", defaultLanguage: "en" })).toBe(true);
    expect(isReservedPageSlug("it", { languages, ...EL })).toBe(false);
    expect(isReservedPageSlug("page", { languages, ...EL })).toBe(true);
    expect(isReservedPageSlug("tv", { languages })).toBe(false);
    expect(isReservedPageSlug("el")).toBe(false);
  });

  it("reserves index and page for items", () => {
    expect(isReservedItemSlug("index")).toBe(true);
    expect(isReservedItemSlug("page")).toBe(true);
    expect(isReservedItemSlug("home")).toBe(false);
  });

  it("reserves assets and the enabled language codes as a collection prefix, but not page", () => {
    expect(isReservedSlugPrefix("assets")).toBe(true);
    expect(isReservedSlugPrefix("page")).toBe(false);
    expect(isReservedSlugPrefix("news")).toBe(false);
    expect(isReservedSlugPrefix("el", { languages: ["el"] })).toBe(true);
    expect(isReservedSlugPrefix("el")).toBe(false);
  });
});

describe("storage keys", () => {
  it.each(DEFAULTS)("keeps the default language flat: $label", ({ lang }) => {
    expect(pagesDir(lang)).toBe("pages");
    expect(pageKey("about", lang)).toBe("pages/about.json");
    expect(globalsDir(lang)).toBe("pages/global");
    expect(globalKey("header", lang)).toBe("pages/global/header.json");
    expect(menusDir(lang)).toBe("menus");
    expect(menuKey("main", lang)).toBe("menus/main.json");
    expect(itemsDir("news", lang)).toBe("collections/news");
    expect(itemKey("news", "story", lang)).toBe("collections/news/story.json");
  });

  it("nests another language in its folder, under the collection type for items", () => {
    expect(pagesDir(EL)).toBe("pages/el");
    expect(pageKey("about", EL)).toBe("pages/el/about.json");
    expect(globalsDir(EL)).toBe("pages/el/global");
    expect(globalKey("footer", EL)).toBe("pages/el/global/footer.json");
    expect(menusDir(EL)).toBe("menus/el");
    expect(menuKey("main", EL)).toBe("menus/el/main.json");
    expect(itemsDir("news", EL)).toBe("collections/news/el");
    expect(itemKey("news", "story", EL)).toBe("collections/news/el/story.json");
  });

  it("reads every key back, with the folder as persisted", () => {
    for (const lang of [undefined, EL]) {
      const folder = languageFolder(lang);
      expect(parseContentKey(pageKey("about", lang))).toEqual({ kind: "page", language: folder, slug: "about" });
      expect(parseContentKey(globalKey("header", lang))).toEqual({ kind: "global", language: folder, type: "header" });
      expect(parseContentKey(menuKey("main", lang))).toEqual({ kind: "menu", language: folder, id: "main" });
      expect(parseContentKey(itemKey("news", "story", lang))).toEqual({
        kind: "item",
        language: folder,
        type: "news",
        slug: "story",
      });
    }
    expect(languageFromKey("pages/global/header.json")).toBe("");
    expect(languageFromKey("pages/el/global/header.json")).toBe("el");
    expect(languageFromKey("pages/pt-br/about.json")).toBe("pt-br");
    expect(languageFromKey("collections/news/_order.json")).toBe("");
    expect(languageFromKey("collections/news/el/_order.json")).toBe("el");
  });

  it("rejects a key no builder produces", () => {
    expect(parseContentKey("pages/drafts/about.json")).toBeNull();
    expect(parseContentKey("collections/news/deep/el/story.json")).toBeNull();
    expect(parseContentKey("pages/about.txt")).toBeNull();
    expect(parseContentKey("theme/settings.json")).toBeNull();
    expect(languageFromKey(undefined)).toBeNull();
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

  it.each(DEFAULTS)("writes the default language at the root: $label", ({ lang }) => {
    expect(pageOutputPath("blog", 1, lang)).toBe("blog.html");
    expect(pageOutputPath("index", 2, lang)).toBe("page/2.html");
    expect(itemOutputPath("news", "alpha", lang)).toBe("news/alpha.html");
  });

  it("puts the language first for every other language, before the collection prefix", () => {
    expect(pageOutputPath("blog", 1, EL)).toBe("el/blog.html");
    expect(pageOutputPath("blog", 2, EL)).toBe("el/blog/page/2.html");
    expect(pageOutputPath("index", 1, EL)).toBe("el/index.html");
    expect(pageOutputPath("home", 1, EL)).toBe("el/index.html");
    expect(pageOutputPath("index", 3, EL)).toBe("el/page/3.html");
    expect(itemOutputPath("news", "alpha", EL)).toBe("el/news/alpha.html");
  });

  it("gives every output path its depth", () => {
    expect(outputPathPrefixFor(pageOutputPath("blog"))).toBe("");
    expect(outputPathPrefixFor(pageOutputPath("index", 2))).toBe("../");
    expect(outputPathPrefixFor(itemOutputPath("news", "alpha"))).toBe("../");
    expect(outputPathPrefixFor(pageOutputPath("blog", 2))).toBe("../../");
    expect(outputPathPrefixFor(pageOutputPath("blog", 1, EL))).toBe("../");
    expect(outputPathPrefixFor(pageOutputPath("index", 1, EL))).toBe("../");
    expect(outputPathPrefixFor(itemOutputPath("news", "alpha", EL))).toBe("../../");
    expect(outputPathPrefixFor(pageOutputPath("blog", 2, EL))).toBe("../../../");
  });

  it("drops .html and the homepage file name when Clean URLs is on", () => {
    expect(publicPath("blog/page/2.html")).toBe("blog/page/2.html");
    expect(publicPath("blog/page/2.html", { cleanUrls: true })).toBe("blog/page/2");
    expect(publicPath("index.html", { cleanUrls: true })).toBe("");
    expect(publicPath("page/2.html", { cleanUrls: true })).toBe("page/2");
    expect(publicPath("el/blog.html", { cleanUrls: true })).toBe("el/blog");
    expect(publicPath("el/news/alpha.html", { cleanUrls: true })).toBe("el/news/alpha");
  });

  it("collapses only the root homepage: a legacy item slugged index keeps its address", () => {
    expect(publicPath("news/index.html", { cleanUrls: true })).toBe("news/index");
    expect(publicPath("el/news/index.html", { cleanUrls: true })).toBe("el/news/index");
    expect(publicPath("el/index.html", { cleanUrls: true })).toBe("el/index");
    expect(outputHref("news/index.html", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../news/index");
  });
});

describe("outputHref / pagedHref", () => {
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
    for (const { lang } of DEFAULTS) expect(pagedHref("blog", 2, { ...opts, ...lang })).toBe(shape.two);
  });

  it.each(DEPTHS)("links another language's pages from depth '%s' under both shapes", (outputPathPrefix) => {
    const off = { cleanUrls: false, outputPathPrefix, ...EL };
    const on = { cleanUrls: true, outputPathPrefix, ...EL };
    expect(pagedHref("blog", 1, off)).toBe(`${outputPathPrefix}el/blog.html`);
    expect(pagedHref("blog", 2, off)).toBe(`${outputPathPrefix}el/blog/page/2.html`);
    expect(pagedHref("index", 1, off)).toBe(`${outputPathPrefix}el/index.html`);
    expect(pagedHref("index", 2, off)).toBe(`${outputPathPrefix}el/page/2.html`);
    expect(pagedHref("blog", 1, on)).toBe(`${outputPathPrefix}el/blog`);
    expect(pagedHref("blog", 2, on)).toBe(`${outputPathPrefix}el/blog/page/2`);
    expect(pagedHref("index", 1, on)).toBe(`${outputPathPrefix}el/`);
    expect(pagedHref("home", 1, on)).toBe(`${outputPathPrefix}el/`);
    expect(pagedHref("index", 2, on)).toBe(`${outputPathPrefix}el/page/2`);
  });

  it.each(DEPTHS)("links a homepage as its directory from depth '%s'", (outputPathPrefix) => {
    expect(homeHref({ outputPathPrefix })).toBe(`${outputPathPrefix}index.html`);
    expect(homeHref({ cleanUrls: true, outputPathPrefix })).toBe(outputPathPrefix || "./");
    expect(homeHref({ outputPathPrefix, ...EL })).toBe(`${outputPathPrefix}el/index.html`);
    expect(homeHref({ cleanUrls: true, outputPathPrefix, ...EL })).toBe(`${outputPathPrefix}el/`);
  });

  it("links any output path, with the clean root home as ./ or the depth alone", () => {
    expect(outputHref("news/alpha.html", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../news/alpha");
    expect(outputHref("el/news/alpha.html", { outputPathPrefix: "../../" })).toBe("../../el/news/alpha.html");
    expect(outputHref("index.html", { cleanUrls: true })).toBe("./");
    expect(outputHref("index.html", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../");
    expect(outputHref("index.html")).toBe("index.html");
  });
});

describe("paged path inverses", () => {
  it("reads a page copy back from either Clean URLs shape", () => {
    expect(parsePagedPath("blog/page/2.html")).toEqual({ language: "", slug: "blog", pageNumber: 2 });
    expect(parsePagedPath("blog/page/12")).toEqual({ language: "", slug: "blog", pageNumber: 12 });
    expect(parsePagedPath("page/3")).toEqual({ language: "", slug: "index", pageNumber: 3 });
    expect(parsePagedPath("blog.html")).toBeNull();
    expect(parsePagedPath("news/alpha.html")).toBeNull();
    expect(parsePagedPath("blog/page/0")).toBeNull();
  });

  it("reads a language folder, telling a Greek homepage copy from a root page slugged el", () => {
    expect(parsePagedPath("el/blog/page/2.html")).toEqual({ language: "el", slug: "blog", pageNumber: 2 });
    expect(parsePagedPath("el/blog/page/2")).toEqual({ language: "el", slug: "blog", pageNumber: 2 });
    expect(parsePagedPath("el/page/2", { languages: ["el"] })).toEqual({ language: "el", slug: "index", pageNumber: 2 });
    expect(parsePagedPath("el/page/2")).toEqual({ language: "", slug: "el", pageNumber: 2 });
    expect(parsePagedPath("el/page/2", { languages: ["it"] })).toEqual({ language: "", slug: "el", pageNumber: 2 });
  });

  it("round-trips every output path", () => {
    for (const lang of [undefined, EL]) {
      const folder = languageFolder(lang);
      for (const slug of ["blog", "index"]) {
        for (const cleanUrls of [false, true]) {
          const path = publicPath(pageOutputPath(slug, 2, lang), { cleanUrls });
          expect(parsePagedPath(path, { languages: ["el"] })).toEqual({ language: folder, slug, pageNumber: 2 });
        }
      }
    }
  });

  it("maps a page copy to its preview route", () => {
    expect(pagedPreviewPath("blog", 1)).toBe("/preview/blog");
    expect(pagedPreviewPath("blog", 2)).toBe("/preview/paged/blog/2");
  });
});

describe("usage ids", () => {
  it("keys pages and items by uuid, whatever the language", () => {
    expect(usageId.page("u1")).toBe("page:u1");
    expect(usageId.item("u2")).toBe("collection:u2");
  });

  it("names the default globals by position, so a default-language switch keeps their rows", () => {
    for (const { lang } of DEFAULTS) expect(usageId.global("header", lang)).toBe("global:root:header");
    expect(usageId.global("header", EL)).toBe("global:el:header");
    expect(usageId.global("footer", { language: "en", defaultLanguage: "el" })).toBe("global:en:footer");
  });
});

describe("preview routes", () => {
  it("always carries a namespace and the resolved language", () => {
    expect(previewRoute.page("contact")).toBe("/preview/page/en/contact");
    expect(previewRoute.page("contact", { defaultLanguage: "el" })).toBe("/preview/page/el/contact");
    expect(previewRoute.page("contact", EL)).toBe("/preview/page/el/contact");
    expect(previewRoute.page("index", { ...EL, pageNumber: 2 })).toBe("/preview/page/el/index/page/2");
    expect(previewRoute.page("blog", { pageNumber: 3 })).toBe("/preview/page/en/blog/page/3");
    expect(previewRoute.item("news", "story")).toBe("/preview/collection/en/news/story");
    expect(previewRoute.item("news", "story", EL)).toBe("/preview/collection/el/news/story");
  });

  it("reads every route back", () => {
    expect(parsePreviewRoute(previewRoute.page("contact", EL))).toEqual({
      kind: "page",
      language: "el",
      slug: "contact",
      pageNumber: 1,
    });
    expect(parsePreviewRoute(previewRoute.page("blog", { pageNumber: 3 }))).toEqual({
      kind: "page",
      language: "en",
      slug: "blog",
      pageNumber: 3,
    });
    expect(parsePreviewRoute(previewRoute.item("news", "story", EL))).toEqual({
      kind: "item",
      language: "el",
      slugPrefix: "news",
      slug: "story",
    });
  });

  it("rejects the un-namespaced routes and a segment that is not a language", () => {
    expect(parsePreviewRoute("/preview/contact")).toBeNull();
    expect(parsePreviewRoute("/preview/paged/blog/2")).toBeNull();
    expect(parsePreviewRoute("/preview/collection/news/story")).toBeNull();
    expect(parsePreviewRoute("/preview/page/global/contact")).toBeNull();
    expect(parsePreviewRoute("/preview/page/el/blog/page/0")).toBeNull();
    expect(parsePreviewRoute(undefined)).toBeNull();
  });
});
