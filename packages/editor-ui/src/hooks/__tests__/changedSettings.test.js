import { describe, it, expect } from "vitest";
import { changedSettings } from "../useAppSettings.js";

describe("changedSettings", () => {
  it("sends only the leaves the user changed", () => {
    const original = { general: { language: "en" }, media: { imageProcessing: { quality: 85, sizes: { thumb: { width: 150 } } } } };
    const current = { general: { language: "en" }, media: { imageProcessing: { quality: 70, sizes: { thumb: { width: 150 } } } } };
    expect(changedSettings(current, original)).toEqual({ media: { imageProcessing: { quality: 70 } } });
  });

  it("leaves out settings the user didn't touch, so a stale form can't revert them", () => {
    const original = { assistant: { enabled: false }, general: { language: "en" } };
    const current = { assistant: { enabled: false }, general: { language: "el" } };
    expect(changedSettings(current, original)).toEqual({ general: { language: "el" } });
  });

  it("is empty when nothing changed", () => {
    expect(changedSettings({ a: { b: 1 } }, { a: { b: 1 } })).toEqual({});
  });
});
