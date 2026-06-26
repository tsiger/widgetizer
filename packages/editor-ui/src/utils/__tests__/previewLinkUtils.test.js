import { describe, expect, it } from "vitest";
import { isStandalonePreviewNavigationUrl } from "../previewLinkUtils";

// `getStandalonePreviewTarget` moved to src/utils/standalonePreviewTarget.js
// (its only consumer is the injected preview runtime); see that file's test.

describe("isStandalonePreviewNavigationUrl", () => {
  it("allows only internal preview routes", () => {
    expect(isStandalonePreviewNavigationUrl("/preview/about")).toBe(true);
    expect(isStandalonePreviewNavigationUrl("/preview/case-study")).toBe(true);
    expect(isStandalonePreviewNavigationUrl("/preview/collection/rooms/suite-caldera")).toBe(true);
  });

  it("rejects non-preview targets", () => {
    expect(isStandalonePreviewNavigationUrl("/")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/about")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/preview/about?x=1")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("https://example.com")).toBe(false);
    expect(isStandalonePreviewNavigationUrl(null)).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/preview/collection/rooms/suite-caldera?x=1")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/preview/collection/rooms")).toBe(false);
    expect(isStandalonePreviewNavigationUrl("/preview/collection/a/b/c")).toBe(false);
  });
});
