import { describe, it, expect } from "vitest";
import { SeoTag } from "../SeoTag.js";

// SeoTag.render reads everything from the Liquid context's getAll(), so a plain
// object stub is enough to exercise the rendered og:image / twitter:image output.
// These pin the Phase-18 hardening: social image tags must be ABSOLUTE (built
// from siteUrl + the published assets/images/ location) or omitted entirely —
// a relative og:image is useless to crawlers.
function render(vars) {
  return SeoTag.render({ getAll: () => vars });
}

const pageWith = (seo) => ({ slug: "about", name: "About", seo });

describe("SeoTag on a paginated page", () => {
  const paged = (current, total = 3) => ({
    slug: "blog",
    name: "Blog",
    seo: { canonical_url: "https://elsewhere.example.com/blog" },
    pagination: { current, total },
  });
  const project = { siteUrl: "https://example.com/site/", siteTitle: "Site" };

  it("numbers the title and points canonical, prev and next at the copies", () => {
    const html = render({ page: paged(2), project });
    expect(html).toContain("<title>Blog - 2 - Site</title>");
    expect(html).toContain('<link rel="canonical" href="https://example.com/site/blog/page/2.html">');
    expect(html).toContain('<link rel="prev" href="https://example.com/site/blog.html">');
    expect(html).toContain('<link rel="next" href="https://example.com/site/blog/page/3.html">');
  });

  it("keeps page 1 as it was, adding only next", () => {
    const html = render({ page: paged(1), project: { ...project, cleanUrls: true } });
    expect(html).toContain("<title>Blog - Site</title>");
    expect(html).toContain('<link rel="canonical" href="https://elsewhere.example.com/blog">');
    expect(html).not.toContain('rel="prev"');
    expect(html).toContain('<link rel="next" href="https://example.com/site/blog/page/2">');
  });

  it("links the last page back to the homepage root when the homepage paginates", () => {
    const html = render({ page: { slug: "index", name: "Home", pagination: { current: 2, total: 2 } }, project });
    expect(html).toContain('<link rel="prev" href="https://example.com/site/">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/site/page/2.html">');
    expect(html).not.toContain('rel="next"');
  });

  it("emits no canonical, prev or next without a Site URL", () => {
    const html = render({ page: paged(2), project: { siteTitle: "Site" } });
    expect(html).toContain("<title>Blog - 2 - Site</title>");
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('rel="prev"');
  });
});

