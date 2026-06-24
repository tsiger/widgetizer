import { describe, expect, it } from "vitest";
import { resolveUsageTitle } from "../mediaUsageDisplay";

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
