import { describe, it, expect } from "vitest";
import {
  insertIdAtPosition,
  insertIdAfter,
  removeIdFromOrder,
  getNextSelectedId,
  buildDefaultSettings,
  buildDefaultWidget,
  cloneBlock,
  cloneWidgetWithNewBlockIds,
} from "../widgetStoreHelpers";

// ---------------------------------------------------------------------------
// Ordered-array helpers
// ---------------------------------------------------------------------------

describe("insertIdAtPosition", () => {
  it("inserts at the beginning", () => {
    expect(insertIdAtPosition(["a", "b"], "x", 0)).toEqual(["x", "a", "b"]);
  });

  it("inserts in the middle", () => {
    expect(insertIdAtPosition(["a", "b", "c"], "x", 1)).toEqual(["a", "x", "b", "c"]);
  });

  it("appends when position exceeds length", () => {
    expect(insertIdAtPosition(["a", "b"], "x", 99)).toEqual(["a", "b", "x"]);
  });

  it("appends to empty array", () => {
    expect(insertIdAtPosition([], "x", 0)).toEqual(["x"]);
  });

  it("does not mutate the original array", () => {
    const original = ["a", "b"];
    insertIdAtPosition(original, "x", 0);
    expect(original).toEqual(["a", "b"]);
  });
});

describe("insertIdAfter", () => {
  it("inserts after the source", () => {
    expect(insertIdAfter(["a", "b", "c"], "a", "x")).toEqual(["a", "x", "b", "c"]);
  });

  it("inserts after the last item", () => {
    expect(insertIdAfter(["a", "b"], "b", "x")).toEqual(["a", "b", "x"]);
  });

  it("appends if source not found", () => {
    expect(insertIdAfter(["a", "b"], "missing", "x")).toEqual(["a", "b", "x"]);
  });
});

describe("removeIdFromOrder", () => {
  it("removes the target", () => {
    expect(removeIdFromOrder(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("returns same array if target not found", () => {
    expect(removeIdFromOrder(["a", "b"], "x")).toEqual(["a", "b"]);
  });
});

describe("getNextSelectedId", () => {
  it("returns previous when removing from the middle", () => {
    expect(getNextSelectedId(["a", "b", "c"], "b")).toBe("a");
  });

  it("returns next when removing the first", () => {
    expect(getNextSelectedId(["a", "b", "c"], "a")).toBe("b");
  });

  it("returns previous when removing the last", () => {
    expect(getNextSelectedId(["a", "b", "c"], "c")).toBe("b");
  });

  it("returns null when removing the only item", () => {
    expect(getNextSelectedId(["a"], "a")).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(getNextSelectedId([], "a")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Schema-default builders
// ---------------------------------------------------------------------------

describe("buildDefaultSettings", () => {
  it("builds from a settings schema array", () => {
    const schema = [
      { id: "title", default: "Hello" },
      { id: "color", default: "#000" },
    ];
    expect(buildDefaultSettings(schema)).toEqual({ title: "Hello", color: "#000" });
  });

  it("skips settings with no default", () => {
    const schema = [
      { id: "title", default: "Hello" },
      { id: "optional" },
    ];
    expect(buildDefaultSettings(schema)).toEqual({ title: "Hello" });
  });

  it("returns empty object for null/undefined", () => {
    expect(buildDefaultSettings(null)).toEqual({});
    expect(buildDefaultSettings(undefined)).toEqual({});
  });
});

describe("buildDefaultWidget", () => {
  const schema = {
    type: "test",
    settings: [{ id: "title", default: "Default" }],
    blocks: [{ type: "item", settings: [{ id: "label", default: "Label" }] }],
    defaultBlocks: [{ type: "item", settings: { label: "Override" } }],
  };

  it("builds widget with settings and default blocks", () => {
    let counter = 0;
    const widget = buildDefaultWidget(schema, "test", () => `block_${counter++}`);

    expect(widget.type).toBe("test");
    expect(widget.settings.title).toBe("Default");
    expect(widget.blocksOrder).toEqual(["block_0"]);
    expect(widget.blocks["block_0"].type).toBe("item");
    expect(widget.blocks["block_0"].settings.label).toBe("Override");
  });

  it("handles schema with no defaultBlocks", () => {
    const simpleSchema = { type: "simple", settings: [{ id: "x", default: 1 }] };
    const widget = buildDefaultWidget(simpleSchema, "simple", () => "unused");
    expect(widget.blocks).toEqual({});
    expect(widget.blocksOrder).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Clone helpers
// ---------------------------------------------------------------------------

describe("cloneBlock", () => {
  it("returns a deep copy", () => {
    const original = { type: "item", settings: { nested: { deep: true } } };
    const copy = cloneBlock(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    copy.settings.nested.deep = false;
    expect(original.settings.nested.deep).toBe(true);
  });
});

describe("cloneWidgetWithNewBlockIds", () => {
  it("deep-clones and regenerates block IDs", () => {
    const widget = {
      type: "test",
      settings: { title: "Hello" },
      blocks: {
        "b-1": { type: "item", settings: { label: "A" } },
        "b-2": { type: "item", settings: { label: "B" } },
      },
      blocksOrder: ["b-1", "b-2"],
    };

    let counter = 0;
    const cloned = cloneWidgetWithNewBlockIds(widget, () => `new_${counter++}`);

    expect(cloned.type).toBe("test");
    expect(cloned.settings.title).toBe("Hello");
    expect(cloned.blocksOrder).toEqual(["new_0", "new_1"]);
    expect(cloned.blocks["new_0"].settings.label).toBe("A");
    expect(cloned.blocks["new_1"].settings.label).toBe("B");
    // Original block IDs should not exist
    expect(cloned.blocks["b-1"]).toBeUndefined();
  });

  it("handles widget with no blocks", () => {
    const widget = { type: "test", settings: {}, blocks: {}, blocksOrder: [] };
    const cloned = cloneWidgetWithNewBlockIds(widget, () => "unused");
    expect(cloned.blocks).toEqual({});
    expect(cloned.blocksOrder).toEqual([]);
  });
});
