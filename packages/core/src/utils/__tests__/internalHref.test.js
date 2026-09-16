import { describe, it, expect } from "vitest";
import { isHomeSlug, pageHref, itemHref, siteUrlBase, absoluteSiteUrl, siteUrlPathname } from "../internalHref.js";

describe("isHomeSlug", () => {
  it("recognises the two home slugs only", () => {
    expect(isHomeSlug("index")).toBe(true);
    expect(isHomeSlug("home")).toBe(true);
    expect(isHomeSlug("about")).toBe(false);
    expect(isHomeSlug("")).toBe(false);
    expect(isHomeSlug(undefined)).toBe(false);
  });
});

describe("pageHref — flag OFF (byte-identical to today)", () => {
  it("emits <slug>.html at the root", () => {
    expect(pageHref("about")).toBe("about.html");
    expect(pageHref("index")).toBe("index.html");
    expect(pageHref("home")).toBe("home.html");
  });
  it("depth-prefixes one level deep", () => {
    expect(pageHref("about", { outputPathPrefix: "../" })).toBe("../about.html");
    expect(pageHref("index", { outputPathPrefix: "../" })).toBe("../index.html");
  });
});

describe("pageHref — flag ON", () => {
  it("drops the extension", () => {
    expect(pageHref("about", { cleanUrls: true })).toBe("about");
    expect(pageHref("about", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../about");
  });
  it("home is ./ at the root and exactly ../ one level deep (never .././ or index)", () => {
    expect(pageHref("index", { cleanUrls: true })).toBe("./");
    expect(pageHref("home", { cleanUrls: true })).toBe("./");
    expect(pageHref("index", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../");
  });
});

describe("itemHref", () => {
  it("OFF keeps .html; ON drops it; both depth-prefix", () => {
    expect(itemHref("rooms", "suite")).toBe("rooms/suite.html");
    expect(itemHref("rooms", "suite", { outputPathPrefix: "../" })).toBe("../rooms/suite.html");
    expect(itemHref("rooms", "suite", { cleanUrls: true })).toBe("rooms/suite");
    expect(itemHref("rooms", "suite", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../rooms/suite");
  });
  it("an item slugged index/home is an ordinary item address, never the site root", () => {
    expect(itemHref("rooms", "index", { cleanUrls: true })).toBe("rooms/index");
    expect(itemHref("rooms", "home", { cleanUrls: true })).toBe("rooms/home");
    expect(itemHref("rooms", "index", { cleanUrls: true, outputPathPrefix: "../" })).toBe("../rooms/index");
    expect(itemHref("rooms", "index")).toBe("rooms/index.html");
  });
});

// The target's language. `outputPathPrefix` is the rendering page's depth with
// its own language folder included, so a cross-language link is plain prefixing:
// from `el/contact.html` (`../`) the English about page is `../about.html` and
// the Greek one `../el/about.html`.
describe("pageHref / itemHref — target language", () => {
  const EL = { language: "el", defaultLanguage: "en" };
  const depths = ["", "../", "../../"];

  it("leaves the default language at the root, however it is spelled", () => {
    for (const lang of [
      {},
      { language: "" },
      { language: "en", defaultLanguage: "en" },
      { language: "el", defaultLanguage: "el" },
    ]) {
      expect(pageHref("about", { ...lang })).toBe("about.html");
      expect(pageHref("index", { cleanUrls: true, outputPathPrefix: "../", ...lang })).toBe("../");
      expect(itemHref("rooms", "suite", { cleanUrls: true, ...lang })).toBe("rooms/suite");
    }
  });

  it.each(depths)("folders another language's pages and items from depth '%s'", (outputPathPrefix) => {
    expect(pageHref("about", { outputPathPrefix, ...EL })).toBe(`${outputPathPrefix}el/about.html`);
    expect(pageHref("about", { cleanUrls: true, outputPathPrefix, ...EL })).toBe(`${outputPathPrefix}el/about`);
    expect(itemHref("rooms", "suite", { outputPathPrefix, ...EL })).toBe(`${outputPathPrefix}el/rooms/suite.html`);
    expect(itemHref("rooms", "suite", { cleanUrls: true, outputPathPrefix, ...EL })).toBe(
      `${outputPathPrefix}el/rooms/suite`,
    );
  });

  it("links another language's home as its folder, a directory under Clean URLs", () => {
    expect(pageHref("index", { ...EL })).toBe("el/index.html");
    expect(pageHref("index", { outputPathPrefix: "../", ...EL })).toBe("../el/index.html");
    expect(pageHref("index", { cleanUrls: true, ...EL })).toBe("el/");
    expect(pageHref("home", { cleanUrls: true, ...EL })).toBe("el/");
    expect(pageHref("index", { cleanUrls: true, outputPathPrefix: "../", ...EL })).toBe("../el/");
    expect(pageHref("index", { cleanUrls: true, outputPathPrefix: "../../", ...EL })).toBe("../../el/");
  });

  it("links the default language from a non-default page by depth alone", () => {
    const fromGreekContact = { outputPathPrefix: "../", language: "en", defaultLanguage: "en" };
    expect(pageHref("about", fromGreekContact)).toBe("../about.html");
    expect(pageHref("index", { ...fromGreekContact, cleanUrls: true })).toBe("../");
    expect(itemHref("rooms", "suite", fromGreekContact)).toBe("../rooms/suite.html");
  });
});

// One Site URL base for every generated absolute address — canonical, og:image,
// sitemap <loc>, robots Sitemap: — so they cannot disagree. The cases that used
// to differ per call site are the subfolder Site URL (a GitHub-Pages-style
// project deploy) and whether the user typed a trailing slash.
describe("siteUrlBase", () => {
  it("normalises to a directory base with exactly one trailing slash", () => {
    expect(siteUrlBase("https://e.com")).toBe("https://e.com/");
    expect(siteUrlBase("https://e.com/")).toBe("https://e.com/");
    expect(siteUrlBase("https://e.com/repo")).toBe("https://e.com/repo/");
    expect(siteUrlBase("https://e.com/repo/")).toBe("https://e.com/repo/");
    expect(siteUrlBase("  https://e.com/repo  ")).toBe("https://e.com/repo/");
  });

  it("returns '' for anything unusable as a base", () => {
    // Every caller reads "" as "no absolute URL can be built" and omits its
    // output rather than inventing an address.
    expect(siteUrlBase("")).toBe("");
    expect(siteUrlBase("   ")).toBe("");
    expect(siteUrlBase(undefined)).toBe("");
    expect(siteUrlBase(null)).toBe("");
    expect(siteUrlBase(42)).toBe("");
    expect(siteUrlBase("not a url")).toBe("");
    expect(siteUrlBase("ftp://e.com")).toBe("");
    // A stored value from before the validation tightened.
    expect(siteUrlBase("https://e.com/?utm=x")).toBe("");
    expect(siteUrlBase("https://e.com/#top")).toBe("");
  });
});

describe("absoluteSiteUrl", () => {
  it("joins a page path onto the base at the root", () => {
    expect(absoluteSiteUrl("https://e.com", "about.html")).toBe("https://e.com/about.html");
    expect(absoluteSiteUrl("https://e.com/", "about.html")).toBe("https://e.com/about.html");
    expect(absoluteSiteUrl("https://e.com", "about")).toBe("https://e.com/about");
    expect(absoluteSiteUrl("https://e.com", "news/story.html")).toBe("https://e.com/news/story.html");
  });

  it("keeps a subfolder base whether or not the trailing slash was typed", () => {
    // The old per-call-site joins dropped `repo` for the no-slash form, because
    // `new URL("about.html", "https://e.com/repo")` resolves against the parent.
    for (const base of ["https://e.com/repo", "https://e.com/repo/"]) {
      expect(absoluteSiteUrl(base, "about.html")).toBe("https://e.com/repo/about.html");
      expect(absoluteSiteUrl(base, "news/story.html")).toBe("https://e.com/repo/news/story.html");
      expect(absoluteSiteUrl(base, "assets/images/hero.jpg")).toBe("https://e.com/repo/assets/images/hero.jpg");
      expect(absoluteSiteUrl(base, "sitemap.xml")).toBe("https://e.com/repo/sitemap.xml");
    }
  });

  it("treats a leading slash as relative to the base, not the host root", () => {
    expect(absoluteSiteUrl("https://e.com/repo/", "/about.html")).toBe("https://e.com/repo/about.html");
    expect(absoluteSiteUrl("https://e.com/repo/", "//about.html")).toBe("https://e.com/repo/about.html");
  });

  it("returns the base itself for an empty path — the homepage address", () => {
    expect(absoluteSiteUrl("https://e.com", "")).toBe("https://e.com/");
    expect(absoluteSiteUrl("https://e.com/repo", "")).toBe("https://e.com/repo/");
    expect(absoluteSiteUrl("https://e.com/repo/")).toBe("https://e.com/repo/");
  });

  it("returns '' when there is no usable base", () => {
    expect(absoluteSiteUrl("", "about.html")).toBe("");
    expect(absoluteSiteUrl(undefined, "about.html")).toBe("");
    expect(absoluteSiteUrl("https://e.com/?utm=x", "about.html")).toBe("");
  });
});

describe("siteUrlPathname", () => {
  it("includes the base's own folder, because robots paths resolve at the host root", () => {
    expect(siteUrlPathname("https://e.com", "private.html")).toBe("/private.html");
    expect(siteUrlPathname("https://e.com/repo", "private.html")).toBe("/repo/private.html");
    expect(siteUrlPathname("https://e.com/repo/", "private")).toBe("/repo/private");
    expect(siteUrlPathname("https://e.com/repo/", "news/draft.html")).toBe("/repo/news/draft.html");
  });

  it("falls back to a host-root path with no usable base", () => {
    expect(siteUrlPathname("", "private.html")).toBe("/private.html");
    expect(siteUrlPathname("https://e.com/?utm=x", "private.html")).toBe("/private.html");
  });
});
