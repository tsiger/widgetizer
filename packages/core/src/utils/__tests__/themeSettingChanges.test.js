import { describe, it, expect } from "vitest";
import {
  applyThemeSettingChanges,
  diffThemeSettings,
  findThemeSetting,
  themeSettingValuesEqual,
} from "../themeSettingChanges.js";

const theme = (global) => ({ name: "Arch", version: "1.0.0", settings: { global } });

describe("themeSettingValuesEqual", () => {
  it("ignores object key order", () => {
    expect(themeSettingValuesEqual({ href: "/a", text: "A" }, { text: "A", href: "/a" })).toBe(true);
  });

  it("keeps array order", () => {
    expect(themeSettingValuesEqual(["a", "b"], ["b", "a"])).toBe(false);
  });

  it("treats a missing value as its own state, distinct from null", () => {
    expect(themeSettingValuesEqual(undefined, undefined)).toBe(true);
    expect(themeSettingValuesEqual(undefined, null)).toBe(false);
    expect(themeSettingValuesEqual(undefined, "")).toBe(false);
  });

  it("compares values as they would be stored", () => {
    expect(themeSettingValuesEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});

describe("findThemeSetting", () => {
  it("prefers the named group", () => {
    const t = theme({ colors: [{ id: "accent", type: "color" }], extra: [{ id: "accent", type: "color" }] });
    expect(findThemeSetting(t, { group: "extra", id: "accent" }).item).toBe(t.settings.global.extra[0]);
  });

  it("finds a setting that moved to another group", () => {
    const t = theme({ general: [{ id: "show_breadcrumbs", type: "checkbox" }] });
    expect(findThemeSetting(t, { group: "layout", id: "show_breadcrumbs" }).group).toBe("general");
  });

  it("calls the same id in two other groups ambiguous", () => {
    const t = theme({ a: [{ id: "x", type: "text" }], b: [{ id: "x", type: "text" }] });
    expect(findThemeSetting(t, { group: "c", id: "x" })).toEqual({ ambiguous: true });
  });

  it("never addresses a header", () => {
    const t = theme({ a: [{ id: "x", type: "header" }] });
    expect(findThemeSetting(t, { group: "a", id: "x" })).toBeNull();
  });
});

describe("diffThemeSettings", () => {
  const base = theme({
    colors: [
      { id: "heading", type: "header" },
      { id: "accent", type: "color", value: "#f00" },
      { id: "bg", type: "color" },
    ],
  });

  it("lists only changed settings, with the value each started from", () => {
    const draft = JSON.parse(JSON.stringify(base));
    draft.settings.global.colors[1].value = "#00f";
    expect(diffThemeSettings(base, draft)).toEqual([
      { group: "colors", id: "accent", baseValue: "#f00", value: "#00f" },
    ]);
  });

  it("reports a value set on a setting that used its default, and a value removed", () => {
    const draft = JSON.parse(JSON.stringify(base));
    draft.settings.global.colors[2].value = "#fff";
    delete draft.settings.global.colors[1].value;
    const changes = diffThemeSettings(base, draft);
    expect(changes).toHaveLength(2);
    expect(changes.find((c) => c.id === "bg")).toMatchObject({ baseValue: undefined, value: "#fff" });
    expect(changes.find((c) => c.id === "accent")).toMatchObject({ baseValue: "#f00", value: undefined });
  });

  it("finds nothing when only key order differs", () => {
    const a = theme({ g: [{ id: "link", type: "link", value: { href: "/a", text: "A" } }] });
    const b = theme({ g: [{ id: "link", type: "link", value: { text: "A", href: "/a" } }] });
    expect(diffThemeSettings(a, b)).toEqual([]);
  });

  it("skips a draft setting the base does not have", () => {
    const draft = theme({ colors: [{ id: "new_one", type: "color", value: "#000" }] });
    expect(diffThemeSettings(base, draft)).toEqual([]);
  });
});

describe("applyThemeSettingChanges", () => {
  it("sets and removes values on a copy, leaving everything else alone", () => {
    const current = theme({
      colors: [
        { id: "accent", type: "color", value: "#f00" },
        { id: "bg", type: "color", value: "#fff" },
      ],
    });
    current.version = "2.0.0";
    const { theme: next, skipped } = applyThemeSettingChanges(current, [
      { group: "colors", id: "accent", value: "#00f" },
      { group: "colors", id: "bg" },
    ]);
    expect(skipped).toEqual([]);
    expect(next.version).toBe("2.0.0");
    expect(next.settings.global.colors[0].value).toBe("#00f");
    expect("value" in next.settings.global.colors[1]).toBe(false);
    expect(current.settings.global.colors[0].value).toBe("#f00");
  });

  it("skips changes for settings that are gone or ambiguous", () => {
    const current = theme({ a: [{ id: "x", type: "text" }], b: [{ id: "x", type: "text" }] });
    const { skipped } = applyThemeSettingChanges(current, [
      { group: "c", id: "x", value: "1" },
      { group: "a", id: "gone", value: "1" },
    ]);
    expect(skipped).toEqual([
      { id: "x", code: "SETTING_AMBIGUOUS" },
      { id: "gone", code: "SETTING_REMOVED" },
    ]);
  });
});
