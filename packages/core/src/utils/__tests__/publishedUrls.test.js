import { describe, it, expect } from "vitest";
import { pageUrlAt, pageSelfUrl, itemUrlAt } from "../publishedUrls.js";

const SITE = "https://e.com/repo";

describe("pageUrlAt", () => {
  it.each([false, true])("addresses the default language at the base, Clean URLs %s", (cleanUrls) => {
    const project = { siteUrl: SITE, cleanUrls };
    const ext = cleanUrls ? "" : ".html";
    expect(pageUrlAt("index", 1, project)).toBe("https://e.com/repo/");
    expect(pageUrlAt("home", 1, project)).toBe("https://e.com/repo/");
    expect(pageUrlAt("about", 1, project)).toBe(`https://e.com/repo/about${ext}`);
    expect(pageUrlAt("about", 2, project)).toBe(`https://e.com/repo/about/page/2${ext}`);
    expect(pageUrlAt("index", 2, project)).toBe(`https://e.com/repo/page/2${ext}`);
    expect(pageUrlAt("about", 1, project, { language: "en" })).toBe(`https://e.com/repo/about${ext}`);
  });

  it.each([false, true])(
    "addresses another language under its folder, its home as a directory, Clean URLs %s",
    (cleanUrls) => {
      const project = { siteUrl: SITE, cleanUrls, defaultLanguage: "en" };
      const ext = cleanUrls ? "" : ".html";
      const el = { language: "el" };
      expect(pageUrlAt("index", 1, project, el)).toBe("https://e.com/repo/el/");
      expect(pageUrlAt("about", 1, project, el)).toBe(`https://e.com/repo/el/about${ext}`);
      expect(pageUrlAt("about", 2, project, el)).toBe(`https://e.com/repo/el/about/page/2${ext}`);
      expect(pageUrlAt("index", 2, project, el)).toBe(`https://e.com/repo/el/page/2${ext}`);
    },
  );

  it("reads the project's own default, not en", () => {
    const project = { siteUrl: SITE, defaultLanguage: "el" };
    expect(pageUrlAt("about", 1, project, { language: "el" })).toBe("https://e.com/repo/about.html");
    expect(pageUrlAt("about", 1, project, { language: "en" })).toBe("https://e.com/repo/en/about.html");
  });

  it("keeps a legacy collection item slugged index at its file address, never a directory", () => {
    const project = { siteUrl: SITE, cleanUrls: true, defaultLanguage: "en" };
    expect(pageUrlAt("news/index", 1, project)).toBe("https://e.com/repo/news/index");
    expect(pageUrlAt("news/index", 1, project, { language: "el" })).toBe("https://e.com/repo/el/news/index");
    expect(pageSelfUrl({ slug: "news/index" }, project)).toBe("https://e.com/repo/news/index");
  });

  it("gives nothing without a usable Site URL", () => {
    expect(pageUrlAt("about", 1, { siteUrl: "" }, { language: "el" })).toBe("");
  });
});

describe("itemUrlAt", () => {
  it.each([false, true])("puts a translated item under its own folder, Clean URLs %s", (cleanUrls) => {
    const project = { siteUrl: SITE, cleanUrls, defaultLanguage: "en" };
    const ext = cleanUrls ? "" : ".html";
    expect(itemUrlAt("news", "alpha", project)).toBe(`https://e.com/repo/news/alpha${ext}`);
    expect(itemUrlAt("news", "alpha", project, { language: "en" })).toBe(`https://e.com/repo/news/alpha${ext}`);
    expect(itemUrlAt("news", "alpha", project, { language: "el" })).toBe(`https://e.com/repo/el/news/alpha${ext}`);
  });

  it("gives nothing without a usable Site URL", () => {
    expect(itemUrlAt("news", "alpha", { siteUrl: "" }, { language: "el" })).toBe("");
  });
});

describe("pageSelfUrl", () => {
  it("follows the page's language and copy number", () => {
    const project = { siteUrl: SITE, cleanUrls: true, defaultLanguage: "en" };
    expect(pageSelfUrl({ slug: "about" }, project)).toBe("https://e.com/repo/about");
    expect(pageSelfUrl({ slug: "about", language: "en" }, project)).toBe("https://e.com/repo/about");
    expect(pageSelfUrl({ slug: "about", language: "el" }, project)).toBe("https://e.com/repo/el/about");
    expect(pageSelfUrl({ slug: "index", language: "el" }, project)).toBe("https://e.com/repo/el/");
    expect(pageSelfUrl({ slug: "blog", language: "el", pagination: { current: 2, total: 3 } }, project)).toBe(
      "https://e.com/repo/el/blog/page/2",
    );
    expect(pageSelfUrl({}, project)).toBe("");
  });
});
