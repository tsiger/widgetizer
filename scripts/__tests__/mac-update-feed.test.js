import { describe, expect, it } from "vitest";
import { darwinVersionForMacOS, withMinimumSystemVersion } from "../mac-update-feed.js";

const FEED = `version: 1.0.1
files:
  - url: Widgetizer-1.0.1-arm64-mac.zip
    sha512: abc
    size: 100
path: Widgetizer-1.0.1-arm64-mac.zip
sha512: abc
releaseDate: '2026-11-06T21:00:00.000Z'
`;

describe("darwinVersionForMacOS", () => {
  it("maps the app's macOS minimum to the Darwin version os.release() reports", () => {
    expect(darwinVersionForMacOS("13.0")).toBe("22.0.0");
    expect(darwinVersionForMacOS("12.0")).toBe("21.0.0");
    expect(darwinVersionForMacOS("14")).toBe("23.0.0");
  });

  it("refuses versions before macOS 11, where the mapping doesn't hold", () => {
    expect(() => darwinVersionForMacOS("10.15")).toThrow(/11 or later/);
    expect(() => darwinVersionForMacOS("")).toThrow();
  });
});

describe("withMinimumSystemVersion", () => {
  it("adds the minimum right after the version line and keeps the rest", () => {
    const out = withMinimumSystemVersion(FEED, "22.0.0");
    expect(out.split("\n").slice(0, 2)).toEqual(["version: 1.0.1", "minimumSystemVersion: 22.0.0"]);
    expect(out.replace("minimumSystemVersion: 22.0.0\n", "")).toBe(FEED);
  });

  it("replaces a value already there instead of adding a second one", () => {
    const once = withMinimumSystemVersion(FEED, "21.0.0");
    const twice = withMinimumSystemVersion(once, "22.0.0");
    expect(twice.match(/minimumSystemVersion/g)).toHaveLength(1);
    expect(twice).toContain("minimumSystemVersion: 22.0.0");
  });

  it("refuses a feed without a version line", () => {
    expect(() => withMinimumSystemVersion("files: []\n", "22.0.0")).toThrow(/version line/);
  });
});
