/**
 * Phase 19 — page-shaped object for collection item pages (spec Section 13).
 *
 * buildCollectionItemPageData maps a normalized collection item + its schema
 * into the page-shaped object renderPageLayout / SeoTag consume, using the
 * usedAsTitle / usedAsOgImage schema flags and the seo_* convention fields.
 *
 * Run with: node --test server/tests/collectionItemPageData.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildCollectionItemPageData } from "../services/collectionService.js";

const schema = {
  type: "portfolio",
  slugPrefix: "portfolio",
  settings: [
    { type: "header", id: "h", label: "Content" },
    { type: "text", id: "title", usedAsTitle: true },
    { type: "image", id: "featured_image", usedAsOgImage: true },
    { type: "text", id: "seo_title" },
    { type: "textarea", id: "seo_description" },
    { type: "checkbox", id: "seo_noindex" },
  ],
};

const item = {
  slug: "project-alpha",
  uuid: "uuid-alpha",
  created: "2025-01-01T00:00:00.000Z",
  updated: "2025-02-02T00:00:00.000Z",
  settings: {
    title: "Project Alpha",
    featured_image: "/uploads/images/featured.jpg",
    seo_title: "Alpha — SEO",
    seo_description: "About Alpha.",
    seo_noindex: false,
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

  it("maps the seo_* convention fields and fixed og values", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com");
    assert.equal(p.seo.title, "Alpha — SEO");
    assert.equal(p.seo.description, "About Alpha.");
    assert.equal(p.seo.robots, "index,follow");
    assert.equal(p.seo.og_image, "/uploads/images/featured.jpg");
    assert.equal(p.seo.og_title, "Alpha — SEO");
    assert.equal(p.seo.og_type, "article");
    assert.equal(p.seo.twitter_card, "summary_large_image");
  });

  it("sets an explicit canonical_url when siteUrl is valid", () => {
    const p = buildCollectionItemPageData(schema, item, "https://x.com/");
    assert.equal(p.seo.canonical_url, "https://x.com/portfolio/project-alpha.html");
  });

  it("leaves canonical_url empty when siteUrl is unset/invalid", () => {
    assert.equal(buildCollectionItemPageData(schema, item, "").seo.canonical_url, "");
    assert.equal(buildCollectionItemPageData(schema, item, "not a url").seo.canonical_url, "");
  });

  it("seo_noindex true → robots noindex,follow", () => {
    const p = buildCollectionItemPageData(schema, { ...item, settings: { ...item.settings, seo_noindex: true } }, "");
    assert.equal(p.seo.robots, "noindex,follow");
  });

  it("falls back to slug for name and og_title when no title value", () => {
    const p = buildCollectionItemPageData(schema, { ...item, settings: {} }, "");
    assert.equal(p.name, "project-alpha");
    assert.equal(p.seo.og_title, "project-alpha");
    assert.equal(p.seo.title, "");
  });

  it("og_image is empty when the schema flags no usedAsOgImage field", () => {
    const noOg = { ...schema, settings: schema.settings.filter((s) => s.id !== "featured_image") };
    assert.equal(buildCollectionItemPageData(noOg, item, "").seo.og_image, "");
  });
});
