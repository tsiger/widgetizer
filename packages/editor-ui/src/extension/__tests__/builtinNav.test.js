import { describe, it, expect } from "vitest";
import { builtinNavPlugin, NAV_GROUPS, groupNavItems } from "../builtinNav.js";
import { buildRegistry } from "../registry.js";

describe("builtinNavPlugin", () => {
  it("registers the 6 built-in editor nav items through the registry", () => {
    const reg = buildRegistry([builtinNavPlugin], { warn: () => {} });
    expect(reg.navItems.map((n) => n.id)).toEqual(["pages", "menus", "media", "settings", "preview", "export"]);
    expect(reg.navItems.every((n) => n.pluginName === "builtin-nav")).toBe(true);
  });

  it("tags the preview item as an action (no path) and the rest with paths", () => {
    const preview = builtinNavPlugin.navItems.find((n) => n.id === "preview");
    expect(preview.action).toBe("openSitePreview");
    expect(preview.path).toBeUndefined();
    expect(builtinNavPlugin.navItems.filter((n) => n.path).map((n) => n.id)).toEqual([
      "pages",
      "menus",
      "media",
      "settings",
      "export",
    ]);
  });
});

describe("groupNavItems", () => {
  it("orders sections by NAV_GROUPS (site before tools) and groups items", () => {
    const sections = groupNavItems(builtinNavPlugin.navItems);
    expect(sections.map((s) => s.id)).toEqual(["site", "tools"]);
    expect(sections[0].titleKey).toBe("navigation.site");
    expect(sections[0].items.map((i) => i.id)).toEqual(["pages", "menus", "media", "settings", "preview"]);
    expect(sections[1].items.map((i) => i.id)).toEqual(["export"]);
  });

  it("appends unknown (plugin-defined) groups as trailing, untitled sections", () => {
    const items = [
      { id: "p", group: "site" },
      { id: "x", group: "custom" },
    ];
    const sections = groupNavItems(items);
    expect(sections.map((s) => s.id)).toEqual(["site", "custom"]);
    const custom = sections.find((s) => s.id === "custom");
    expect(custom.titleKey).toBeUndefined();
    expect(custom.items.map((i) => i.id)).toEqual(["x"]);
  });

  it("falls back ungrouped items into the tools group", () => {
    const sections = groupNavItems([{ id: "loose" }]);
    expect(sections.map((s) => s.id)).toEqual(["tools"]);
    expect(sections[0].items.map((i) => i.id)).toEqual(["loose"]);
  });

  it("exposes NAV_GROUPS in declared order", () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(["site", "tools"]);
  });
});
