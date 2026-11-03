import { describe, it, expect } from "vitest";
import { pageOpensTransparent } from "../transparentHeader";

// The header turns transparent over the first widget the page shows, as the full
// render decides it, when that widget's schema supports it.
describe("pageOpensTransparent", () => {
  const schemas = { hero: { supportsTransparentHeader: true }, text: {} };
  const page = (widgets, widgetsOrder) => ({ widgets, ...(widgetsOrder ? { widgetsOrder } : {}) });

  it("goes by the first widget shown", () => {
    expect(pageOpensTransparent(page({ a: { type: "hero" }, b: { type: "text" } }, ["a", "b"]), schemas)).toBe(true);
    expect(pageOpensTransparent(page({ a: { type: "hero" }, b: { type: "text" } }, ["b", "a"]), schemas)).toBe(false);
  });

  it("passes over an entry that shows nothing", () => {
    const widgets = { header: { type: "text" }, a: { type: "hero" } };
    expect(pageOpensTransparent(page(widgets, ["gone", "constructor", "header", "a"]), schemas)).toBe(true);
  });

  it("uses the widgets' own order without an order list, and nothing for an empty one", () => {
    expect(pageOpensTransparent(page({ a: { type: "hero" } }), schemas)).toBe(true);
    expect(pageOpensTransparent(page({ a: { type: "hero" } }, []), schemas)).toBe(false);
    expect(pageOpensTransparent(null, schemas)).toBe(false);
  });
});
