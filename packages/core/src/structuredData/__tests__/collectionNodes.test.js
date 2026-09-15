import { describe, it, expect } from "vitest";
import { buildGraph, validateCollectionStructuredData, COLLECTION_STRUCTURED_DATA_TYPES } from "../index.js";

const SITE = "https://crumbly.example";

const SETTINGS = [
  { type: "header", id: "content_header" },
  { type: "text", id: "title", usedAsTitle: true },
  { type: "date", id: "date" },
  { type: "textarea", id: "excerpt" },
  { type: "image", id: "featured_image" },
  { type: "richtext", id: "body" },
  { type: "link", id: "cta" },
];

const BLOCK = {
  type: "BlogPosting",
  headline: "title",
  datePublished: "date",
  description: "excerpt",
  image: "featured_image",
  articleBody: "body",
};

describe("validateCollectionStructuredData", () => {
  it("supports BlogPosting only, for now", () => {
    expect(COLLECTION_STRUCTURED_DATA_TYPES).toEqual(["BlogPosting"]);
  });

  it("accepts a block whose every mapping names a setting of an accepted type", () => {
    expect(validateCollectionStructuredData(BLOCK, SETTINGS)).toEqual([]);
    expect(validateCollectionStructuredData({ type: "BlogPosting", headline: "title" }, SETTINGS)).toEqual([]);
  });

  it("rejects a block that is not an object or has an unsupported type", () => {
    expect(validateCollectionStructuredData("BlogPosting", SETTINGS)).toEqual(["`structuredData` must be an object."]);
    expect(validateCollectionStructuredData([], SETTINGS)).toEqual(["`structuredData` must be an object."]);
    for (const type of ["Event", undefined, "constructor", "toString", ["BlogPosting"], { toString: null }, 7]) {
      expect(validateCollectionStructuredData({ type, headline: "title" }, SETTINGS)[0]).toMatch(/must be one of: BlogPosting/);
    }
    expect(validateCollectionStructuredData({ type: ["BlogPosting"], headline: "title" }, SETTINGS)[0]).toMatch(/found a list/);
    expect(validateCollectionStructuredData({ type: { toString: null }, headline: "title" }, SETTINGS)[0]).toMatch(
      /found a value of type object/,
    );
  });

  it("names a mapping that points at a missing, header or wrongly typed setting", () => {
    const errors = validateCollectionStructuredData(
      {
        type: "BlogPosting",
        headline: "title",
        datePublished: "published",
        description: "content_header",
        image: "body",
        articleBody: "cta",
      },
      SETTINGS,
    );
    expect(errors).toEqual([
      '`structuredData.datePublished` points at "published", which is not a setting.',
      '`structuredData.description` points at "content_header", which is not a setting.',
      '`structuredData.image` points at "body", a richtext setting; it must be image.',
      '`structuredData.articleBody` points at "cta", a link setting; it must be richtext or textarea.',
    ]);
  });

  it("rejects an unknown property, a non-string mapping and a missing headline", () => {
    expect(
      validateCollectionStructuredData({ type: "BlogPosting", author: "title", datePublished: 5 }, SETTINGS),
    ).toEqual([
      "`structuredData.author` is not a BlogPosting property core supports.",
      "`structuredData.datePublished` must name a setting id.",
      "`structuredData.headline` is required for BlogPosting.",
    ]);
  });
});

