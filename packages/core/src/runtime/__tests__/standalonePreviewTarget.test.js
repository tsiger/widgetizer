import { describe, expect, it } from "vitest";
import { getStandalonePreviewTarget } from "../standalonePreviewTarget.js";

// This is the single source of truth used at runtime by previewRuntime.js (the
// injected preview iframe script). The mapping previously had a dead duplicate in
// editor-ui's previewLinkUtils.js whose test was the only coverage; the test moved
// here with the function so the LIVE implementation is the one under test.

describe("getStandalonePreviewTarget", () => {
  it("returns a preview route for internal html links", () => {
    expect(getStandalonePreviewTarget("about.html")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("/contact.html?foo=bar")).toBe("/preview/contact");
  });

  it("returns a preview route for existing preview links", () => {
    expect(getStandalonePreviewTarget("/preview/services")).toBe("/preview/services");
  });

  it("returns a collection item route for nested item html links", () => {
    expect(getStandalonePreviewTarget("rooms/suite-caldera.html")).toBe("/preview/collection/rooms/suite-caldera");
    expect(getStandalonePreviewTarget("/excursions/sunset-cruise.html?ref=1")).toBe(
      "/preview/collection/excursions/sunset-cruise",
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
    expect(getStandalonePreviewTarget("/foo/bar")).toBe("/preview/collection/foo/bar");
  });

  it("maps extensionless page links (Clean URLs) to the page preview route", () => {
    expect(getStandalonePreviewTarget("about")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("./about")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("../about")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("about?x=1#top")).toBe("/preview/about");
  });

  it("maps extensionless item links to the collection preview route", () => {
    expect(getStandalonePreviewTarget("rooms/suite")).toBe("/preview/collection/rooms/suite");
    expect(getStandalonePreviewTarget("../rooms/suite")).toBe("/preview/collection/rooms/suite");
  });

  it("maps the clean home link shapes to the index preview", () => {
    expect(getStandalonePreviewTarget("./")).toBe("/preview/index");
    expect(getStandalonePreviewTarget("../")).toBe("/preview/index");
    expect(getStandalonePreviewTarget("index")).toBe("/preview/index");
    expect(getStandalonePreviewTarget("home")).toBe("/preview/home");
  });

  it("maps paginated page copies to the paged page route", () => {
    expect(getStandalonePreviewTarget("blog/page/2.html")).toBe("/preview/paged/blog/2");
    expect(getStandalonePreviewTarget("../../blog/page/3")).toBe("/preview/paged/blog/3");
    expect(getStandalonePreviewTarget("page/2.html")).toBe("/preview/paged/index/2");
    expect(getStandalonePreviewTarget("../page/4")).toBe("/preview/paged/index/4");
    expect(getStandalonePreviewTarget("collection/page/2.html")).toBe("/preview/paged/collection/2");
    expect(getStandalonePreviewTarget("blog/page/0")).toBeNull();
  });

  it("sends page/<n> to the collection item when a collection publishes under page/", () => {
    const withPagePrefix = { collectionPrefixes: ["news", "page"] };
    expect(getStandalonePreviewTarget("page/2.html", withPagePrefix)).toBe("/preview/collection/page/2");
    expect(getStandalonePreviewTarget("page/2", withPagePrefix)).toBe("/preview/collection/page/2");
    expect(getStandalonePreviewTarget("../page/2", withPagePrefix)).toBe("/preview/collection/page/2");
    expect(getStandalonePreviewTarget("blog/page/2.html", withPagePrefix)).toBe("/preview/paged/blog/2");
    expect(getStandalonePreviewTarget("../../blog/page/3", withPagePrefix)).toBe("/preview/paged/blog/3");

    const withoutPagePrefix = { collectionPrefixes: ["news"] };
    expect(getStandalonePreviewTarget("page/2.html", withoutPagePrefix)).toBe("/preview/paged/index/2");
    expect(getStandalonePreviewTarget("page/2", withoutPagePrefix)).toBe("/preview/paged/index/2");
  });

  it("still returns null for non-navigable hrefs", () => {
    expect(getStandalonePreviewTarget("/")).toBeNull();
    expect(getStandalonePreviewTarget("assets/site.css")).toBeNull();
    expect(getStandalonePreviewTarget("a/b/c")).toBeNull();
    expect(getStandalonePreviewTarget("mailto:x@y.z")).toBeNull();
    expect(getStandalonePreviewTarget("//cdn/x")).toBeNull();
  });
});
