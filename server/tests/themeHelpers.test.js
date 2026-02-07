/**
 * Theme Settings Preprocessing Test Suite
 *
 * Tests preprocessThemeSettings which transforms the array-based
 * theme.json settings into flat key-value objects for Liquid templates.
 *
 * Pure function — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/themeHelpers.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { preprocessThemeSettings } from "../utils/themeHelpers.js";

// ============================================================================
// Basic transformation
// ============================================================================

describe("preprocessThemeSettings — basic transform", () => {
  it("flattens a single category with one setting", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg_color", value: "#ffffff" }],
        },
      },
    });
    assert.deepEqual(result, { colors: { bg_color: "#ffffff" } });
  });

  it("flattens multiple settings in one category", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [
            { id: "bg_color", value: "#fff" },
            { id: "text_color", value: "#333" },
            { id: "accent", value: "#0066cc" },
          ],
        },
      },
    });
    assert.deepEqual(result, {
      colors: { bg_color: "#fff", text_color: "#333", accent: "#0066cc" },
    });
  });

  it("flattens multiple categories", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg", value: "#fff" }],
          typography: [{ id: "body_font", value: "Inter" }],
          layout: [{ id: "max_width", value: 1200 }],
        },
      },
    });
    assert.deepEqual(result, {
      colors: { bg: "#fff" },
      typography: { body_font: "Inter" },
      layout: { max_width: 1200 },
    });
  });

  it("handles object values (e.g. font_picker)", () => {
    const fontValue = { stack: '"Inter", sans-serif', weight: 400 };
    const result = preprocessThemeSettings({
      settings: {
        global: {
          typography: [{ id: "body_font", value: fontValue }],
        },
      },
    });
    assert.deepEqual(result.typography.body_font, fontValue);
  });

  it("handles boolean values", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          features: [
            { id: "show_header", value: true },
            { id: "show_footer", value: false },
          ],
        },
      },
    });
    assert.equal(result.features.show_header, true);
    assert.equal(result.features.show_footer, false);
  });

  it("handles numeric values including zero", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          spacing: [
            { id: "padding", value: 0 },
            { id: "margin", value: 24 },
          ],
        },
      },
    });
    assert.equal(result.spacing.padding, 0);
    assert.equal(result.spacing.margin, 24);
  });

  it("handles empty string value", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          text: [{ id: "subtitle", value: "" }],
        },
      },
    });
    assert.equal(result.text.subtitle, "");
  });
});

// ============================================================================
// Value vs default fallback
// ============================================================================

describe("preprocessThemeSettings — value/default fallback", () => {
  it("uses value when both value and default are present", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg", value: "#ffffff", default: "#eeeeee" }],
        },
      },
    });
    assert.equal(result.colors.bg, "#ffffff");
  });

  it("falls back to default when value is undefined", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg", default: "#eeeeee" }],
        },
      },
    });
    assert.equal(result.colors.bg, "#eeeeee");
  });

  it("returns null when neither value nor default exists", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg" }],
        },
      },
    });
    assert.equal(result.colors.bg, null);
  });

  it("uses value even when it is falsy (false, 0, empty string)", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          misc: [
            { id: "flag", value: false, default: true },
            { id: "count", value: 0, default: 10 },
            { id: "label", value: "", default: "Default Label" },
          ],
        },
      },
    });
    assert.equal(result.misc.flag, false);
    assert.equal(result.misc.count, 0);
    assert.equal(result.misc.label, "");
  });

  it("uses value when it is null (null !== undefined)", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg", value: null, default: "#eeeeee" }],
        },
      },
    });
    // null is not undefined, so value (null) should be used
    assert.equal(result.colors.bg, null);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe("preprocessThemeSettings — edge cases", () => {
  it("returns empty object when themeData is null", () => {
    const result = preprocessThemeSettings(null);
    assert.deepEqual(result, {});
  });

  it("returns empty object when themeData is undefined", () => {
    const result = preprocessThemeSettings(undefined);
    assert.deepEqual(result, {});
  });

  it("returns empty object when settings is missing", () => {
    const result = preprocessThemeSettings({});
    assert.deepEqual(result, {});
  });

  it("returns empty object when settings.global is missing", () => {
    const result = preprocessThemeSettings({ settings: {} });
    assert.deepEqual(result, {});
  });

  it("returns empty object when settings.global is null", () => {
    const result = preprocessThemeSettings({ settings: { global: null } });
    assert.deepEqual(result, {});
  });

  it("skips settings without an id", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [
            { id: "bg", value: "#fff" },
            { value: "#000" },              // no id — skipped
            { id: "accent", value: "#00f" },
          ],
        },
      },
    });
    assert.deepEqual(result.colors, { bg: "#fff", accent: "#00f" });
    // Only 2 keys, the one without id is dropped
    assert.equal(Object.keys(result.colors).length, 2);
  });

  it("skips category if it is not an array", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [{ id: "bg", value: "#fff" }],
          broken: "not-an-array",
          alsobroken: 42,
        },
      },
    });
    assert.deepEqual(result.colors, { bg: "#fff" });
    assert.equal(result.broken, undefined);
    assert.equal(result.alsobroken, undefined);
  });

  it("handles empty category array", () => {
    const result = preprocessThemeSettings({
      settings: {
        global: {
          colors: [],
        },
      },
    });
    assert.deepEqual(result.colors, {});
  });

  it("handles empty global object", () => {
    const result = preprocessThemeSettings({
      settings: { global: {} },
    });
    assert.deepEqual(result, {});
  });
});
