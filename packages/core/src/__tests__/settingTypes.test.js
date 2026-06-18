import { describe, it, expect } from "vitest";
import {
  SUPPORTED_SETTING_TYPES,
  SUPPORTED_SETTING_TYPE_SET,
  isSupportedSettingType,
} from "../config/settingTypes.js";

describe("setting type registry", () => {
  it("recognizes the canonical setting types", () => {
    for (const type of ["text", "richtext", "image", "link", "menu", "date", "gallery", "table"]) {
      expect(isSupportedSettingType(type)).toBe(true);
    }
  });

  it("rejects unknown / falsy types", () => {
    expect(isSupportedSettingType("not_a_type")).toBe(false);
    expect(isSupportedSettingType("")).toBe(false);
    expect(isSupportedSettingType(undefined)).toBe(false);
  });

  it("keeps the array and the lookup set in sync", () => {
    expect(SUPPORTED_SETTING_TYPE_SET.size).toBe(SUPPORTED_SETTING_TYPES.length);
    for (const type of SUPPORTED_SETTING_TYPES) {
      expect(SUPPORTED_SETTING_TYPE_SET.has(type)).toBe(true);
    }
  });
});
