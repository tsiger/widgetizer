import { describe, it, expect } from "vitest";
import { formatSlug } from "../slugUtils";

describe("formatSlug", () => {
  it("converts text to a lowercase slug", () => {
    expect(formatSlug("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(formatSlug("Hello! @World #2024")).toBe("hello-world-2024");
  });

  it("collapses multiple spaces into a single dash", () => {
    expect(formatSlug("too   many   spaces")).toBe("too-many-spaces");
  });

  it("trims leading and trailing whitespace", () => {
    expect(formatSlug("  padded  ")).toBe("padded");
  });

  it("handles already-slugified input", () => {
    expect(formatSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("replaces ampersands with dashes", () => {
    expect(formatSlug("salt & pepper")).toBe("salt-and-pepper");
  });

  it("returns empty string for empty input", () => {
    expect(formatSlug("")).toBe("");
  });
});
