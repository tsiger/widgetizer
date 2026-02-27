/**
 * limitChecks Utility Test Suite
 *
 * Tests the pure limit-checking functions: checkLimit, checkStringLength,
 * validateZipEntries, and clampToCeiling.
 *
 * Passes hostedMode: true to checkLimit / checkStringLength so that
 * enforcement logic is active — mirroring what the platform does via
 * createEditorApp({ hostedMode: true }).
 *
 * Functions that always enforce (validateZipEntries, clampToCeiling) are also
 * tested for completeness.
 *
 * Run with: node --test server/tests/limitChecks.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { checkLimit, checkStringLength, validateZipEntries, clampToCeiling } = await import(
  "../utils/limitChecks.js"
);

/** Shorthand: hosted-mode options for checkLimit / checkStringLength. */
const hosted = { hostedMode: true };

// ============================================================================
// checkLimit
// ============================================================================

describe("checkLimit (hostedMode: true)", () => {
  it("returns ok when current value is under the limit", () => {
    const result = checkLimit(5, 10, "widgets per page", hosted);
    assert.equal(result.ok, true);
    assert.equal(result.error, undefined);
  });

  it("returns error when current value equals the limit", () => {
    const result = checkLimit(10, 10, "widgets per page", hosted);
    assert.equal(result.ok, false);
    assert.match(result.error, /maximum 10 widgets per page/);
  });

  it("returns error when current value exceeds the limit", () => {
    const result = checkLimit(15, 10, "widgets per page", hosted);
    assert.equal(result.ok, false);
    assert.match(result.error, /maximum 10 widgets per page/);
  });

  it("returns ok when current value is 0 and limit is positive", () => {
    const result = checkLimit(0, 25, "projects", hosted);
    assert.equal(result.ok, true);
  });

  it("returns error when both values are 0", () => {
    const result = checkLimit(0, 0, "items", hosted);
    assert.equal(result.ok, false);
  });

  it("returns ok when maxValue is null (no limit configured)", () => {
    const result = checkLimit(999, null, "things", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when maxValue is undefined (no limit configured)", () => {
    const result = checkLimit(999, undefined, "things", hosted);
    assert.equal(result.ok, true);
  });

  it("includes the limit number and label in the error message", () => {
    const result = checkLimit(100, 50, "pages per project", hosted);
    assert.equal(result.ok, false);
    assert.equal(result.error, "Limit reached: maximum 50 pages per project allowed");
  });
});

describe("checkLimit — alwaysEnforce flag", () => {
  it("enforces when alwaysEnforce is true (regardless of hostedMode)", () => {
    const result = checkLimit(5000, 1000, "ZIP entries", { alwaysEnforce: true });
    assert.equal(result.ok, false);
    assert.match(result.error, /maximum 1000 ZIP entries/);
  });

  it("passes when under limit with alwaysEnforce", () => {
    const result = checkLimit(500, 1000, "ZIP entries", { alwaysEnforce: true });
    assert.equal(result.ok, true);
  });
});

describe("checkLimit — exclusive vs inclusive", () => {
  it("exclusive (default): fails when value equals max", () => {
    const result = checkLimit(10, 10, "items", hosted);
    assert.equal(result.ok, false);
  });

  it("exclusive (default): passes when value is one below max", () => {
    const result = checkLimit(9, 10, "items", hosted);
    assert.equal(result.ok, true);
  });

  it("inclusive (exclusive: false): passes when value equals max", () => {
    const result = checkLimit(50, 50, "widgets per page", { exclusive: false, ...hosted });
    assert.equal(result.ok, true);
  });

  it("inclusive (exclusive: false): fails when value exceeds max", () => {
    const result = checkLimit(51, 50, "widgets per page", { exclusive: false, ...hosted });
    assert.equal(result.ok, false);
  });

  it("inclusive (exclusive: false): passes when value is under max", () => {
    const result = checkLimit(30, 50, "widgets per page", { exclusive: false, ...hosted });
    assert.equal(result.ok, true);
  });

  it("inclusive with alwaysEnforce works together", () => {
    const result = checkLimit(100, 100, "items", { exclusive: false, alwaysEnforce: true });
    assert.equal(result.ok, true);

    const result2 = checkLimit(101, 100, "items", { exclusive: false, alwaysEnforce: true });
    assert.equal(result2.ok, false);
  });
});

describe("checkLimit — open-source mode (hostedMode: false)", () => {
  it("bypasses limits when hostedMode is false (default)", () => {
    const result = checkLimit(999, 10, "widgets per page");
    assert.equal(result.ok, true);
  });

  it("still enforces when alwaysEnforce is true even without hostedMode", () => {
    const result = checkLimit(999, 10, "widgets per page", { alwaysEnforce: true });
    assert.equal(result.ok, false);
  });
});

// ============================================================================
// checkStringLength
// ============================================================================

describe("checkStringLength (hostedMode: true)", () => {
  it("returns ok for string within the limit", () => {
    const result = checkStringLength("hello", 200, "project name", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok for string exactly at the limit", () => {
    const result = checkStringLength("ab", 2, "name", hosted);
    assert.equal(result.ok, true);
  });

  it("returns error for string exceeding the limit", () => {
    const result = checkStringLength("abcdef", 3, "menu name", hosted);
    assert.equal(result.ok, false);
    assert.match(result.error, /menu name is too long/);
    assert.match(result.error, /6 characters/);
    assert.match(result.error, /maximum 3/);
  });

  it("returns ok for empty string", () => {
    const result = checkStringLength("", 200, "name", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when maxLen is null", () => {
    const result = checkStringLength("anything", null, "field", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when maxLen is undefined", () => {
    const result = checkStringLength("anything", undefined, "field", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when value is not a string (null)", () => {
    const result = checkStringLength(null, 200, "field", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when value is not a string (number)", () => {
    const result = checkStringLength(42, 200, "field", hosted);
    assert.equal(result.ok, true);
  });

  it("returns ok when value is not a string (undefined)", () => {
    const result = checkStringLength(undefined, 200, "field", hosted);
    assert.equal(result.ok, true);
  });
});

describe("checkStringLength — alwaysEnforce flag", () => {
  it("enforces with alwaysEnforce: true", () => {
    const result = checkStringLength("toolong", 3, "field", { alwaysEnforce: true });
    assert.equal(result.ok, false);
  });
});

describe("checkStringLength — open-source mode (hostedMode: false)", () => {
  it("bypasses limits when hostedMode is false (default)", () => {
    const result = checkStringLength("toolong", 3, "field");
    assert.equal(result.ok, true);
  });

  it("still enforces when alwaysEnforce is true even without hostedMode", () => {
    const result = checkStringLength("toolong", 3, "field", { alwaysEnforce: true });
    assert.equal(result.ok, false);
  });
});

// ============================================================================
// validateZipEntries (always enforced, no hosted-mode gating)
// ============================================================================

/** Create a mock adm-zip instance with the given entry names. */
function mockZip(entryNames) {
  return {
    getEntries() {
      return entryNames.map((name) => ({ entryName: name }));
    },
  };
}

describe("validateZipEntries", () => {
  it("returns ok for a ZIP with entries under the limit", () => {
    const zip = mockZip(["index.html", "style.css", "app.js"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, true);
  });

  it("returns ok for a ZIP with entries exactly at the limit", () => {
    const entries = Array.from({ length: 50 }, (_, i) => `file${i}.txt`);
    const zip = mockZip(entries);
    const result = validateZipEntries(zip, 50);
    assert.equal(result.ok, true);
  });

  it("returns error for a ZIP exceeding the entry limit", () => {
    const entries = Array.from({ length: 101 }, (_, i) => `file${i}.txt`);
    const zip = mockZip(entries);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, false);
    assert.match(result.error, /too many entries/);
    assert.match(result.error, /101/);
    assert.match(result.error, /maximum 100/);
  });

  it("returns ok for an empty ZIP", () => {
    const zip = mockZip([]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, true);
  });

  it("detects path traversal with ../ prefix", () => {
    const zip = mockZip(["index.html", "../../../etc/passwd"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, false);
    assert.match(result.error, /unsafe path/);
  });

  it("detects path traversal with embedded ../", () => {
    const zip = mockZip(["assets/../../../secret.txt"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, false);
    assert.match(result.error, /unsafe path/);
  });

  it("detects absolute paths", () => {
    const zip = mockZip(["/etc/passwd"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, false);
    assert.match(result.error, /unsafe path/);
  });

  it("allows normal nested paths", () => {
    const zip = mockZip(["assets/css/style.css", "images/photo.png", "js/app.js"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, true);
  });

  it("allows paths with single dots (current dir)", () => {
    // path.normalize("./index.html") => "index.html" — safe
    const zip = mockZip(["./index.html"]);
    const result = validateZipEntries(zip, 100);
    assert.equal(result.ok, true);
  });

  it("uses EDITOR_LIMITS.maxZipEntries as default when no maxEntries given", () => {
    // With just 3 entries, should pass against the default 10,000
    const zip = mockZip(["a.txt", "b.txt", "c.txt"]);
    const result = validateZipEntries(zip);
    assert.equal(result.ok, true);
  });
});

// ============================================================================
// clampToCeiling
// ============================================================================

describe("clampToCeiling", () => {
  it("returns the value when under the ceiling", () => {
    assert.equal(clampToCeiling(10, 50), 10);
  });

  it("returns the ceiling when value equals ceiling", () => {
    assert.equal(clampToCeiling(50, 50), 50);
  });

  it("clamps value down to ceiling when over", () => {
    assert.equal(clampToCeiling(999, 50), 50);
  });

  it("works with 0 value", () => {
    assert.equal(clampToCeiling(0, 50), 0);
  });

  it("works with 0 ceiling", () => {
    assert.equal(clampToCeiling(10, 0), 0);
  });

  it("returns the value unchanged when value is not a number", () => {
    assert.equal(clampToCeiling("abc", 50), "abc");
  });

  it("returns the value unchanged when ceiling is not a number", () => {
    assert.equal(clampToCeiling(10, "abc"), 10);
  });

  it("returns the value unchanged when both are not numbers", () => {
    assert.equal(clampToCeiling("abc", "def"), "abc");
  });

  it("returns the value unchanged when value is null", () => {
    assert.equal(clampToCeiling(null, 50), null);
  });

  it("returns the value unchanged when ceiling is undefined", () => {
    assert.equal(clampToCeiling(10, undefined), 10);
  });

  it("handles negative values", () => {
    assert.equal(clampToCeiling(-5, 50), -5);
  });

  it("handles negative ceiling", () => {
    assert.equal(clampToCeiling(10, -5), -5);
  });
});
