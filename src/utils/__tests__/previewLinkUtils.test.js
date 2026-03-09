import { describe, expect, it } from "vitest";
import { getStandalonePreviewTarget, isStandalonePreviewNavigationUrl } from "../previewLinkUtils";

describe("getStandalonePreviewTarget", () => {
  it("returns a preview route for internal html links", () => {
    expect(getStandalonePreviewTarget("about.html")).toBe("/preview/about");
    expect(getStandalonePreviewTarget("/contact.html?foo=bar")).toBe("/preview/contact");
  });

  it("returns a preview route for existing preview links", () => {
    expect(getStandalonePreviewTarget("/preview/services")).toBe("/preview/services");
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

describe("isStandalonePreviewNavigationUrl", () => {
  it("allows only internal preview routes", () => {
    expect(isStandalonePreviewNavigationUrl("/preview/about")).toBe(true);
    expect(isStandalonePreviewNavigationUrl("/preview/case-study")).toBe(true);
  });

  it("rejects non-preview targets", () => {
    expect(isStandalonePreviewNavigationUrl("/")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/about")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/preview/about?x=1")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("https://example.com")).toBe(false);
    expect(isStandalonePreviewNavigationUrl(null)).toBe(false);
  });
});
