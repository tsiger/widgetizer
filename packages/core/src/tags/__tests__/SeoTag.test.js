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
