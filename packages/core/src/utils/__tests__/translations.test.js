import { describe, it, expect } from "vitest";
import { buildTranslations, translationSibling } from "../translations.js";

/**
 * §7c is a theme contract: once a theme ships a switcher against this shape it
 * cannot change. These pin the shape and the two rules that differ between its
 * consumers — the switcher may follow a fallback, hreflang may not.
 */
const EN_ABOUT = { uuid: "u-about", slug: "about", language: "en", name: "About" };
const EL_ABOUT = { uuid: "u-el-about", translationGroupId: "u-about", slug: "sxetika", language: "el" };
const EN_HOME = { uuid: "u-home", slug: "index", language: "en" };
const EL_HOME = { uuid: "u-el-home", slug: "index", language: "el" };
const EN_ALONE = { uuid: "u-alone", slug: "careers", language: "en" };

const SITE = {
  languages: ["en", "el"],
  defaultLanguage: "en",
  siteUrl: "https://example.com/",
  pages: [EN_HOME, EL_HOME, EN_ABOUT, EL_ABOUT, EN_ALONE],
};

describe("page.translations", () => {
  it("carries both link forms, because one value cannot be both", () => {
    const [en, el] = buildTranslations({ ...SITE, current: EN_ABOUT });

    expect(en).toEqual({
      language: "en",
      hreflang: "en",
      label: "English",
      href: "about.html",
      seoUrl: "https://example.com/about.html",
      active: true,
      fallback: false,
      noindex: false,
      dir: "ltr",
    });
    expect(el.href).toBe("el/sxetika.html");
    expect(el.seoUrl).toBe("https://example.com/el/sxetika.html");
    expect(el.label).toBe("Ελληνικά");
    expect(el.active).toBe(false);
  });

  // The switcher and hreflang part company here too: a noindex page is still a
  // page a visitor may be sent to, and only the crawler-facing consumer cares.
  it("marks a sibling that asked not to be indexed, without hiding it", () => {
    const elNoindex = { ...EL_ABOUT, seo: { robots: "noindex,follow" } };
    const [en, el] = buildTranslations({
      ...SITE,
      pages: [EN_HOME, EL_HOME, EN_ABOUT, elNoindex],
      current: EN_ABOUT,
    });

    expect(el.noindex).toBe(true);
    expect(el.href).toBe("el/sxetika.html");
    expect(en.noindex).toBe(false);
  });

  // A fallback entry points at a homepage, so it is the HOMEPAGE's directive
  // that decides whether the entry may be an alternate. The missing sibling has
  // no directive at all.
  it("reads a fallback entry's noindex off the homepage it points at", () => {
    const elHomeNoindex = { ...EL_HOME, seo: { robots: "noindex,follow" } };
    const [, el] = buildTranslations({
      ...SITE,
      pages: [EN_HOME, elHomeNoindex, EN_ALONE],
      current: EN_ALONE,
    });

    expect(el.fallback).toBe(true);
    expect(el.noindex).toBe(true);
    expect(el.href).toBe("el/index.html");
  });

  // The defect this guards against: the SEO builders pass whole records and a
  // render passes the uuid reference map, so a field missing from the map made
  // the sitemap and the HTML describe the same site differently. Feeding both
  // shapes through must give one answer, whatever fields are added later.
  it("gives the same answer for whole records and for reference-map entries", () => {
    const elNoindex = { ...EL_ABOUT, seo: { robots: "noindex,follow" } };
    const pages = [EN_HOME, EL_HOME, EN_ABOUT, elNoindex];

    const fromRecords = buildTranslations({ ...SITE, pages, current: EN_ABOUT });
    const fromReferences = buildTranslations({
      ...SITE,
      pages: pages.map((page) => translationSibling(page)),
      current: translationSibling(EN_ABOUT),
    });

    expect(fromReferences).toEqual(fromRecords);
    // Not vacuous: the flag the two used to disagree about is set.
    expect(fromRecords.find((entry) => entry.language === "el").noindex).toBe(true);
  });

  it("marks the page being rendered, from either side of the group", () => {
    expect(buildTranslations({ ...SITE, current: EL_ABOUT }).map((t) => t.active)).toEqual([false, true]);
  });

  it("points a language with no sibling at its own homepage, and says so", () => {
    const [, el] = buildTranslations({ ...SITE, current: EN_ALONE });
    expect(el.fallback).toBe(true);
    expect(el.href).toBe("el/index.html");
    // The ADDRESS of a homepage is its folder, Clean URLs or not — the same
    // rule the canonical tag uses, which hreflang must not contradict.
    expect(el.seoUrl).toBe("https://example.com/el/");
  });

  it("gives a homepage the canonical address the canonical tag gives it", () => {
    const [en, el] = buildTranslations({ ...SITE, current: EN_HOME });
    expect(en.seoUrl).toBe("https://example.com/");
    expect(el.seoUrl).toBe("https://example.com/el/");
    // The link is still a link: a real file, or the folder under Clean URLs.
    expect(el.href).toBe("el/index.html");
    expect(buildTranslations({ ...SITE, current: EN_HOME, cleanUrls: true })[1].href).toBe("el/");
  });

  it("follows Clean URLs in both forms", () => {
    const [en, el] = buildTranslations({ ...SITE, current: EN_ABOUT, cleanUrls: true });
    expect(en.href).toBe("about");
    expect(en.seoUrl).toBe("https://example.com/about");
    expect(el.href).toBe("el/sxetika");

    const [, elFallback] = buildTranslations({ ...SITE, current: EN_ALONE, cleanUrls: true });
    expect(elFallback.href).toBe("el/");
    expect(elFallback.seoUrl).toBe("https://example.com/el/");
  });

  it("is depth-aware, so a switcher on a nested page still resolves", () => {
    const [, el] = buildTranslations({ ...SITE, current: EN_ABOUT, outputPathPrefix: "../" });
    expect(el.href).toBe("../el/sxetika.html");
    // The absolute form is never depth-prefixed — it is not a link in a page.
    expect(el.seoUrl).toBe("https://example.com/el/sxetika.html");
  });

  it("leaves out a language nobody has written a homepage for", () => {
    const withoutGreekHome = { ...SITE, pages: [EN_HOME, EN_ABOUT, EL_ABOUT] };
    expect(buildTranslations({ ...withoutGreekHome, current: EN_ABOUT }).map((t) => t.language)).toEqual(["en"]);
  });

  it("gives a single-language project nothing at all", () => {
    expect(buildTranslations({ ...SITE, languages: [], current: EN_ABOUT })).toEqual([]);
  });

  it("answers for a collection item the same way it answers for a page", () => {
    const enStory = { uuid: "u-story", slug: "launch", language: "en" };
    const elStory = { uuid: "u-el-story", translationGroupId: "u-story", slug: "kalimera", language: "el" };
    const [en, el] = buildTranslations({
      ...SITE,
      kind: "item",
      slugPrefix: "news",
      items: [enStory, elStory],
      current: enStory,
      outputPathPrefix: "../",
    });

    expect(en.href).toBe("../news/launch.html");
    expect(el.href).toBe("../el/news/kalimera.html");
    expect(el.seoUrl).toBe("https://example.com/el/news/kalimera.html");
  });

  it("falls an item back to its language's homepage, not to a made-up item", () => {
    const enStory = { uuid: "u-story", slug: "launch", language: "en" };
    const [, el] = buildTranslations({
      ...SITE,
      kind: "item",
      slugPrefix: "news",
      items: [enStory],
      current: enStory,
      outputPathPrefix: "../",
    });
    expect(el.fallback).toBe(true);
    expect(el.href).toBe("../el/index.html");
  });

  it("leaves seoUrl empty when the project has no Site URL, rather than inventing one", () => {
    const [en] = buildTranslations({ ...SITE, siteUrl: "", current: EN_ABOUT });
    expect(en.seoUrl).toBe("");
    expect(en.href).toBe("about.html");
  });

  it("cases the hreflang for markup while the code itself stays lowercase", () => {
    const withRegional = {
      ...SITE,
      languages: ["en", "pt-br"],
      pages: [EN_HOME, { uuid: "u-pt-home", slug: "index", language: "pt-br" }, EN_ABOUT],
    };
    const [, pt] = buildTranslations({ ...withRegional, current: EN_ABOUT });
    expect(pt.language).toBe("pt-br");
    expect(pt.hreflang).toBe("pt-BR");
  });
});
