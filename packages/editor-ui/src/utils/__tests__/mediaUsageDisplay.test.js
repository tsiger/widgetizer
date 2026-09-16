import { describe, expect, it } from "vitest";
import { resolveUsageTitle, buildUsageTitleMap, GLOBAL_USAGE_TITLES } from "../mediaUsageDisplay";

describe("resolveUsageTitle", () => {
  it("returns title/name/id from an object entry", () => {
    expect(resolveUsageTitle({ title: "Alpha" }, {})).toBe("Alpha");
    expect(resolveUsageTitle({ name: "Beta" }, {})).toBe("Beta");
    expect(resolveUsageTitle({ id: "gamma" }, {})).toBe("gamma");
  });

  it("looks up a friendly title from the usageTitleMap", () => {
    const map = { "page:page-1": "Home", "collection:item-1": "Portfolio: Alpha" };
    expect(resolveUsageTitle("page:page-1", map)).toBe("Home");
    expect(resolveUsageTitle("collection:item-1", map)).toBe("Portfolio: Alpha");
  });

  it("formats global: entries when not in the map", () => {
    expect(resolveUsageTitle("global:root:header", {})).toBe("Header (Global)");
    // A row written before ids were namespaced still reads correctly.
    expect(resolveUsageTitle("global:header", {})).toBe("Header (Global)");
  });

  it("falls back to the raw collection source string when unresolved", () => {
    expect(resolveUsageTitle("collection:item-1", {})).toBe("collection:item-1");
  });

  it("returns null for empty input", () => {
    expect(resolveUsageTitle(null, {})).toBeNull();
    expect(resolveUsageTitle(undefined, {})).toBeNull();
  });

  it("returns the raw string for unknown plain entries", () => {
    expect(resolveUsageTitle("mystery", {})).toBe("mystery");
  });

  it("defaults usageTitleMap so it can be called with one argument", () => {
    expect(resolveUsageTitle("global:root:footer")).toBe("Footer (Global)");
  });
});

describe("buildUsageTitleMap", () => {
  it("seeds collection items as `collection:{uuid}` -> `{displayName}: {title}`", () => {
    const map = buildUsageTitleMap({
      collections: [
        {
          schema: { type: "news", displayName: "Article" },
          items: [{ uuid: "u-hello", slug: "hello-world", title: "Hello World" }],
        },
      ],
    });
    expect(map["collection:u-hello"]).toBe("Article: Hello World");
    // The slug stays a fallback key for rows a rebuild has not reached yet.
    expect(map["collection:hello-world"]).toBe("Article: Hello World");
  });

  it("makes resolveUsageTitle return the friendly collection label end-to-end", () => {
    // The exact path that was broken: a collection usage entry resolved against a
    // map the seeder produced (not a hand-built one).
    const map = buildUsageTitleMap({
      collections: [
        {
          schema: { type: "portfolio", displayName: "Portfolio" },
          items: [{ uuid: "u-alpha", slug: "alpha", title: "Alpha" }],
        },
      ],
    });
    expect(resolveUsageTitle("collection:u-alpha", map)).toBe("Portfolio: Alpha");
  });

  it("falls back to the item slug when the item has no title", () => {
    const map = buildUsageTitleMap({
      collections: [{ schema: { type: "news", displayName: "Article" }, items: [{ uuid: "u-untitled", slug: "untitled" }] }],
    });
    expect(map["collection:u-untitled"]).toBe("Article: untitled");
  });

  it("seeds page uuid, id and slug keys plus the global keys", () => {
    const map = buildUsageTitleMap({ pages: [{ uuid: "u-home", id: "p1", slug: "home", name: "Home" }] });
    expect(map["page:u-home"]).toBe("Home");
    expect(map["page:p1"]).toBe("Home");
    expect(map["page:home"]).toBe("Home");
    expect(map["global:root:header"]).toBe("Header (Global)");
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
    expect(map["page:a"]).toBe("A Name");
    expect(map["page:b"]).toBe("B Title");
    expect(map["page:c"]).toBe("c-slug");
  });

  it("handles multiple collections/items, skips a typeless schema, and tolerates empty items", () => {
    // Exercises both seeding loops with >1 iteration (the realistic shape) plus the
    // two defensive branches: a schema lacking `type` is skipped, and a collection
    // with no `items` (defaulting to []) contributes nothing.
    const map = buildUsageTitleMap({
      collections: [
        {
          schema: { type: "news", displayName: "Article" },
          items: [{ uuid: "u-a", slug: "a", title: "A" }, { uuid: "u-b", slug: "b", title: "B" }],
        },
        {
          schema: { type: "portfolio", displayName: "Portfolio" },
          items: [{ uuid: "u-x", slug: "x", title: "X" }, { uuid: "u-y", slug: "y", title: "Y" }],
        },
        { schema: {}, items: [{ slug: "bad", title: "Bad" }] }, // no type -> skipped
        { schema: { type: "empty", displayName: "Empty" } }, // no items key -> default [] -> no keys
      ],
    });
    expect(map["collection:u-a"]).toBe("Article: A");
    expect(map["collection:u-b"]).toBe("Article: B");
    expect(map["collection:u-x"]).toBe("Portfolio: X");
    expect(map["collection:u-y"]).toBe("Portfolio: Y");
    expect(map["collection:bad"]).toBeUndefined();
  });

  it("returns just the global keys for empty/absent input", () => {
    expect(buildUsageTitleMap()).toEqual(GLOBAL_USAGE_TITLES);
    expect(buildUsageTitleMap({})).toEqual(GLOBAL_USAGE_TITLES);
  });

  it("does not mutate GLOBAL_USAGE_TITLES across calls", () => {
    buildUsageTitleMap({ pages: [{ id: "p1", slug: "home", name: "Home" }] });
    expect(GLOBAL_USAGE_TITLES).toEqual({
      "global:root:header": "Header (Global)",
      "global:root:footer": "Footer (Global)",
      "global:theme-settings": "Theme Settings (Global)",
      "global:site-identity": "Business Details (Global)",
    });
  });
});
