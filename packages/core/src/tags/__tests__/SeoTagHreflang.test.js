import { describe, it, expect } from "vitest";
import { SeoTag } from "../SeoTag.js";

/**
 * §7d: a set without a self-reference is invalid and search engines ignore it,
 * so the page always lists itself. `x-default` is the one place a fallback
 * entry is legitimate — an ordinary alternate pointing at a language's homepage
 * would claim that homepage is the translation of this page, which it is not.
 */
const render = (vars) => SeoTag.render({ getAll: () => vars });

const PROJECT = { siteUrl: "https://example.com/", siteTitle: "Site", defaultLanguage: "en" };

const entry = (language, overrides = {}) => ({
  language,
  hreflang: language,
  label: language,
  href: `${language}/about.html`,
  seoUrl: `https://example.com/${language}/about.html`,
  active: false,
  fallback: false,
  dir: "ltr",
  ...overrides,
});

const pageWith = (translations) => ({
  slug: "about",
  name: "About",
  language: "en",
  seo: {},
  translations,
});

describe("hreflang", () => {
  it("lists every language, the page itself included", () => {
    const html = render({
      page: pageWith([
        entry("en", { active: true, seoUrl: "https://example.com/about.html" }),
        entry("el"),
      ]),
      project: PROJECT,
    });

    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://example.com/about.html">');
    expect(html).toContain('<link rel="alternate" hreflang="el" href="https://example.com/el/about.html">');
  });

  it("points x-default at the default language", () => {
    const html = render({
      page: pageWith([entry("en", { active: true, seoUrl: "https://example.com/about.html" }), entry("el")]),
      project: PROJECT,
    });
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://example.com/about.html">');
  });

  it("leaves out a language that only falls back to its homepage", () => {
    const html = render({
      page: pageWith([
        entry("en", { active: true, seoUrl: "https://example.com/about.html" }),
        entry("el", { fallback: true, seoUrl: "https://example.com/el/index.html" }),
      ]),
      project: PROJECT,
    });

    expect(html).not.toContain('hreflang="el"');
    // The self-reference and x-default still stand.
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="x-default"');
  });

  it("still gives x-default when the default language is the fallback one", () => {
    const html = render({
      page: pageWith([
        entry("en", { fallback: true, seoUrl: "https://example.com/index.html" }),
        entry("el", { active: true }),
      ]),
      project: PROJECT,
    });

    expect(html).not.toContain('hreflang="en" href');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://example.com/index.html">');
  });

  it("emits nothing at all for a single-language project", () => {
    expect(render({ page: pageWith([]), project: PROJECT })).not.toContain("hreflang");
    expect(render({ page: pageWith(undefined), project: PROJECT })).not.toContain("hreflang");
    // One entry is still one language — a set of one says nothing.
    expect(render({ page: pageWith([entry("en", { active: true })]), project: PROJECT })).not.toContain("hreflang");
  });

  it("omits an entry with no absolute URL rather than emitting a relative one", () => {
    const html = render({
      page: pageWith([
        entry("en", { active: true, seoUrl: "" }),
        entry("el", { seoUrl: "" }),
      ]),
      project: { ...PROJECT, siteUrl: "" },
    });
    expect(html).not.toContain("hreflang");
  });

  it("uses the canonically cased code in the markup", () => {
    const html = render({
      page: pageWith([
        entry("en", { active: true, seoUrl: "https://example.com/about.html" }),
        entry("pt-br", { hreflang: "pt-BR", seoUrl: "https://example.com/pt-br/about.html" }),
      ]),
      project: PROJECT,
    });
    expect(html).toContain('hreflang="pt-BR"');
  });
});
