import { describe, it, expect } from "vitest";
import {
  uniqueWidgetOrder,
  uniqueBlockOrder,
  uniqueBlockOrders,
  isValidWidgetId,
  isValidBlockId,
  isRenderedWidget,
  renderedWidgetOrder,
  RESERVED_WIDGET_IDS,
  WIDGET_ID_MAX_LENGTH,
} from "../widgetOrder.js";

describe("uniqueWidgetOrder", () => {
  it("keeps each id once, at its first place", () => {
    expect(uniqueWidgetOrder(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("leaves an order without repeats as it is", () => {
    expect(uniqueWidgetOrder(["a", "b"])).toEqual(["a", "b"]);
  });

  it("passes a missing order through, for the caller's own fallback", () => {
    expect(uniqueWidgetOrder(undefined)).toBe(undefined);
    expect(uniqueWidgetOrder(null)).toBe(null);
  });
});

describe("uniqueBlockOrder / uniqueBlockOrders", () => {
  it("keeps each block once, at its first place", () => {
    expect(uniqueBlockOrder({ type: "t", blocksOrder: ["x", "y", "x"] }).blocksOrder).toEqual(["x", "y"]);
  });

  it("leaves a widget without a block order as it is", () => {
    const widget = { type: "t" };
    expect(uniqueBlockOrder(widget)).toBe(widget);
    expect(uniqueBlockOrder(null)).toBe(null);
  });

  it("applies to every widget in a map", () => {
    const widgets = uniqueBlockOrders({ a: { blocksOrder: ["x", "x"] }, b: { blocksOrder: ["y"] } });
    expect(widgets).toEqual({ a: { blocksOrder: ["x"] }, b: { blocksOrder: ["y"] } });
    expect(uniqueBlockOrders(undefined)).toBe(undefined);
    const notAMap = new Map();
    expect(uniqueBlockOrders(notAMap)).toBe(notAMap);
    expect(uniqueBlockOrders([{ blocksOrder: ["x", "x"] }])).toEqual([{ blocksOrder: ["x", "x"] }]);
  });
});

describe("the widget and block id rule", () => {
  it("accepts the editor's own ids and theme-style ids", () => {
    for (const id of ["widget_3f2a9c1e-8d4b-4e6f-9a0b-1c2d3e4f5a6b", "hero_banner", "faq", "Hero2", "7up"]) {
      expect(isValidWidgetId(id)).toBe(true);
    }
    for (const id of ["block_3f2a9c1e-8d4b-4e6f-9a0b-1c2d3e4f5a6b", "hero-heading", "logo_text_1"]) {
      expect(isValidBlockId(id)).toBe(true);
    }
  });

  it("refuses ids that are not plain, short names", () => {
    for (const id of ["", "_hero", "-hero", "a b", 'bad"id', "area:before_footer", "é", "a.b", "__proto__", 7, null, undefined]) {
      expect(isValidWidgetId(id)).toBe(false);
      expect(isValidBlockId(id)).toBe(false);
    }
    expect(WIDGET_ID_MAX_LENGTH).toBe(128);
    expect(isValidWidgetId("a".repeat(128))).toBe(true);
    expect(isValidWidgetId("a".repeat(129))).toBe(false);
    expect(isValidBlockId("a".repeat(129))).toBe(false);
  });

  it("refuses built-in property names, for widgets and blocks", () => {
    for (const id of ["constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"]) {
      expect(isValidWidgetId(id)).toBe(false);
      expect(isValidBlockId(id)).toBe(false);
    }
  });

  it("keeps header and footer for the site's global widgets", () => {
    expect([...RESERVED_WIDGET_IDS]).toEqual(["header", "footer"]);
    expect(isValidWidgetId("header")).toBe(false);
    expect(isValidWidgetId("footer")).toBe(false);
    // A block is inside one widget, so these names are free there.
    expect(isValidBlockId("header")).toBe(true);
  });
});

describe("renderedWidgetOrder / isRenderedWidget", () => {
  it("lists the widgets that render, in order, each once", () => {
    const widgets = { a: { type: "t" }, b: { type: "t" }, header: { type: "t" }, footer: { type: "t" } };
    expect(renderedWidgetOrder(widgets, ["b", "gone", "header", "a", "b", "constructor", "footer", 7, null])).toEqual([
      "b",
      "a",
    ]);
  });

  it("takes an array order as it is, an empty one included", () => {
    expect(renderedWidgetOrder({ a: { type: "t" } }, [])).toEqual([]);
  });

  it("falls back to the map's own order when there is no order list", () => {
    const widgets = { b: { type: "t" }, header: { type: "t" }, a: { type: "t" } };
    expect(renderedWidgetOrder(widgets, undefined)).toEqual(["b", "a"]);
    expect(renderedWidgetOrder(widgets, null)).toEqual(["b", "a"]);
    expect(renderedWidgetOrder(widgets, "ab")).toEqual(["b", "a"]);
  });

  it("renders nothing from something that is not a widgets map", () => {
    expect(renderedWidgetOrder(undefined, ["a"])).toEqual([]);
    expect(renderedWidgetOrder(null, undefined)).toEqual([]);
    expect(renderedWidgetOrder(["x"], ["0"])).toEqual([]);
  });

  it("says whether one id renders", () => {
    const widgets = { a: { type: "t" }, empty: null, header: { type: "t" } };
    expect(isRenderedWidget(widgets, "a")).toBe(true);
    expect(isRenderedWidget(widgets, "empty")).toBe(false);
    expect(isRenderedWidget(widgets, "header")).toBe(false);
    expect(isRenderedWidget(widgets, "constructor")).toBe(false);
    expect(isRenderedWidget(widgets, "gone")).toBe(false);
    expect(isRenderedWidget(undefined, "a")).toBe(false);
  });

  // Parsed from JSON, `__proto__` is an own key, but copying it into another map
  // (Object.assign, map[id] = …) changes that map's prototype instead. Other
  // built-in names held as own keys are ordinary data and render.
  it("renders an own built-in name but never __proto__", () => {
    const widgets = JSON.parse('{"constructor": {"type": "t"}, "__proto__": {"type": "t"}, "a": {"type": "t"}}');
    expect(isRenderedWidget(widgets, "constructor")).toBe(true);
    expect(isRenderedWidget(widgets, "__proto__")).toBe(false);
    expect(renderedWidgetOrder(widgets, ["__proto__", "constructor", "a"])).toEqual(["constructor", "a"]);
    expect(renderedWidgetOrder(widgets, undefined)).toEqual(["constructor", "a"]);
  });
});
