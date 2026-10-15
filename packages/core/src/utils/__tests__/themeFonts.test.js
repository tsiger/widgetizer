import { describe, it, expect } from "vitest";
import { collectThemeFonts, themeFontsStylesheetUrl } from "../themeFonts.js";

const INTER = '"Inter", sans-serif';
const PLAYFAIR = '"Playfair Display", serif';
const theme = (global) => ({ settings: { global } });

describe("collectThemeFonts", () => {
  it("reads font pickers from any group, not only typography", () => {
    const { fonts } = collectThemeFonts(
      theme({ brand: [{ id: "heading_font", type: "font_picker", value: { stack: PLAYFAIR, weight: 700 } }] }),
    );
    expect(fonts).toEqual({ "Playfair Display": [700] });
  });

  it("falls back to a picker's default when it has no saved value", () => {
    const { fonts } = collectThemeFonts(
      theme({ typography: [{ id: "heading_font", type: "font_picker", default: { stack: PLAYFAIR, weight: 600 } }] }),
    );
    expect(fonts).toEqual({ "Playfair Display": [600] });
  });

  it("adds the best bold weight for a body font at 400", () => {
    const { fonts } = collectThemeFonts(
      theme({ typography: [{ id: "body_font", type: "font_picker", value: { stack: INTER, weight: 400 } }] }),
    );
    expect(fonts).toEqual({ Inter: [400, 700] });
  });

  it("loads the bold for every body font at 400, wherever it sits", () => {
    const { fonts } = collectThemeFonts(
      theme({
        brand: [{ id: "body_font", type: "font_picker", value: { stack: PLAYFAIR, weight: 400 } }],
        typography: [{ id: "body_font", type: "font_picker", value: { stack: INTER, weight: 400 } }],
      }),
    );
    expect(fonts).toEqual({ "Playfair Display": [400, 700], Inter: [400, 700] });
  });

  it("skips system stacks and unknown stacks", () => {
    const { fonts } = collectThemeFonts(
      theme({
        typography: [
          { id: "body_font", type: "font_picker", value: { stack: "Georgia, serif", weight: 400 } },
          { id: "heading_font", type: "font_picker", value: { stack: '"Comic Sans", cursive', weight: 700 } },
        ],
      }),
    );
    expect(fonts).toEqual({});
  });

  it("reads the Bunny switch from any group, preferring advanced", () => {
    expect(collectThemeFonts(theme({ privacy: [{ id: "use_bunny_fonts", type: "checkbox", default: true }] })).useBunnyFonts).toBe(true);
    expect(collectThemeFonts(theme({ advanced: [{ id: "use_bunny_fonts", type: "checkbox", value: false, default: true }] })).useBunnyFonts).toBe(false);
  });
});

describe("themeFontsStylesheetUrl", () => {
  const fonts = { Inter: [400, 700], "Playfair Display": [700] };

  it("builds a Google Fonts v2 URL", () => {
    expect(themeFontsStylesheetUrl({ fonts, useBunnyFonts: false })).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Playfair%20Display:wght@700&display=swap",
    );
  });

  it("builds a Bunny Fonts v1 URL", () => {
    expect(themeFontsStylesheetUrl({ fonts, useBunnyFonts: true })).toBe(
      "https://fonts.bunny.net/css?family=Inter:400,700|Playfair%20Display:700&display=swap",
    );
  });

  it("is empty when there is nothing to load", () => {
    expect(themeFontsStylesheetUrl({ fonts: {}, useBunnyFonts: false })).toBe("");
  });
});
