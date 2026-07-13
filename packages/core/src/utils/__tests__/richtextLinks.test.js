import { describe, it, expect } from "vitest";
import {
  resolveRichtextLinkRefs,
  resolveRichtextLinksInWidgetData,
  schemaHasRichtextSetting,
  cleanupRichtextLinkRefs,
  remapRichtextLinkRefs,
  enrichRichtextLinkRefs,
  stripRichtextLinkRefs,
} from "../richtextLinks";

const pagesByUuid = new Map([["page-1", { slug: "about-us" }]]);
const collectionItemsByUuid = new Map([["item-1", { slugPrefix: "news", slug: "hello-world" }]]);
const deps = { pagesByUuid, collectionItemsByUuid, outputPathPrefix: "" };
const depsNested = { pagesByUuid, collectionItemsByUuid, outputPathPrefix: "../" };

describe("resolveRichtextLinkRefs", () => {
  it("rewrites a page link href from its uuid (root depth)", () => {
    const html = '<p><a href="stale.html" data-page-uuid="page-1">x</a></p>';
    expect(resolveRichtextLinkRefs(html, deps)).toBe('<p><a href="about-us.html" data-page-uuid="page-1">x</a></p>');
  });

  it("rewrites a collection-item link href from its uuid", () => {
    const html = '<a data-collection-item-uuid="item-1" href="old/old.html">y</a>';
    expect(resolveRichtextLinkRefs(html, deps)).toBe('<a data-collection-item-uuid="item-1" href="news/hello-world.html">y</a>');
  });

  it("depth-prefixes hrefs for nested item pages", () => {
    const page = '<a href="x.html" data-page-uuid="page-1">x</a>';
    expect(resolveRichtextLinkRefs(page, depsNested)).toBe('<a href="../about-us.html" data-page-uuid="page-1">x</a>');
    const item = '<a href="x.html" data-collection-item-uuid="item-1">y</a>';
    expect(resolveRichtextLinkRefs(item, depsNested)).toBe('<a href="../news/hello-world.html" data-collection-item-uuid="item-1">y</a>');
  });

  it("neutralizes a dangling uuid when the map is loaded but the target is gone", () => {
    const page = '<a href="about-us.html" data-page-uuid="deleted">x</a>';
    expect(resolveRichtextLinkRefs(page, deps)).toBe("<a>x</a>");
    const item = '<a href="news/x.html" data-collection-item-uuid="deleted">y</a>';
    expect(resolveRichtextLinkRefs(item, deps)).toBe("<a>y</a>");
  });

  it("clears against a loaded-but-EMPTY map (availability is presence, not size)", () => {
    const html = '<a href="about-us.html" data-page-uuid="page-1">x</a>';
    expect(resolveRichtextLinkRefs(html, { pagesByUuid: new Map(), outputPathPrefix: "" })).toBe("<a>x</a>");
  });

  it("falls back to the stored href when the map is unavailable (undefined)", () => {
    const html = '<a href="about-us.html" data-page-uuid="page-1">x</a>';
    expect(resolveRichtextLinkRefs(html, { outputPathPrefix: "" })).toBe(html);
    const item = '<a href="news/hello-world.html" data-collection-item-uuid="item-1">y</a>';
    expect(resolveRichtextLinkRefs(item, { pagesByUuid, outputPathPrefix: "" })).toBe(item);
  });

  it("leaves external anchors (no data-uuid) untouched", () => {
    const html = '<a href="https://example.com" target="_blank">ext</a>';
    expect(resolveRichtextLinkRefs(html, deps)).toBe(html);
  });

  it("resolves regardless of attribute order and inserts href when missing", () => {
    const html = '<a class="c" data-page-uuid="page-1">x</a>';
    expect(resolveRichtextLinkRefs(html, deps)).toBe('<a href="about-us.html" class="c" data-page-uuid="page-1">x</a>');
  });

  it("passes through non-string / empty / ref-less values", () => {
    expect(resolveRichtextLinkRefs("", deps)).toBe("");
    expect(resolveRichtextLinkRefs(null, deps)).toBe(null);
    expect(resolveRichtextLinkRefs("<p>no links</p>", deps)).toBe("<p>no links</p>");
  });
});

describe("resolveRichtextLinksInWidgetData", () => {
  it("resolves richtext in top-level settings and block settings", () => {
    const schema = {
      settings: [{ id: "body", type: "richtext" }],
      blocks: [{ type: "card", settings: [{ id: "text", type: "richtext" }] }],
    };
    const widgetData = {
      settings: { body: '<a href="x" data-page-uuid="page-1">p</a>' },
      blocks: { b1: { type: "card", settings: { text: '<a href="x" data-collection-item-uuid="item-1">i</a>' } } },
    };
    resolveRichtextLinksInWidgetData(widgetData, schema, deps);
    expect(widgetData.settings.body).toContain('href="about-us.html"');
    expect(widgetData.blocks.b1.settings.text).toContain('href="news/hello-world.html"');
  });
});

