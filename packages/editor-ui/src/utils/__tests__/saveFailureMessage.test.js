import { describe, expect, it } from "vitest";
import { saveFailureMessageKey } from "../saveFailureMessage";

describe("saveFailureMessageKey", () => {
  const missing = (extra = {}) => Object.assign(new Error("missing"), { code: "MEDIA_REFERENCE_MISSING", ...extra });

  it("names the page for a page refused over a deleted image", () => {
    expect(saveFailureMessageKey(missing())).toBe("pageEditor.mediaUsage.missing");
  });

  it("names the site settings when they were the part refused", () => {
    expect(saveFailureMessageKey(missing({ savePart: "theme" }))).toBe("pageEditor.mediaUsage.missingSiteSettings");
  });

  it("falls back to the generic failure for anything else", () => {
    expect(saveFailureMessageKey(new Error("boom"))).toBe("pageEditor.toolbar.saveFailed");
    expect(saveFailureMessageKey(undefined)).toBe("pageEditor.toolbar.saveFailed");
  });
});
