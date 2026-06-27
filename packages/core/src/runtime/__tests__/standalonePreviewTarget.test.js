import { describe, expect, it } from "vitest";
import { getStandalonePreviewTarget } from "../standalonePreviewTarget.js";

// This is the single source of truth used at runtime by previewRuntime.js (the
// injected preview iframe script). The mapping previously had a dead duplicate in
// editor-ui's previewLinkUtils.js whose test was the only coverage; the test moved
// here with the function so the LIVE implementation is the one under test.

describe("getStandalonePreviewTarget", () => {
  it("returns a preview route for internal html links", () => {
    expect(getStandalonePreviewTarget("about.html")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("/contact.html?foo=bar")).toBe("/preview/contact");
  });

  it("returns a preview route for existing preview links", () => {
    expect(getStandalonePreviewTarget("/preview/services")).toBe("/preview/services");
  });

  it("returns a collection item route for nested item html links", () => {
    expect(getStandalonePreviewTarget("rooms/suite-caldera.html")).toBe("/preview/collection/rooms/suite-caldera");
    expect(getStandalonePreviewTarget("/excursions/sunset-cruise.html?ref=1")).toBe(
      "/preview/collection/excursions/sunset-cruise",
    );
  });

  it("blocks hash links", () => {
    expect(getStandalonePreviewTarget("#features")).toBeNull();
    expect(getStandalonePreviewTarget("  #pricing")).toBeNull();
  });

  it("blocks external and non-page protocols", () => {
    expect(getStandalonePreviewTarget("https://example.com")).toBeNull();
    expect(getStandalonePreviewTarget("http://example.com")).toBeNull();
    expect(getStandalonePreviewTarget("//cdn.example.com")).toBeNull();
    expect(getStandalonePreviewTarget("mailto:test@example.com")).toBeNull();
    expect(getStandalonePreviewTarget("tel:+123456789")).toBeNull();
    expect(getStandalonePreviewTarget("javascript:alert(1)")).toBeNull();
  });

  it("blocks unsupported internal paths", () => {
    expect(getStandalonePreviewTarget("/")).toBeNull();
    expect(getStandalonePreviewTarget("/foo/bar")).toBeNull();
  });
});
