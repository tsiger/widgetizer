/**
 * Pure SEO artifact builders (sitemap.xml + robots.txt).
 *
 * These were extracted from exportController so the OSS export pipeline and
 * hosted's cloud render loop emit identical output from one source. The full
 * pipeline is covered by export.test.js; this pins the helpers directly since
 * they are part of the builder-server barrel hosted consumes.
 *
 * Run with: node --test packages/builder-server/src/tests/seoArtifacts.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSitemap, buildRobotsTxt } from "../services/seoArtifacts.js";

const SITE_URL = "https://example.com";
const PAGES = [
  { id: "index", slug: "index", updated: "2026-06-01T10:00:00.000Z" },
  { id: "about", slug: "about", updated: "2026-06-02T10:00:00.000Z" },
  { id: "hidden", slug: "hidden", seo: { robots: "noindex, nofollow" }, updated: "2026-06-03T10:00:00.000Z" },
];

describe("buildSitemap", () => {
  it("maps the homepage to the bare root and others to <slug>.html", async () => {
    const xml = await buildSitemap(PAGES, SITE_URL);
    assert.ok(xml.includes("<urlset"), "is a urlset");
    assert.ok(xml.includes(`<loc>${SITE_URL}/</loc>`), "homepage is the bare root");
    assert.ok(!xml.includes("index.html"), "homepage is not /index.html");
    assert.ok(xml.includes("about.html"), "includes about page");
  });

  it("excludes noindex pages", async () => {
    const xml = await buildSitemap(PAGES, SITE_URL);
    assert.ok(!xml.includes("hidden.html"), "noindex page excluded");
  });

  it("returns null for a missing or invalid siteUrl", async () => {
    assert.equal(await buildSitemap(PAGES, ""), null);
    assert.equal(await buildSitemap(PAGES, "not-a-url"), null);
  });

  it("emits extensionless URLs with cleanUrls (pages + collection items)", async () => {
    const items = [{ slugPrefix: "news", items: [{ slug: "hello", updated: "2026-06-04T10:00:00.000Z" }] }];
    const xml = await buildSitemap(PAGES, SITE_URL, items, true);
    assert.ok(xml.includes(`<loc>${SITE_URL}/</loc>`), "homepage stays the bare root");
    assert.ok(xml.includes(`<loc>${SITE_URL}/about</loc>`), "page URL has no extension");
    assert.ok(xml.includes(`<loc>${SITE_URL}/news/hello</loc>`), "item URL has no extension");
    assert.ok(!xml.includes(".html"), "no .html anywhere");
  });
});

describe("buildRobotsTxt", () => {
  it("allows all, references the sitemap, and disallows noindex pages", () => {
    const robots = buildRobotsTxt(PAGES, SITE_URL);
    assert.ok(robots.includes("User-agent: *"));
    assert.ok(robots.includes("Allow: /"));
    assert.ok(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
    assert.ok(robots.includes("Disallow: /hidden.html"));
  });

  it("returns null for a missing or invalid siteUrl", () => {
    assert.equal(buildRobotsTxt(PAGES, ""), null);
    assert.equal(buildRobotsTxt(PAGES, "not-a-url"), null);
  });

  it("disallows the extensionless path with cleanUrls (prefix also covers .html)", () => {
    const items = [{ slugPrefix: "news", items: [{ slug: "secret", seo: { robots: "noindex" } }] }];
    const robots = buildRobotsTxt(PAGES, SITE_URL, items, true);
    assert.ok(robots.includes("Disallow: /hidden"));
    assert.ok(!robots.includes("Disallow: /hidden.html"));
    assert.ok(robots.includes("Disallow: /news/secret"));
  });
});

// Every generated absolute address now comes from one Site URL base helper, so
// these pin the two inputs that used to be handled differently per call site: a
// Site URL living in a subfolder (a project-page deploy such as
// user.github.io/repo/) and whether the trailing slash was typed.
describe("Site URL base — subfolder and trailing-slash forms", () => {
  const ITEMS = [
    {
      slugPrefix: "news",
      items: [
        { slug: "alpha", updated: "2026-06-04T10:00:00.000Z" },
        { slug: "draft", seo: { robots: "noindex" }, updated: "2026-06-05T10:00:00.000Z" },
      ],
    },
  ];

  for (const base of ["https://example.com/repo", "https://example.com/repo/"]) {
    for (const cleanUrls of [false, true]) {
      const ext = cleanUrls ? "" : ".html";
      const label = `base "${base}", cleanUrls ${cleanUrls}`;

      it(`sitemap keeps the subfolder on every loc — ${label}`, async () => {
        const xml = await buildSitemap(PAGES, base, ITEMS, cleanUrls);
        // The homepage used to resolve to the HOST root, dropping /repo entirely.
        assert.ok(xml.includes("<loc>https://example.com/repo/</loc>"), xml);
        assert.ok(xml.includes(`<loc>https://example.com/repo/about${ext}</loc>`), xml);
        assert.ok(xml.includes(`<loc>https://example.com/repo/news/alpha${ext}</loc>`), xml);
        assert.ok(!xml.includes("<loc>https://example.com/about"), "no host-root page loc");
        assert.ok(!xml.includes("hidden"), "noindex page still excluded");
        assert.ok(!xml.includes("draft"), "noindex item still excluded");
      });

      it(`robots paths and Sitemap: carry the subfolder — ${label}`, () => {
        const robots = buildRobotsTxt(PAGES, base, ITEMS, cleanUrls);
        assert.ok(robots.includes("Sitemap: https://example.com/repo/sitemap.xml"), robots);
        // A bare /hidden would protect nothing on a site served under /repo/.
        assert.ok(robots.includes(`Disallow: /repo/hidden${ext}`), robots);
        assert.ok(robots.includes(`Disallow: /repo/news/draft${ext}`), robots);
        assert.ok(!/Disallow: \/hidden/.test(robots), "no host-root disallow");
      });
    }
  }

  it("root Site URLs are unchanged in both trailing-slash forms", async () => {
    for (const base of ["https://example.com", "https://example.com/"]) {
      const xml = await buildSitemap(PAGES, base);
      assert.ok(xml.includes("<loc>https://example.com/</loc>"), xml);
      assert.ok(xml.includes("<loc>https://example.com/about.html</loc>"), xml);

      const robots = buildRobotsTxt(PAGES, base);
      assert.ok(robots.includes("Sitemap: https://example.com/sitemap.xml"), robots);
      assert.ok(robots.includes("Disallow: /hidden.html"), robots);
    }
  });

  // Tightened validation rejects a query or fragment. A value stored before that
  // must not crash an export or silently invent an address — it behaves as an
  // unset Site URL, which omits generated SEO output.
  it("treats a stored query/fragment Site URL as unusable rather than guessing", async () => {
    assert.equal(await buildSitemap(PAGES, "https://example.com/?utm=x"), null);
    assert.equal(buildRobotsTxt(PAGES, "https://example.com/#top"), null);
  });
});
