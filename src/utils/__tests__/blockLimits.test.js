import { describe, it, expect } from "vitest";
import { hasReachedMaxBlocks } from "../blockLimits";

describe("hasReachedMaxBlocks", () => {
  it("returns false when maxBlocks is not set", () => {
    const widget = { blocksOrder: ["a", "b"] };
    const schema = {};
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns false when maxBlocks is null", () => {
    const widget = { blocksOrder: ["a", "b"] };
    const schema = { maxBlocks: null };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns false when maxBlocks is 0 (unlimited)", () => {
    const widget = { blocksOrder: ["a", "b"] };
    const schema = { maxBlocks: 0 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns false when maxBlocks is negative", () => {
    const widget = { blocksOrder: ["a"] };
    const schema = { maxBlocks: -1 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns false when count is below maxBlocks", () => {
    const widget = { blocksOrder: ["a", "b"] };
    const schema = { maxBlocks: 5 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns true when count equals maxBlocks", () => {
    const widget = { blocksOrder: ["a", "b", "c"] };
    const schema = { maxBlocks: 3 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(true);
  });

  it("returns true when count exceeds maxBlocks", () => {
    const widget = { blocksOrder: ["a", "b", "c", "d"] };
    const schema = { maxBlocks: 3 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(true);
  });

  it("returns false when widget has no blocksOrder", () => {
    const widget = {};
    const schema = { maxBlocks: 3 };
    expect(hasReachedMaxBlocks(widget, schema)).toBe(false);
  });

  it("returns false when widget is null", () => {
    expect(hasReachedMaxBlocks(null, { maxBlocks: 3 })).toBe(false);
  });

  it("returns false when widget is undefined", () => {
    expect(hasReachedMaxBlocks(undefined, { maxBlocks: 3 })).toBe(false);
  });

  it("returns false when schema is null", () => {
    expect(hasReachedMaxBlocks({ blocksOrder: ["a"] }, null)).toBe(false);
  });

  it("returns false when schema is undefined", () => {
    expect(hasReachedMaxBlocks({ blocksOrder: ["a"] }, undefined)).toBe(false);
  });

  it("returns true with maxBlocks of 1 and one block", () => {
    expect(hasReachedMaxBlocks({ blocksOrder: ["a"] }, { maxBlocks: 1 })).toBe(true);
  });

  it("returns false with maxBlocks of 1 and empty blocksOrder", () => {
    expect(hasReachedMaxBlocks({ blocksOrder: [] }, { maxBlocks: 1 })).toBe(false);
  });
});