describe("articleNode", () => {
  const settingTypes = Object.fromEntries(SETTINGS.map((setting) => [setting.id, setting.type]));
  const itemPage = (overrides = {}) => ({
    slug: "news/alpha",
    name: "Alpha",
    updated: "2026-02-03T10:00:00.000Z",
    collectionItem: {
      type: "news",
      structuredData: BLOCK,
      settingTypes,
      settings: {
        title: "  Fresh   bread ",
        date: "2026-01-02",
        excerpt: "Warm & crusty",
        featured_image: "/uploads/images/loaf.jpg",
        body: "<h2>Why</h2><p>Flour &amp; water &lt;3 &#233;t&eacute;</p>",
      },
      ...overrides,
    },
  });
  const project = (overrides = {}) => ({ siteUrl: SITE, siteTitle: "Crumbly", ...overrides });
  const article = (page, projectData = project(), mediaFiles = {}) =>
    buildGraph({ page, project: projectData, mediaFiles }).find((node) => node["@type"] === "BlogPosting");

  it("builds the article from the mapped visible fields, after the WebPage", () => {
    const nodes = buildGraph({ page: itemPage(), project: project(), mediaFiles: {} });
    expect(nodes.map((node) => node["@type"])).toEqual(["WebPage", "BlogPosting"]);
    expect(nodes[1]).toEqual({
      "@type": "BlogPosting",
      "@id": `${SITE}/news/alpha.html#article`,
      url: `${SITE}/news/alpha.html`,
      headline: "Fresh bread",
      datePublished: "2026-01-02",
      dateModified: "2026-02-03T10:00:00.000Z",
      description: "Warm & crusty",
      image: `${SITE}/assets/images/loaf.jpg`,
      articleBody: `Why\nFlour & water <3 ${String.fromCodePoint(233)}t&eacute;`,
      isPartOf: { "@id": `${SITE}/news/alpha.html#webpage` },
      publisher: { "@id": `${SITE}/#identity` },
    });
  });

  it("reads richtext as visible text and leaves plain text fields untouched", () => {
    const node = article(
      itemPage({
        settings: {
          title: "T",
          body: '<p>un<strong>break</strong>able <a href="https://example.com/?q=a>b">Read more</a></p><p>We are <strong>open</strong>.</p>',
        },
      }),
    );
    expect(node.articleBody).toBe("unbreakable Read more\nWe are open.");

    const textBody = article(
      itemPage({
        structuredData: { ...BLOCK, articleBody: "excerpt" },
        settings: { title: "T", excerpt: "a <b>bold</b> claim &amp; more" },
      }),
    );
    expect(textBody.articleBody).toBe("a <b>bold</b> claim &amp; more");
  });

  it("uses the large variant for the image and follows Clean URLs for the ids", () => {
    const node = article(itemPage(), project({ cleanUrls: true, siteUrl: `${SITE}/shop` }), {
      "loaf.jpg": { filename: "loaf.jpg", type: "image/jpeg", sizes: { large: { path: "/uploads/images/loaf-large.jpg" } } },
    });
    expect(node["@id"]).toBe(`${SITE}/shop/news/alpha#article`);
    expect(node.isPartOf).toEqual({ "@id": `${SITE}/shop/news/alpha#webpage` });
    expect(node.image).toBe(`${SITE}/shop/assets/images/loaf-large.jpg`);
  });

  it("leaves out empty or unmapped fields and the publisher without a name", () => {
    const node = article(
      itemPage({ structuredData: { type: "BlogPosting", headline: "title" }, settings: { title: "Only a title", body: "x" } }),
      project({ siteTitle: "" }),
    );
    expect(node).toEqual({
      "@type": "BlogPosting",
      "@id": `${SITE}/news/alpha.html#article`,
      url: `${SITE}/news/alpha.html`,
      headline: "Only a title",
      datePublished: undefined,
      dateModified: "2026-02-03T10:00:00.000Z",
      description: undefined,
      image: undefined,
      articleBody: undefined,
      isPartOf: { "@id": `${SITE}/news/alpha.html#webpage` },
      publisher: undefined,
    });
  });

  it("emits no article without a headline, a block, or a supported type", () => {
    expect(article(itemPage({ settings: { title: "  " } }))).toBeUndefined();
    expect(article(itemPage({ structuredData: undefined }))).toBeUndefined();
    expect(article(itemPage({ structuredData: { ...BLOCK, type: "Event" } }))).toBeUndefined();
    expect(article({ slug: "about", name: "About" })).toBeUndefined();
  });
});
