import { describe, it, expect } from "vitest";
import { resolveThemeKey } from "../useThemeLocale.js";

describe("resolveThemeKey", () => {
  // --- Pass-through for falsy / non-prefixed values ---

  it("returns null as-is", () => {
    expect(resolveThemeKey(null, {})).toBe(null);
  });

  it("returns undefined as-is", () => {
    expect(resolveThemeKey(undefined, {})).toBe(undefined);
  });

  it("returns empty string as-is", () => {
    expect(resolveThemeKey("", {})).toBe("");
  });

  it("returns non-prefixed strings as-is", () => {
    expect(resolveThemeKey("Hello World", {})).toBe("Hello World");
  });

  it("returns strings that merely contain tTheme: mid-string as-is", () => {
    expect(resolveThemeKey("some tTheme:key text", {})).toBe(
      "some tTheme:key text",
    );
  });

  // --- Single-level key resolution ---

  it("resolves a single-level key", () => {
    const locale = { greeting: "Hello" };
    expect(resolveThemeKey("tTheme:greeting", locale)).toBe("Hello");
  });

  // --- Multi-level dot-path resolution ---

  it("resolves a multi-level dot-path", () => {
    const locale = {
      carousel: { settings: { title: { label: "Title" } } },
    };
    expect(resolveThemeKey("tTheme:carousel.settings.title.label", locale)).toBe(
      "Title",
    );
  });

  // --- Fallback to raw key when locale is null/undefined ---

  it("falls back to the raw key when locale is null", () => {
    expect(resolveThemeKey("tTheme:greeting", null)).toBe("greeting");
  });

  it("falls back to the raw key when locale is undefined", () => {
    expect(resolveThemeKey("tTheme:greeting", undefined)).toBe("greeting");
  });

  // --- Fallback when path doesn't exist ---

  it("falls back to the raw key when the path does not exist in locale", () => {
    const locale = { other: "value" };
    expect(resolveThemeKey("tTheme:missing.key", locale)).toBe("missing.key");
  });

  // --- Fallback when resolved value is not a string ---

  it("falls back to the raw key when resolved value is an object", () => {
    const locale = { section: { nested: { deep: "val" } } };
    expect(resolveThemeKey("tTheme:section", locale)).toBe("section");
  });

  it("falls back to the raw key when resolved value is a number", () => {
    const locale = { count: 42 };
    expect(resolveThemeKey("tTheme:count", locale)).toBe("count");
  });

  // --- Partial path matches ---

  it("falls back to the raw key when path exists partway but leaf is missing", () => {
    const locale = { a: { b: { c: "found" } } };
    expect(resolveThemeKey("tTheme:a.b.missing", locale)).toBe("a.b.missing");
  });

  it("falls back when an intermediate segment is a string instead of object", () => {
    const locale = { a: "leaf" };
    expect(resolveThemeKey("tTheme:a.b.c", locale)).toBe("a.b.c");
  });

  // --- Deeply nested paths (4+ levels) ---

  it("resolves deeply nested paths (5 levels)", () => {
    const locale = { a: { b: { c: { d: { e: "deep" } } } } };
    expect(resolveThemeKey("tTheme:a.b.c.d.e", locale)).toBe("deep");
  });

  it("resolves deeply nested paths (6 levels)", () => {
    const locale = { l1: { l2: { l3: { l4: { l5: { l6: "bottom" } } } } } };
    expect(resolveThemeKey("tTheme:l1.l2.l3.l4.l5.l6", locale)).toBe("bottom");
  });
});
