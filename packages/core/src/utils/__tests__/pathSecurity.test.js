import { describe, it, expect } from "vitest";
import path from "path";
import { isWithinDirectory, assertWithin } from "../pathSecurity";

const base = path.resolve("/data/publish");

describe("isWithinDirectory", () => {
  it("accepts a direct child", () => {
    expect(isWithinDirectory(base, path.resolve("/data/publish/file.html"))).toBe(true);
  });

  it("accepts a nested descendant", () => {
    expect(isWithinDirectory(base, path.resolve("/data/publish/a/b/c.html"))).toBe(true);
  });

  it("rejects a parent traversal", () => {
    expect(isWithinDirectory(base, path.resolve("/data/publish/../etc/passwd"))).toBe(false);
  });

  it("rejects a sibling sharing the prefix", () => {
    expect(isWithinDirectory(base, path.resolve("/data/publish-evil/x"))).toBe(false);
  });

  it("honours allowEqual for the base itself (the drift point)", () => {
    expect(isWithinDirectory(base, base)).toBe(false); // default
    expect(isWithinDirectory(base, base, { allowEqual: false })).toBe(false);
    expect(isWithinDirectory(base, base, { allowEqual: true })).toBe(true);
  });
});

describe("assertWithin", () => {
  it("throws when the target escapes", () => {
    expect(() => assertWithin(base, path.resolve("/data/other/x"))).toThrow(/escapes/);
  });

  it("does not throw for a descendant", () => {
    expect(() => assertWithin(base, path.resolve("/data/publish/x"))).not.toThrow();
  });

  it("throws for base === base by default but not when allowEqual is true", () => {
    expect(() => assertWithin(base, base)).toThrow(/escapes/);
    expect(() => assertWithin(base, base, { allowEqual: true })).not.toThrow();
  });
});