describe("cleanupRichtextLinkRefs (delete → unwrap)", () => {
  it("unwraps a page anchor whose target was deleted, keeping the text", () => {
    const html = '<p>see <a href="x.html" data-page-uuid="p1">our page</a> now</p>';
    expect(cleanupRichtextLinkRefs(html, { pageUuids: new Set(["p1"]) })).toBe("<p>see our page now</p>");
  });
  it("unwraps a collection-item anchor", () => {
    const html = '<a href="news/x.html" data-collection-item-uuid="i1">item</a>';
    expect(cleanupRichtextLinkRefs(html, { itemUuids: new Set(["i1"]) })).toBe("item");
  });
  it("leaves anchors for non-deleted targets untouched", () => {
    const html = '<a href="x.html" data-page-uuid="p1">keep</a>';
    expect(cleanupRichtextLinkRefs(html, { pageUuids: new Set(["other"]) })).toBe(html);
  });
});

describe("remapRichtextLinkRefs (duplication / seed)", () => {
  it("rewrites page + item uuid attr values via maps", () => {
    const html = '<a data-page-uuid="old-p">a</a><a data-collection-item-uuid="old-i">b</a>';
    const out = remapRichtextLinkRefs(html, {
      pageMap: new Map([["old-p", "new-p"]]),
      itemMap: new Map([["old-i", "new-i"]]),
    });
    expect(out).toBe('<a data-page-uuid="new-p">a</a><a data-collection-item-uuid="new-i">b</a>');
  });
  it("leaves uuids not in the map unchanged", () => {
    const html = '<a data-page-uuid="keep">a</a>';
    expect(remapRichtextLinkRefs(html, { pageMap: new Map([["x", "y"]]) })).toBe(html);
  });
});

describe("enrichRichtextLinkRefs (href → stamp uuid)", () => {
  const pageSlugToUuid = new Map([["about-us", "p1"]]);
  const itemUuidBySlugPath = new Map([["news/hello-world", "i1"]]);
  it("stamps data-page-uuid from a page href", () => {
    const html = '<a href="about-us.html">x</a>';
    expect(enrichRichtextLinkRefs(html, { pageSlugToUuid })).toBe('<a data-page-uuid="p1" href="about-us.html">x</a>');
  });
  it("stamps data-collection-item-uuid from an item href", () => {
    const html = '<a href="news/hello-world.html">y</a>';
    expect(enrichRichtextLinkRefs(html, { itemUuidBySlugPath })).toBe(
      '<a data-collection-item-uuid="i1" href="news/hello-world.html">y</a>',
    );
  });
  it("re-derives (overwrites a stale attr) from the href", () => {
    const html = '<a href="about-us.html" data-page-uuid="stale">x</a>';
    expect(enrichRichtextLinkRefs(html, { pageSlugToUuid })).toBe('<a data-page-uuid="p1" href="about-us.html">x</a>');
  });
  it("leaves external / unresolved hrefs untouched", () => {
    expect(enrichRichtextLinkRefs('<a href="https://x.com">e</a>', { pageSlugToUuid })).toBe('<a href="https://x.com">e</a>');
    expect(enrichRichtextLinkRefs('<a href="unknown.html">u</a>', { pageSlugToUuid })).toBe('<a href="unknown.html">u</a>');
  });
});

describe("single-quoted raw HTML (source-mode / imported / preset)", () => {
  it("resolves a single-quoted item link", () => {
    const html = "<a href='old.html' data-collection-item-uuid='item-1'>y</a>";
    expect(resolveRichtextLinkRefs(html, deps)).toContain('href="news/hello-world.html"');
  });
  it("cleanup unwraps a single-quoted anchor", () => {
    const html = "<a href='x.html' data-page-uuid='p1'>t</a>";
    expect(cleanupRichtextLinkRefs(html, { pageUuids: new Set(["p1"]) })).toBe("t");
  });
  it("remap rewrites a single-quoted uuid (preserving the quote style)", () => {
    const html = "<a data-page-uuid='old'>a</a>";
    expect(remapRichtextLinkRefs(html, { pageMap: new Map([["old", "new"]]) })).toBe("<a data-page-uuid='new'>a</a>");
  });
  it("enrich stamps from a single-quoted href", () => {
    const html = "<a href='about-us.html'>x</a>";
    expect(enrichRichtextLinkRefs(html, { pageSlugToUuid: new Map([["about-us", "p1"]]) })).toContain('data-page-uuid="p1"');
  });
  it("strip removes single-quoted ref attrs", () => {
    const html = "<a href='x.html' data-page-uuid='p1' data-collection-item-uuid='i1'>x</a>";
    const out = stripRichtextLinkRefs(html);
    expect(out).not.toContain("data-page-uuid");
    expect(out).not.toContain("data-collection-item-uuid");
  });
});

describe("schemaHasRichtextSetting", () => {
  it("detects a top-level richtext setting", () => {
    expect(schemaHasRichtextSetting({ settings: [{ id: "b", type: "richtext" }] })).toBe(true);
  });
  it("detects a block-level richtext setting", () => {
    expect(schemaHasRichtextSetting({ settings: [], blocks: [{ type: "c", settings: [{ id: "t", type: "richtext" }] }] })).toBe(true);
  });
  it("returns false when no richtext setting exists", () => {
    expect(schemaHasRichtextSetting({ settings: [{ id: "t", type: "text" }], blocks: [] })).toBe(false);
  });
});
