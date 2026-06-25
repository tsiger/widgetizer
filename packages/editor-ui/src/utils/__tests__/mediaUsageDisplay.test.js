import { describe, expect, it } from "vitest";
import { resolveUsageTitle, buildUsageTitleMap, GLOBAL_USAGE_TITLES } from "../mediaUsageDisplay";

describe("resolveUsageTitle", () => {
  it("returns title/name/id from an object entry", () => {
    expect(resolveUsageTitle({ title: "Alpha" }, {})).toBe("Alpha");
    expect(resolveUsageTitle({ name: "Beta" }, {})).toBe("Beta");
    expect(resolveUsageTitle({ id: "gamma" }, {})).toBe("gamma");
  });

  it("looks up a friendly title from the usageTitleMap", () => {
    const map = { "page-1": "Home", "collection:portfolio/alpha": "Portfolio: Alpha" };
    expect(resolveUsageTitle("page-1", map)).toBe("Home");
    expect(resolveUsageTitle("collection:portfolio/alpha", map)).toBe("Portfolio: Alpha");
  });

  it("formats global: entries when not in the map", () => {
    expect(resolveUsageTitle("global:header", {})).toBe("Header (Global)");
  });

  it("falls back to the raw collection source string when unresolved", () => {
    expect(resolveUsageTitle("collection:portfolio/alpha", {})).toBe("collection:portfolio/alpha");
  });

  it("returns null for empty input", () => {
    expect(resolveUsageTitle(null, {})).toBeNull();
    expect(resolveUsageTitle(undefined, {})).toBeNull();
  });

  it("returns the raw string for unknown plain entries", () => {
    expect(resolveUsageTitle("mystery", {})).toBe("mystery");
  });

  it("defaults usageTitleMap so it can be called with one argument", () => {
    expect(resolveUsageTitle("global:footer")).toBe("Footer (Global)");
  });
});

describe("buildUsageTitleMap", () => {
  it("seeds collection items as `collection:{type}/{slug}` -> `{displayName}: {title}`", () => {
    const map = buildUsageTitleMap({
      collections: [
        { schema: { type: "news", displayName: "Article" }, items: [{ slug: "hello-world", title: "Hello World" }] },
      ],
    });
    expect(map["collection:news/hello-world"]).toBe("Article: Hello World");
  });

  it("makes resolveUsageTitle return the friendly collection label end-to-end", () => {
    // The exact path that was broken: a collection usage entry resolved against a
    // map the seeder produced (not a hand-built one).
    const map = buildUsageTitleMap({
      collections: [
        { schema: { type: "portfolio", displayName: "Portfolio" }, items: [{ slug: "alpha", title: "Alpha" }] },
      ],
    });
    expect(resolveUsageTitle("collection:portfolio/alpha", map)).toBe("Portfolio: Alpha");
  });

  it("falls back to the item slug when the item has no title", () => {
    const map = buildUsageTitleMap({
      collections: [{ schema: { type: "news", displayName: "Article" }, items: [{ slug: "untitled" }] }],
    });
    expect(map["collection:news/untitled"]).toBe("Article: untitled");
  });

  it("seeds page id + slug keys and the global keys", () => {
    const map = buildUsageTitleMap({ pages: [{ id: "p1", slug: "home", name: "Home" }] });
    expect(map.p1).toBe("Home");
    expect(map.home).toBe("Home");
    expect(map["global:header"]).toBe("Header (Global)");
    expect(map["global:theme-settings"]).toBe("Theme Settings (Global)");
  });

  it("prefers page.name, then title, then slug", () => {
    const map = buildUsageTitleMap({
      pages: [
        { id: "a", slug: "a-slug", name: "A Name", title: "A Title" },
        { id: "b", slug: "b-slug", title: "B Title" },
        { id: "c", slug: "c-slug" },
      ],
    });
    expect(map.a).toBe("A Name");
    expect(map.b).toBe("B Title");
    expect(map.c).toBe("c-slug");
  });

  it("handles multiple collections/items, skips a typeless schema, and tolerates empty items", () => {
    // Exercises both seeding loops with >1 iteration (the realistic shape) plus the
    // two defensive branches: a schema lacking `type` is skipped, and a collection
    // with no `items` (defaulting to []) contributes nothing.
    const map = buildUsageTitleMap({
      collections: [
        { schema: { type: "news", displayName: "Article" }, items: [{ slug: "a", title: "A" }, { slug: "b", title: "B" }] },
        { schema: { type: "portfolio", displayName: "Portfolio" }, items: [{ slug: "x", title: "X" }, { slug: "y", title: "Y" }] },
        { schema: {}, items: [{ slug: "bad", title: "Bad" }] }, // no type -> skipped
        { schema: { type: "empty", displayName: "Empty" } }, // no items key -> default [] -> no keys
      ],
    });
    expect(map["collection:news/a"]).toBe("Article: A");
    expect(map["collection:news/b"]).toBe("Article: B");
    expect(map["collection:portfolio/x"]).toBe("Portfolio: X");
    expect(map["collection:portfolio/y"]).toBe("Portfolio: Y");
    expect(map["collection:undefined/bad"]).toBeUndefined();
    expect(Object.keys(map).some((k) => k.startsWith("collection:empty/"))).toBe(false);
  });

  it("returns just the global keys for empty/absent input", () => {
    expect(buildUsageTitleMap()).toEqual(GLOBAL_USAGE_TITLES);
    expect(buildUsageTitleMap({})).toEqual(GLOBAL_USAGE_TITLES);
  });

  it("does not mutate GLOBAL_USAGE_TITLES across calls", () => {
    buildUsageTitleMap({ pages: [{ id: "p1", slug: "home", name: "Home" }] });
    expect(GLOBAL_USAGE_TITLES).toEqual({
      "global:header": "Header (Global)",
      "global:footer": "Footer (Global)",
      "global:theme-settings": "Theme Settings (Global)",
    });
  });
});