describe("SeoTag og:image (absolute-only hardening)", () => {
  it("emits an absolute og:image + twitter:image from siteUrl + published assets/images", () => {
    const html = render({
      page: pageWith({ og_image: "/uploads/images/hero.jpg" }),
      project: { siteUrl: "https://example.com" },
      mediaFiles: {},
    });
    expect(html).toContain('<meta property="og:image" content="https://example.com/assets/images/hero.jpg">');
    expect(html).toContain('<meta name="twitter:image" content="https://example.com/assets/images/hero.jpg">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("derives the large card even when a phantom twitter_card 'summary' is stored", () => {
    // Every editor save persists twitter_card: "summary" although no UI exposes
    // it, so the card type must be derived from image presence, not the stored value.
    const html = render({
      page: pageWith({ og_image: "/uploads/images/hero.jpg", twitter_card: "summary" }),
      project: { siteUrl: "https://example.com" },
      mediaFiles: {},
    });
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("omits og:image and twitter:image entirely when there is no siteUrl", () => {
    const html = render({
      page: pageWith({ og_image: "/uploads/images/hero.jpg" }),
      project: { siteUrl: "" },
      mediaFiles: {},
    });
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("twitter:image");
    // Degrades to a plain summary card rather than a large-image card.
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });

  it("passes a fully-qualified og_image through unchanged", () => {
    const html = render({
      page: pageWith({ og_image: "https://cdn.example.net/x.jpg" }),
      project: { siteUrl: "https://example.com" },
      mediaFiles: {},
    });
    expect(html).toContain('<meta property="og:image" content="https://cdn.example.net/x.jpg">');
  });

  it("uses the large variant filename for raster images", () => {
    const html = render({
      page: pageWith({ og_image: "/uploads/images/pic.png" }),
      project: { siteUrl: "https://example.com" },
      mediaFiles: { "pic.png": { type: "image/png", sizes: { large: { path: "/uploads/images/pic-large.png" } } } },
    });
    expect(html).toContain('<meta property="og:image" content="https://example.com/assets/images/pic-large.png">');
  });

  it("keeps the original filename for SVG (no large variant)", () => {
    const html = render({
      page: pageWith({ og_image: "/uploads/images/logo.svg" }),
      project: { siteUrl: "https://example.com" },
      mediaFiles: { "logo.svg": { type: "image/svg+xml", sizes: { large: { path: "/uploads/images/logo-large.svg" } } } },
    });
    expect(html).toContain('<meta property="og:image" content="https://example.com/assets/images/logo.svg">');
  });

  it("omits og:image when the page has no og_image", () => {
    const html = render({
      page: pageWith({}),
      project: { siteUrl: "https://example.com" },
      mediaFiles: {},
    });
    expect(html).not.toContain("og:image");
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });
});

describe("SeoTag canonical URL", () => {
  it("auto-generates <slug>.html from siteUrl by default", () => {
    const html = render({ page: pageWith({}), project: { siteUrl: "https://example.com" }, mediaFiles: {} });
    expect(html).toContain('<link rel="canonical" href="https://example.com/about.html">');
  });

  it("drops the .html extension when the project has cleanUrls", () => {
    const html = render({
      page: pageWith({}),
      project: { siteUrl: "https://example.com", cleanUrls: true },
      mediaFiles: {},
    });
    expect(html).toContain('<link rel="canonical" href="https://example.com/about">');
    expect(html).not.toContain("about.html");
  });

  it("canonicalizes the homepage to the bare root regardless of cleanUrls", () => {
    for (const cleanUrls of [false, true]) {
      const html = render({
        page: { slug: "index", name: "Home", seo: {} },
        project: { siteUrl: "https://example.com", cleanUrls },
        mediaFiles: {},
      });
      expect(html).toContain('<link rel="canonical" href="https://example.com/">');
    }
  });

  it("lets an explicit page-level canonical win over cleanUrls generation", () => {
    const html = render({
      page: pageWith({ canonical_url: "https://other.example.com/custom" }),
      project: { siteUrl: "https://example.com", cleanUrls: true },
      mediaFiles: {},
    });
    expect(html).toContain('<link rel="canonical" href="https://other.example.com/custom">');
  });

  it("emits no canonical without a siteUrl", () => {
    const html = render({ page: pageWith({}), project: { siteUrl: "", cleanUrls: true }, mediaFiles: {} });
    expect(html).not.toContain('rel="canonical"');
  });
});

// The canonical and the social image are two of the four generated absolute
// addresses (the sitemap and robots are the others), and they now share one Site
// URL base helper. A Site URL living in a subfolder is the case that used to come
// out differently depending on which of them built the URL.
describe("SeoTag — subfolder Site URL", () => {
  for (const siteUrl of ["https://example.com/repo", "https://example.com/repo/"]) {
    it(`keeps the subfolder on the canonical and og:image — "${siteUrl}"`, () => {
      const html = render({
        page: pageWith({ og_image: "/uploads/images/hero.jpg" }),
        project: { siteUrl },
        mediaFiles: {},
      });
      expect(html).toContain('<link rel="canonical" href="https://example.com/repo/about.html">');
      expect(html).toContain('content="https://example.com/repo/assets/images/hero.jpg"');
    });

    it(`canonicalizes the homepage to the subfolder base — "${siteUrl}"`, () => {
      for (const cleanUrls of [false, true]) {
        const html = render({
          page: { slug: "index", name: "Home", seo: {} },
          project: { siteUrl, cleanUrls },
          mediaFiles: {},
        });
        expect(html).toContain('<link rel="canonical" href="https://example.com/repo/">');
      }
    });

    it(`drops the extension under cleanUrls but keeps the subfolder — "${siteUrl}"`, () => {
      const html = render({ page: pageWith({}), project: { siteUrl, cleanUrls: true }, mediaFiles: {} });
      expect(html).toContain('<link rel="canonical" href="https://example.com/repo/about">');
    });
  }

  // Tightened validation rejects a query or fragment; a value stored before that
  // behaves as an unset Site URL — output omitted, never guessed at.
  it("omits both when the stored Site URL carries a query or fragment", () => {
    const html = render({
      page: pageWith({ og_image: "/uploads/images/hero.jpg" }),
      project: { siteUrl: "https://example.com/?utm=x" },
      mediaFiles: {},
    });
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("og:image");
  });

  it("still passes an author's absolute og_image through untouched", () => {
    const html = render({
      page: pageWith({ og_image: "https://cdn.example.net/shared.png" }),
      project: { siteUrl: "https://example.com/repo/" },
      mediaFiles: {},
    });
    expect(html).toContain('content="https://cdn.example.net/shared.png"');
  });
});
