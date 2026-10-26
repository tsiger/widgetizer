import { describe, expect, it } from "vitest";
import { Liquid } from "liquidjs";
import { readsDependOn, trackThemeReads } from "../themeReads.js";

const theme = () => ({
  colors: { accent: "#f00", text: "#111" },
  general: { show_breadcrumbs: true, date_format: "D MMM YYYY", logo: { src: "a.png" } },
});

async function render(template, data = theme()) {
  const reads = new Set();
  const engine = new Liquid();
  const html = await engine.parseAndRender(template, { theme: trackThemeReads(data, reads) });
  return { html, reads: [...reads].sort() };
}

describe("trackThemeReads", () => {
  it("records each setting a template reads, and renders the same output", async () => {
    const { html, reads } = await render("{{ theme.colors.accent }} {% if theme.general.show_breadcrumbs %}yes{% endif %}");
    expect(html).toBe("#f00 yes");
    expect(reads).toEqual(["colors.accent", "general.show_breadcrumbs"]);
  });

  it("records nothing for settings a template never reads", async () => {
    const { reads } = await render("plain text");
    expect(reads).toEqual([]);
  });

  it("records a setting read through a nested value as that setting", async () => {
    const { html, reads } = await render("{{ theme.general.logo.src }}");
    expect(html).toBe("a.png");
    expect(reads).toEqual(["general.logo"]);
  });

  it("records a missing setting, so adding a value to it re-renders", async () => {
    const { html, reads } = await render("{{ theme.general.missing }}");
    expect(html).toBe("");
    expect(reads).toEqual(["general.missing"]);
  });

  it("records a whole group when a template loops over it", async () => {
    const { html, reads } = await render("{% for pair in theme.colors %}{{ pair[1] }}{% endfor %}");
    expect(html).toBe("#f00#111");
    expect(reads).toContain("colors.*");
  });

  it("records a whole group for a group the theme does not have", async () => {
    const { reads } = await render("{{ theme.nothing.here }}");
    expect(reads).toEqual(["nothing.*"]);
  });

  it("leaves the settings object untouched", async () => {
    const data = theme();
    await render("{{ theme.colors.accent }}", data);
    expect(data).toEqual(theme());
  });
});

describe("readsDependOn", () => {
  const change = (group, id) => ({ group, id });

  it("matches a read setting", () => {
    expect(readsDependOn(["colors.accent"], [change("colors", "accent")])).toBe(true);
  });

  it("ignores settings that were not read", () => {
    expect(readsDependOn(["colors.accent"], [change("colors", "text")])).toBe(false);
  });

  it("matches a group or whole-theme wildcard", () => {
    expect(readsDependOn(["colors.*"], [change("colors", "text")])).toBe(true);
    expect(readsDependOn(["*"], [change("general", "logo")])).toBe(true);
  });

  it("treats unknown reads as depending on everything", () => {
    expect(readsDependOn(null, [change("colors", "text")])).toBe(true);
    expect(readsDependOn(undefined, [])).toBe(true);
  });
});
