import { describe, it, expect } from "vitest";
import { searchIconGroups, scoreIcon } from "../iconSearch";

const icon = (name, keywords) => (keywords ? { name, body: "", keywords } : { name, body: "" });

const GROUPS = [
  {
    name: "System",
    icons: [icon("trash"), icon("settings"), icon("arrow-narrow-left"), icon("arrow-narrow-right"), icon("search")],
  },
  { name: "Photography", icons: [icon("camera"), icon("photo"), icon("aperture")] },
  { name: "Weather", icons: [icon("cloud"), icon("sun"), icon("snowflake")] },
];

const names = (groups) => groups.flatMap((g) => g.icons.map((i) => i.name));

describe("searchIconGroups", () => {
  it("returns the input untouched for an empty query", () => {
    expect(searchIconGroups(GROUPS, "")).toBe(GROUPS);
    expect(searchIconGroups(GROUPS, "   ")).toBe(GROUPS);
  });

  it("finds icons by synonym the name does not contain", () => {
    expect(names(searchIconGroups(GROUPS, "delete"))).toContain("trash");
    expect(names(searchIconGroups(GROUPS, "photo"))).toContain("camera");
    expect(names(searchIconGroups(GROUPS, "gear"))).toContain("settings");
  });

  it("matches a hyphen-separated token", () => {
    // "left" is not a prefix or a standalone substring boundary — it is a token.
    expect(names(searchIconGroups(GROUPS, "left"))).toEqual(["arrow-narrow-left"]);
  });

  it("matches theme-supplied keywords from icons.json", () => {
    const groups = [{ name: "System", icons: [icon("trash", ["bin", "rubbish"])] }];
    expect(names(searchIconGroups(groups, "bin"))).toEqual(["trash"]);
    expect(names(searchIconGroups(groups, "rubbish"))).toEqual(["trash"]);
  });

  it("surfaces a whole category by group name", () => {
    const result = searchIconGroups(GROUPS, "weather");
    expect(result).toHaveLength(1);
    // The whole group is returned, but icons the synonym map also points at
    // ("weather" → cloud/sun/temperature) outrank the group-name-only match.
    expect(names(result)).toEqual(["cloud", "sun", "snowflake"]);
  });

  it("ANDs multiple terms so a second word narrows the result", () => {
    expect(names(searchIconGroups(GROUPS, "arrow left"))).toEqual(["arrow-narrow-left"]);
    expect(names(searchIconGroups(GROUPS, "arrow"))).toHaveLength(2);
  });

  it("ranks an exact name above an incidental substring match", () => {
    const groups = [{ name: null, icons: [icon("search-off"), icon("file-search"), icon("search")] }];
    expect(names(searchIconGroups(groups, "search"))).toEqual(["search", "search-off", "file-search"]);
  });

  it("orders groups by their best match", () => {
    // "camera" is an exact name in Photography; System matches only via synonym.
    const groups = [{ name: "System", icons: [icon("device-cctv", ["camera"])] }, ...GROUPS.slice(1)];
    expect(searchIconGroups(groups, "camera")[0].name).toBe("Photography");
  });

  it("drops groups with no match and returns [] when nothing matches", () => {
    expect(searchIconGroups(GROUPS, "zzzznope")).toEqual([]);
  });

  it("keeps matching while a synonym term is being typed", () => {
    const groups = [{ name: "Commerce", icons: [icon("credit-card"), icon("cash")] }];
    // "pay" and "payment" are both synonym keys; "paym" is neither. Without the
    // partial pass the grid emptied between them as the user typed.
    for (const partial of ["pay", "paym", "payme", "payment"]) {
      expect(names(searchIconGroups(groups, partial)).length, `query "${partial}"`).toBeGreaterThan(0);
    }
  });

  it("does not expand partial terms shorter than three characters", () => {
    // "pa" would otherwise union pay/package/paint/palette… into noise.
    const groups = [{ name: "Commerce", icons: [icon("credit-card")] }];
    expect(searchIconGroups(groups, "pa")).toEqual([]);
    expect(names(searchIconGroups(groups, "pay"))).toContain("credit-card");
  });

  it("is case-insensitive", () => {
    expect(names(searchIconGroups(GROUPS, "TRASH"))).toContain("trash");
    expect(names(searchIconGroups(GROUPS, "Delete"))).toContain("trash");
  });

  it("does not mutate the groups it was given", () => {
    const before = JSON.stringify(GROUPS);
    searchIconGroups(GROUPS, "arrow");
    expect(JSON.stringify(GROUPS)).toBe(before);
  });
});

describe("scoreIcon", () => {
  it("scores an exact name above a prefix, and a prefix above a substring", () => {
    const exact = scoreIcon(icon("star"), ["star"]);
    const prefix = scoreIcon(icon("star-filled"), ["star"]);
    const substring = scoreIcon(icon("my-starship"), ["star"]);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
  });

  it("returns 0 when any term fails to match", () => {
    expect(scoreIcon(icon("arrow-left"), ["arrow", "right"])).toBe(0);
  });

  it("returns 0 for a nameless icon", () => {
    expect(scoreIcon({ body: "" }, ["anything"])).toBe(0);
  });
});
