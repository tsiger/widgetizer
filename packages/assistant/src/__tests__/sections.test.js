import { describe, it, expect } from "vitest";
import { applySectionOperations, documentVersion, measuredIds } from "../edits/sections.js";

const schemas = new Map(
  [
    {
      type: "text-block",
      settings: [
        { type: "header", id: "heading", label: "Heading" },
        { type: "text", id: "title", default: "Hello" },
        { type: "range", id: "size", min: 1, max: 5, default: 3 },
        { type: "richtext", id: "body", default: "" },
        { type: "checkbox", id: "listing_anchor" },
      ],
    },
    {
      type: "list",
      maxBlocks: 2,
      settings: [{ type: "text", id: "title" }],
      blocks: [{ type: "item", settings: [{ type: "text", id: "text", default: "Item" }] }],
      defaultBlocks: [{ type: "item" }],
    },
    {
      type: "header",
      settings: [{ type: "text", id: "tagline" }],
      blocks: [{ type: "link", settings: [{ type: "text", id: "label" }] }],
    },
  ].map((schema) => [schema.type, schema]),
);

const page = () => ({
  slug: "about",
  widgets: {
    a: { type: "text-block", settings: { title: "First", legacy: "<kept>" } },
    b: { type: "list", settings: {}, blocks: { x: { type: "item", settings: { text: "X" } } }, blocksOrder: ["x"] },
  },
  widgetsOrder: ["a", "b"],
});

const apply = (operations, doc = page(), kind = "page") =>
  applySectionOperations({ doc, kind, operations, schemas, sanitizeRichText: (html) => html.replace(/<script.*?<\/script>/g, "") });

describe("section operations", () => {
  it("adds a section with its defaults where asked, and leaves the rest untouched", () => {
    const { next, changes } = apply([{ op: "add", type: "text-block", settings: { title: "New" }, after: "a" }]);
    const id = changes.added[0];
    expect(next.widgetsOrder).toEqual(["a", id, "b"]);
    expect(next.widgets[id]).toMatchObject({ type: "text-block", settings: { title: "New", size: 3, body: "" } });
    expect(next.widgets.a).toEqual(page().widgets.a);
  });

  it("changes only the values it sets, and null puts a value back to its default", () => {
    const { next } = apply([{ op: "update", section: "a", settings: { size: 5, title: null } }]);
    expect(next.widgets.a.settings).toEqual({ title: "Hello", size: 5, legacy: "<kept>" });
  });

  it("refuses a value its setting can't take or an unknown setting, and takes the listing settings", () => {
    expect(() => apply([{ op: "update", section: "a", settings: { size: 9 } }])).toThrow(/outside min 1/);
    expect(() => apply([{ op: "update", section: "a", settings: { colour: "red" } }])).toThrow(/no setting "colour"/);
    expect(() => apply([{ op: "update", section: "a", settings: { heading: "x" } }])).toThrow(/no setting "heading"/);
    expect(apply([{ op: "update", section: "a", settings: { listing_anchor: true } }]).next.widgets.a.settings.listing_anchor).toBe(true);
  });

  it("cleans rich text the way the page renders it", () => {
    const { next } = apply([{ op: "update", section: "a", settings: { body: "<p>Hi</p><script>x()</script>" } }]);
    expect(next.widgets.a.settings.body).toBe("<p>Hi</p>");
  });

  it("works on blocks within their limit", () => {
    const { next, changes } = apply([{ op: "addBlock", section: "b", type: "item", settings: { text: "Y" }, at: "start" }]);
    const id = changes.added[0].split("/")[1];
    expect(next.widgets.b.blocksOrder).toEqual([id, "x"]);
    expect(() => apply([{ op: "addBlock", section: "b", type: "item" }, { op: "addBlock", section: "b", type: "item" }])).toThrow(/at most 2 blocks/);
    expect(() => apply([{ op: "addBlock", section: "b", type: "card" }])).toThrow(/no block type "card"/);
    expect(apply([{ op: "removeBlock", section: "b", block: "x" }]).next.widgets.b.blocksOrder).toEqual([]);
  });

  it("adds a section with the blocks given instead of its starting ones", () => {
    const { next, changes } = apply([{ op: "add", type: "list", blocks: [{ type: "item", settings: { text: "Only" } }] }]);
    const section = next.widgets[changes.added[0]];
    expect(section.blocksOrder).toHaveLength(1);
    expect(Object.values(section.blocks)[0].settings.text).toBe("Only");
  });

  it("moves and removes sections", () => {
    expect(apply([{ op: "move", section: "b", at: "start" }]).next.widgetsOrder).toEqual(["b", "a"]);
    const removed = apply([{ op: "remove", section: "a" }]).next;
    expect(removed.widgetsOrder).toEqual(["b"]);
    expect(removed.widgets.a).toBeUndefined();
  });

  it("is all or nothing: a later bad operation leaves the document as it was", () => {
    const doc = page();
    expect(() => apply([{ op: "remove", section: "a" }, { op: "remove", section: "zzz" }], doc)).toThrow(/Operation 2/);
    expect(doc).toEqual(page());
  });

  it("treats a header as one section with blocks", () => {
    const header = { type: "header", settings: {}, blocks: {}, blocksOrder: [] };
    const { next } = apply([{ op: "update", settings: { tagline: "Hi" } }, { op: "addBlock", type: "link", settings: { label: "Home" } }], header, "global");
    expect(next.settings.tagline).toBe("Hi");
    expect(next.blocksOrder).toHaveLength(1);
    expect(() => apply([{ op: "add", type: "text-block" }], header, "global")).toThrow(/one section/);
    expect(() => apply([{ op: "add", type: "header" }])).toThrow(/belongs to the site's header/);
  });

  it("measures pages by sections and headers by blocks, and versions by content", () => {
    expect(measuredIds(page(), "page")).toEqual(["a", "b"]);
    expect(measuredIds({ blocks: { q: {} }, blocksOrder: ["q"] }, "global")).toEqual(["q"]);
    expect(documentVersion({ a: 1, b: 2 })).toBe(documentVersion({ b: 2, a: 1 }));
    expect(documentVersion(page())).not.toBe(documentVersion(apply([{ op: "move", section: "b", at: "start" }]).next));
  });
});
