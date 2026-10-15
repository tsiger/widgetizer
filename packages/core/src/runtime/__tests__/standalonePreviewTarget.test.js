import { describe, expect, it } from "vitest";
import { getStandalonePreviewTarget } from "../standalonePreviewTarget.js";
import { previewRoute } from "../../utils/contentAddress.js";

// This is the single source of truth used at runtime by previewRuntime.js (the
// injected preview iframe script). The mapping previously had a dead duplicate in
// editor-ui's previewLinkUtils.js whose test was the only coverage; the test moved
// here with the function so the LIVE implementation is the one under test.
//
// Every route is namespaced with a language, because `/preview/el/contact` alone
// cannot say whether `el` is a language or a collection prefix.

describe("getStandalonePreviewTarget", () => {
  it("returns a preview route for internal html links", () => {
    expect(getStandalonePreviewTarget("about.html")).toBe("/preview/page/en/about");
    expect(getStandalonePreviewTarget("/contact.html?foo=bar")).toBe("/preview/page/en/contact");
  });

  it("reads an already-namespaced preview link as itself", () => {
    expect(getStandalonePreviewTarget("/preview/page/el/services")).toBe("/preview/page/el/services");
    expect(getStandalonePreviewTarget("/preview/collection/el/rooms/suite")).toBe(
      "/preview/collection/el/rooms/suite",
    );
  });

  it("reads the older flat route as the default language", () => {
    expect(getStandalonePreviewTarget("/preview/services")).toBe("/preview/page/en/services");
  });

  it("returns a collection item route for nested item html links", () => {
    expect(getStandalonePreviewTarget("rooms/suite-caldera.html")).toBe("/preview/collection/en/rooms/suite-caldera");
    expect(getStandalonePreviewTarget("/excursions/sunset-cruise.html?ref=1")).toBe(
      "/preview/collection/en/excursions/sunset-cruise",
    );
  });

  it("blocks hash links", () => {
    expect(getStandalonePreviewTarget("#features")).toBeNull();
    expect(getStandalonePreviewTarget("  #pricing")).toBeNull();
  });

  it("blocks external and non-page protocols", () => {
    expect(getStandalonePreviewTarget("https://example.com")).toBeNull();
    expect(getStandalonePreviewTarget("http://example.com")).toBeNull();
    expect(getStandalonePreviewTarget("//cdn.example.com")).toBeNull();
    expect(getStandalonePreviewTarget("mailto:test@example.com")).toBeNull();
    expect(getStandalonePreviewTarget("tel:+123456789")).toBeNull();
    expect(getStandalonePreviewTarget("javascript:alert(1)")).toBeNull();
  });

  it("blocks any URI scheme, not just the common ones — a scheme is never an extensionless page", () => {
    expect(getStandalonePreviewTarget("sms:+1555")).toBeNull();
    expect(getStandalonePreviewTarget("webcal:events")).toBeNull();
    expect(getStandalonePreviewTarget("urn:isbn:123")).toBeNull();
    expect(getStandalonePreviewTarget("SMS:+1555")).toBeNull();
    expect(getStandalonePreviewTarget("data:text/html,hi")).toBeNull();
  });

  it("blocks unsupported internal paths", () => {
    expect(getStandalonePreviewTarget("/")).toBeNull();
    // Two dotless segments are a Clean URLs item link (spec §4.4), not unsupported.
    expect(getStandalonePreviewTarget("/foo/bar")).toBe("/preview/collection/en/foo/bar");
  });

  it("maps extensionless page links (Clean URLs) to the page preview route", () => {
    expect(getStandalonePreviewTarget("about")).toBe("/preview/page/en/about");
    expect(getStandalonePreviewTarget("./about")).toBe("/preview/page/en/about");
    expect(getStandalonePreviewTarget("../about")).toBe("/preview/page/en/about");
    expect(getStandalonePreviewTarget("about?x=1#top")).toBe("/preview/page/en/about");
  });

  it("maps extensionless item links to the collection preview route", () => {
    expect(getStandalonePreviewTarget("rooms/suite")).toBe("/preview/collection/en/rooms/suite");
    expect(getStandalonePreviewTarget("../rooms/suite")).toBe("/preview/collection/en/rooms/suite");
  });

  it("maps the clean home link shapes to the index preview", () => {
    expect(getStandalonePreviewTarget("./")).toBe("/preview/page/en/index");
    expect(getStandalonePreviewTarget("../")).toBe("/preview/page/en/index");
    expect(getStandalonePreviewTarget("index")).toBe("/preview/page/en/index");
    expect(getStandalonePreviewTarget("home")).toBe("/preview/page/en/home");
  });

  it("maps paginated page copies to the paged page route", () => {
    expect(getStandalonePreviewTarget("blog/page/2.html")).toBe("/preview/page/en/blog/page/2");
    expect(getStandalonePreviewTarget("../../blog/page/3")).toBe("/preview/page/en/blog/page/3");
    expect(getStandalonePreviewTarget("page/2.html")).toBe("/preview/page/en/index/page/2");
    expect(getStandalonePreviewTarget("../page/4")).toBe("/preview/page/en/index/page/4");
    expect(getStandalonePreviewTarget("collection/page/2.html")).toBe("/preview/page/en/collection/page/2");
    expect(getStandalonePreviewTarget("blog/page/0")).toBeNull();
  });

  it("sends page/<n> to the collection item when a collection publishes under page/", () => {
    const withPagePrefix = { collectionPrefixes: ["news", "page"] };
    expect(getStandalonePreviewTarget("page/2.html", withPagePrefix)).toBe("/preview/collection/en/page/2");
    expect(getStandalonePreviewTarget("page/2", withPagePrefix)).toBe("/preview/collection/en/page/2");
    expect(getStandalonePreviewTarget("../page/2", withPagePrefix)).toBe("/preview/collection/en/page/2");
    expect(getStandalonePreviewTarget("blog/page/2.html", withPagePrefix)).toBe("/preview/page/en/blog/page/2");
    expect(getStandalonePreviewTarget("../../blog/page/3", withPagePrefix)).toBe("/preview/page/en/blog/page/3");

    const withoutPagePrefix = { collectionPrefixes: ["news"] };
    expect(getStandalonePreviewTarget("page/2.html", withoutPagePrefix)).toBe("/preview/page/en/index/page/2");
    expect(getStandalonePreviewTarget("page/2", withoutPagePrefix)).toBe("/preview/page/en/index/page/2");
  });

  it("still returns null for non-navigable hrefs", () => {
    expect(getStandalonePreviewTarget("/")).toBeNull();
    expect(getStandalonePreviewTarget("assets/site.css")).toBeNull();
    expect(getStandalonePreviewTarget("a/b/c")).toBeNull();
    expect(getStandalonePreviewTarget("mailto:x@y.z")).toBeNull();
    expect(getStandalonePreviewTarget("//cdn/x")).toBeNull();
  });
});

