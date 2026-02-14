/**
 * maxBlocks Utility Test Suite
 *
 * Tests the hasReachedMaxBlocks helper that enforces block limits
 * defined by the maxBlocks property in widget schemas.
 *
 * Pure function — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/maxBlocks.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { hasReachedMaxBlocks } from "../../src/utils/blockLimits.js";

// ============================================================================
// hasReachedMaxBlocks
// ============================================================================

describe("hasReachedMaxBlocks", () => {
  it("returns false when maxBlocks is not set (undefined)", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3"] };
    const schema = { type: "slideshow" };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when maxBlocks is null", () => {
    const widget = { blocksOrder: ["b1", "b2"] };
    const schema = { type: "slideshow", maxBlocks: null };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when maxBlocks is 0 (treated as unlimited)", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3"] };
    const schema = { type: "slideshow", maxBlocks: 0 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when maxBlocks is negative (treated as unlimited)", () => {
    const widget = { blocksOrder: ["b1", "b2"] };
    const schema = { type: "slideshow", maxBlocks: -1 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when block count is below maxBlocks", () => {
    const widget = { blocksOrder: ["b1", "b2"] };
    const schema = { type: "slideshow", maxBlocks: 5 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns true when block count equals maxBlocks", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3"] };
    const schema = { type: "slideshow", maxBlocks: 3 };
    assert.equal(hasReachedMaxBlocks(widget, schema), true);
  });

  it("returns true when block count exceeds maxBlocks", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3", "b4", "b5"] };
    const schema = { type: "slideshow", maxBlocks: 3 };
    assert.equal(hasReachedMaxBlocks(widget, schema), true);
  });

  it("returns false when widget has no blocksOrder", () => {
    const widget = {};
    const schema = { type: "slideshow", maxBlocks: 5 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when widget has empty blocksOrder", () => {
    const widget = { blocksOrder: [] };
    const schema = { type: "slideshow", maxBlocks: 5 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });

  it("returns false when widget is null", () => {
    const schema = { type: "slideshow", maxBlocks: 5 };
    assert.equal(hasReachedMaxBlocks(null, schema), false);
  });

  it("returns false when widget is undefined", () => {
    const schema = { type: "slideshow", maxBlocks: 5 };
    assert.equal(hasReachedMaxBlocks(undefined, schema), false);
  });

  it("returns false when schema is null", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3"] };
    assert.equal(hasReachedMaxBlocks(widget, null), false);
  });

  it("returns false when schema is undefined", () => {
    const widget = { blocksOrder: ["b1", "b2", "b3"] };
    assert.equal(hasReachedMaxBlocks(widget, undefined), false);
  });

  it("returns true with maxBlocks of 1 and one block", () => {
    const widget = { blocksOrder: ["b1"] };
    const schema = { type: "slideshow", maxBlocks: 1 };
    assert.equal(hasReachedMaxBlocks(widget, schema), true);
  });

  it("returns false with maxBlocks of 1 and no blocks", () => {
    const widget = { blocksOrder: [] };
    const schema = { type: "slideshow", maxBlocks: 1 };
    assert.equal(hasReachedMaxBlocks(widget, schema), false);
  });
});
