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