// A rendered href is relative to the page it sits on, and a translated page sits
// one folder down. Reading it without that context lands on the wrong language.
describe("getStandalonePreviewTarget on a translated site", () => {
  const site = { languages: ["el"], defaultLanguage: "en" };
  const onGreekHome = { ...site, outputPath: "el/index.html" };
  const onGreekItem = { ...site, outputPath: "el/news/story.html" };

  it("keeps a sibling link inside the language it was rendered in", () => {
    expect(getStandalonePreviewTarget("about.html", onGreekHome)).toBe("/preview/page/el/about");
    expect(getStandalonePreviewTarget("about", onGreekHome)).toBe("/preview/page/el/about");
  });

  it("follows a link that climbs back out to the default language", () => {
    expect(getStandalonePreviewTarget("../about.html", onGreekHome)).toBe("/preview/page/en/about");
  });

  it("follows a cross-language link from the default language", () => {
    expect(getStandalonePreviewTarget("el/contact.html", { ...site, outputPath: "index.html" })).toBe(
      "/preview/page/el/contact",
    );
  });

  it("reads an item page's own depth, not just its language", () => {
    // el/news/story.html sits two deep, so the Greek home is "../../el/" and
    // "../../" is the English root — the depth is the whole point.
    expect(getStandalonePreviewTarget("../../el/", onGreekItem)).toBe("/preview/page/el/index");
    expect(getStandalonePreviewTarget("../../", onGreekItem)).toBe("/preview/page/en/index");
    expect(getStandalonePreviewTarget("../../el/about.html", onGreekItem)).toBe("/preview/page/el/about");
    expect(getStandalonePreviewTarget("../../about.html", onGreekItem)).toBe("/preview/page/en/about");
    // A sibling item is just its filename.
    expect(getStandalonePreviewTarget("story-two.html", onGreekItem)).toBe(
      "/preview/collection/el/news/story-two",
    );
  });

  it("treats a folder that is not an enabled language as content", () => {
    expect(getStandalonePreviewTarget("fr/about.html", { ...site, outputPath: "index.html" })).toBe(
      "/preview/collection/en/fr/about",
    );
  });

  it("finds a translated homepage through its folder", () => {
    expect(getStandalonePreviewTarget("el/", { ...site, outputPath: "index.html" })).toBe("/preview/page/el/index");
    expect(getStandalonePreviewTarget("el/index.html", { ...site, outputPath: "index.html" })).toBe(
      "/preview/page/el/index",
    );
  });
});

// The runtime cannot import contentAddress (only these two runtime files are
// served to the iframe), so the shapes are spelled twice. This is the seam.
describe("the routes it emits are the ones contentAddress builds", () => {
  const site = { languages: ["el"], defaultLanguage: "en", outputPath: "index.html" };

  it("agrees on pages, paged pages and items", () => {
    expect(getStandalonePreviewTarget("el/about.html", site)).toBe(
      previewRoute.page("about", { language: "el", defaultLanguage: "en" }),
    );
    expect(getStandalonePreviewTarget("el/blog/page/2.html", site)).toBe(
      previewRoute.page("blog", { pageNumber: 2, language: "el", defaultLanguage: "en" }),
    );
    expect(getStandalonePreviewTarget("el/rooms/suite.html", site)).toBe(
      previewRoute.item("rooms", "suite", { language: "el", defaultLanguage: "en" }),
    );
    expect(getStandalonePreviewTarget("about.html", site)).toBe(
      previewRoute.page("about", { language: "en", defaultLanguage: "en" }),
    );
  });
});
