// @vitest-environment jsdom
/**
 * The live preview sets each theme variable as a property of the theme tag's
 * `:root` rule. A value is never written as CSS text, so whatever it holds it
 * stays the value of that one variable.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const styleTag = () => document.getElementById("theme-settings-styles");
const rootRule = () => [...styleTag().sheet.cssRules].find((rule) => rule.selectorText === ":root");
const names = () => [...rootRule().style];

beforeAll(async () => {
  window.history.replaceState(null, "", `?parentOrigin=${encodeURIComponent(window.location.origin)}`);
  await import("../previewRuntime.js");
});

beforeEach(() => {
  document.head.innerHTML =
    '<style id="theme-settings-styles">\n:root {\n  --colors-accent: #ff0000;\n  --layout-gap: 12px;\n}\n</style>';
});

describe("preview runtime theme variables", () => {
  it("replaces the rule's variables with the ones it is given", () => {
    window.PreviewRuntime.updateCssVariables({ "--colors-accent": "#0000ff", "--typography-heading_font-weight": 600 });

    expect(names().sort()).toEqual(["--colors-accent", "--typography-heading_font-weight"]);
    expect(rootRule().style.getPropertyValue("--colors-accent")).toBe("#0000ff");
    expect(rootRule().style.getPropertyValue("--typography-heading_font-weight")).toBe("600");
  });

  it("keeps a value that holds CSS as the value of its one variable", () => {
    window.PreviewRuntime.updateCssVariables({
      "--colors-accent": "red; background: url(https://example.com/seen.png); font-size: 40px",
    });

    expect(names()).toEqual(["--colors-accent"]);
    expect(rootRule().style.getPropertyValue("background")).toBe("");
    expect(rootRule().style.getPropertyValue("font-size")).toBe("");
    expect(styleTag().sheet.cssRules).toHaveLength(1);
  });

  it("leaves out a key that is not a custom property's name", () => {
    window.PreviewRuntime.updateCssVariables({
      background: "red",
      "--ok": "1px",
      "--bad name": "2px",
      "--x; color": "blue",
    });

    expect(names()).toEqual(["--ok"]);
    expect(rootRule().style.getPropertyValue("background")).toBe("");
  });

  it("adds the :root rule when the tag has none, and does nothing without the tag", () => {
    styleTag().textContent = "";
    window.PreviewRuntime.updateCssVariables({ "--colors-accent": "#00ff00" });
    expect(rootRule().style.getPropertyValue("--colors-accent")).toBe("#00ff00");

    document.head.innerHTML = "";
    expect(() => window.PreviewRuntime.updateCssVariables({ "--colors-accent": "#00ff00" })).not.toThrow();
  });
});
