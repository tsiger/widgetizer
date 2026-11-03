import { describe, it, expect } from "vitest";
import { uniqueWidgetOrder, uniqueBlockOrder, uniqueBlockOrders } from "../widgetOrder.js";

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
