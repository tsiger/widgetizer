/**
 * page-shaped object for collection item pages (spec Section 13; Finding #12).
 *
 * buildCollectionItemPageData maps a normalized collection item + its schema
 * into the page-shaped object renderPageLayout / SeoTag consume. SEO now comes
 * from the item's own page-shaped `seo` object (parity with page SEO), so the
 * shared SeoTag handles the title/og fallbacks and twitter card; this builder
 * only passes the seo object through and precomputes the absolute canonical from
 * siteUrl (an explicit author canonical wins).
 *
 * Run with: node --test server/tests/collectionItemPageData.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildCollectionItemPageData } from "../services/collectionService.js";

const schema = {
  type: "portfolio",
  slugPrefix: "portfolio",
  hasItemPages: true,
  settings: [
    { type: "header", id: "h", label: "Content" },
    { type: "text", id: "title", usedAsTitle: true },
    { type: "image", id: "featured_image" },
  ],
};

const item = {
  slug: "project-alpha",
  uuid: "uuid-alpha",
  created: "2025-01-01T00:00:00.000Z",
  updated: "2025-02-02T00:00:00.000Z",
  settings: { title: "Project Alpha", featured_image: "/uploads/images/featured.jpg" },
  seo: {
    description: "About Alpha.",
    og_title: "Alpha — social",
    og_image: "/uploads/images/social.jpg",
    og_type: "article",
    twitter_card: "summary",
    canonical_url: "",
    robots: "index,follow",
  },
};

describe("buildCollectionItemPageData", () => {
  it("builds CSS-safe id and path-shaped slug", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com");
    assert.equal(p.id, "portfolio-project-alpha");
    assert.equal(p.slug, "portfolio/project-alpha");
    assert.equal(p.uuid, "uuid-alpha");
  });

  it("name comes from the usedAsTitle field, passing through timestamps", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com");
    assert.equal(p.name, "Project Alpha");
    assert.equal(p.created, "2025-01-01T00:00:00.000Z");
    assert.equal(p.updated, "2025-02-02T00:00:00.000Z");
  });

  it("passes the item's page-shaped seo object through", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com");
    assert.equal(p.seo.description, "About Alpha.");
    assert.equal(p.seo.og_title, "Alpha — social");
    assert.equal(p.seo.og_image, "/uploads/images/social.jpg");
    assert.equal(p.seo.og_type, "article");
    assert.equal(p.seo.twitter_card, "summary");
    assert.equal(p.seo.robots, "index,follow");
  });

  it("defaults og_type to article and robots to index,follow when seo is absent", () => {
    const p = buildCollectionItemPageData(schema, { ...item, seo: undefined }, "");
    assert.equal(p.seo.og_type, "article");
    assert.equal(p.seo.robots, "index,follow");
    assert.equal(p.seo.description, "");
    assert.equal(p.seo.og_image, "");
  });

  it("auto-builds an absolute canonical when none is set and siteUrl is valid", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com/");
    assert.equal(p.seo.canonical_url, "https://x.com/portfolio/project-alpha.html");
  });

  it("an explicit canonical_url wins over the auto value", () => {
    const withCanon = { ...item, seo: { ...item.seo, canonical_url: "https://canonical.example/x" } };
    const p = buildCollectionItemPageData(schema, withCanon, "https://x.com");
    assert.equal(p.seo.canonical_url, "https://canonical.example/x");
  });

  it("leaves canonical_url empty when siteUrl is unset/invalid and none is set", () => {
    assert.equal(buildCollectionItemPageData(schema, item, "").seo.canonical_url, "");
    assert.equal(buildCollectionItemPageData(schema, item, "not a url").seo.canonical_url, "");
  });

  it("robots noindex passes through (drives sitemap/robots exclusion)", () => {
    const noindex = { ...item, seo: { ...item.seo, robots: "noindex,follow" } };
    assert.equal(buildCollectionItemPageData(schema, noindex, "").seo.robots, "noindex,follow");
  });

  it("falls back to slug for name when no title value", () => {
    const p = buildCollectionItemPageData(schema, { ...item, settings: {} }, "");
    assert.equal(p.name, "project-alpha");
  });
});
