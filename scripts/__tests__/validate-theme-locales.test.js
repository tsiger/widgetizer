import { describe, it, expect } from "vitest";
import {
  flattenKeys,
  extractThemeKeys,
} from "../validate-theme-locales-helpers.js";

// ── flattenKeys ──────────────────────────────────────────────────────

describe("flattenKeys", () => {
  it("returns an empty array for an empty object", () => {
    expect(flattenKeys({})).toEqual([]);
  });

  it("returns top-level keys for a single-level object", () => {
    expect(flattenKeys({ a: 1, b: "hello", c: true })).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns dot-path keys for a nested object", () => {
    const obj = { a: { b: { c: "deep" } } };
    expect(flattenKeys(obj)).toEqual(["a.b.c"]);
  });

  it("handles mixed levels (some values are strings, some are objects)", () => {
    const obj = {
      title: "Hello",
      section: {
        heading: "World",
        sub: { detail: "!" },
      },
    };
    expect(flattenKeys(obj)).toEqual([
      "title",
      "section.heading",
      "section.sub.detail",
    ]);
  });

  it("does not flatten arrays (treats them as leaf values)", () => {
    const obj = {
      tags: ["a", "b"],
      meta: { list: [1, 2, 3] },
    };
    expect(flattenKeys(obj)).toEqual(["tags", "meta.list"]);
  });

  it("respects a custom prefix", () => {
    expect(flattenKeys({ x: 1 }, "root")).toEqual(["root.x"]);
  });
});

// ── extractThemeKeys ─────────────────────────────────────────────────

describe("extractThemeKeys", () => {
  it("returns an empty array for an empty object", () => {
    expect(extractThemeKeys({})).toEqual([]);
  });

  it("finds a tTheme: prefixed string at the top level", () => {
    expect(extractThemeKeys("tTheme:colors.primary")).toEqual([
      "colors.primary",
    ]);
  });

  it("finds tTheme: keys nested in objects", () => {
    const obj = {
      label: "tTheme:nav.home",
      settings: {
        title: "tTheme:header.title",
        width: 100,
      },
    };
    expect(extractThemeKeys(obj)).toEqual(["nav.home", "header.title"]);
  });

  it("finds tTheme: keys inside arrays", () => {
    const obj = {
      items: ["tTheme:btn.save", "tTheme:btn.cancel"],
    };
    expect(extractThemeKeys(obj)).toEqual(["btn.save", "btn.cancel"]);
  });

  it("ignores non-tTheme: strings", () => {
    const obj = {
      label: "Just a normal string",
      hint: "theme:not-this",
      code: "tThemeNope",
    };
    expect(extractThemeKeys(obj)).toEqual([]);
  });

  it("handles mixed content (strings, numbers, booleans, null, arrays, nested objects)", () => {
    const obj = {
      a: "tTheme:one",
      b: 42,
      c: true,
      d: null,
      e: [false, "tTheme:two", 0],
      f: {
        g: "plain",
        h: {
          i: "tTheme:three",
        },
      },
    };
    expect(extractThemeKeys(obj)).toEqual(["one", "two", "three"]);
  });

  it("returns keys with the tTheme: prefix stripped", () => {
    const result = extractThemeKeys("tTheme:some.deep.key");
    expect(result).toEqual(["some.deep.key"]);
    expect(result[0]).not.toContain("tTheme:");
  });

  it("returns an empty array for primitives that are not tTheme: strings", () => {
    expect(extractThemeKeys(42)).toEqual([]);
    expect(extractThemeKeys(null)).toEqual([]);
    expect(extractThemeKeys(true)).toEqual([]);
    expect(extractThemeKeys(undefined)).toEqual([]);
  });
});
