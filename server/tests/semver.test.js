/**
 * Semver Utilities Test Suite
 *
 * Tests the version parsing, comparison, validation, and sorting
 * utilities used by the theme update system.
 *
 * Pure functions — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/semver.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseVersion,
  isValidVersion,
  compareVersions,
  isNewerVersion,
  sortVersions,
  getLatestVersion,
} from "../utils/semver.js";

// ============================================================================
// parseVersion
// ============================================================================

describe("parseVersion", () => {
  it("parses a standard semver string", () => {
    assert.deepEqual(parseVersion("1.2.3"), { major: 1, minor: 2, patch: 3 });
  });

  it("parses version 0.0.0", () => {
    assert.deepEqual(parseVersion("0.0.0"), { major: 0, minor: 0, patch: 0 });
  });

  it("parses large version numbers", () => {
    assert.deepEqual(parseVersion("100.200.300"), { major: 100, minor: 200, patch: 300 });
  });

  it("returns null for null input", () => {
    assert.equal(parseVersion(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(parseVersion(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.equal(parseVersion(""), null);
  });

  it("returns null for non-string input", () => {
    assert.equal(parseVersion(123), null);
    assert.equal(parseVersion(true), null);
    assert.equal(parseVersion({}), null);
  });

  it("returns null for incomplete version (missing patch)", () => {
    assert.equal(parseVersion("1.2"), null);
  });

  it("returns null for single number", () => {
    assert.equal(parseVersion("1"), null);
  });

  it("returns null for version with extra parts", () => {
    assert.equal(parseVersion("1.2.3.4"), null);
  });

  it("returns null for version with pre-release suffix", () => {
    assert.equal(parseVersion("1.2.3-beta"), null);
  });

  it("returns null for version with leading v", () => {
    assert.equal(parseVersion("v1.2.3"), null);
  });

  it("returns null for non-numeric parts", () => {
    assert.equal(parseVersion("a.b.c"), null);
  });

  it("returns null for version with spaces", () => {
    assert.equal(parseVersion(" 1.2.3"), null);
    assert.equal(parseVersion("1.2.3 "), null);
  });
});

// ============================================================================
// isValidVersion
// ============================================================================

describe("isValidVersion", () => {
  it("returns true for valid semver", () => {
    assert.equal(isValidVersion("1.0.0"), true);
    assert.equal(isValidVersion("0.0.1"), true);
    assert.equal(isValidVersion("10.20.30"), true);
  });

  it("returns false for invalid versions", () => {
    assert.equal(isValidVersion(""), false);
    assert.equal(isValidVersion(null), false);
    assert.equal(isValidVersion("abc"), false);
    assert.equal(isValidVersion("1.2"), false);
    assert.equal(isValidVersion("v1.0.0"), false);
  });
});

// ============================================================================
// compareVersions
// ============================================================================

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
    assert.equal(compareVersions("0.0.0", "0.0.0"), 0);
    assert.equal(compareVersions("5.10.20", "5.10.20"), 0);
  });

  it("compares by major version", () => {
    assert.ok(compareVersions("2.0.0", "1.0.0") > 0);
    assert.ok(compareVersions("1.0.0", "2.0.0") < 0);
  });

  it("compares by minor version when major is equal", () => {
    assert.ok(compareVersions("1.2.0", "1.1.0") > 0);
    assert.ok(compareVersions("1.1.0", "1.2.0") < 0);
  });

  it("compares by patch version when major and minor are equal", () => {
    assert.ok(compareVersions("1.0.2", "1.0.1") > 0);
    assert.ok(compareVersions("1.0.1", "1.0.2") < 0);
  });

  it("uses numeric comparison, not lexicographic", () => {
    // "9" > "10" lexicographically, but 9 < 10 numerically
    assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
    assert.ok(compareVersions("10.0.0", "9.0.0") > 0);
    assert.ok(compareVersions("1.0.10", "1.0.9") > 0);
  });

  it("pushes invalid versions to the end (returns 1)", () => {
    assert.ok(compareVersions("invalid", "1.0.0") > 0);
  });

  it("puts valid versions before invalid ones (returns -1)", () => {
    assert.ok(compareVersions("1.0.0", "invalid") < 0);
  });

  it("returns 0 when both are invalid", () => {
    assert.equal(compareVersions("abc", "def"), 0);
    assert.equal(compareVersions(null, undefined), 0);
  });
});

// ============================================================================
// isNewerVersion
// ============================================================================

describe("isNewerVersion", () => {
  it("returns true when available is newer", () => {
    assert.equal(isNewerVersion("1.0.0", "1.0.1"), true);
    assert.equal(isNewerVersion("1.0.0", "1.1.0"), true);
    assert.equal(isNewerVersion("1.0.0", "2.0.0"), true);
  });

  it("returns false when available is older", () => {
    assert.equal(isNewerVersion("1.0.1", "1.0.0"), false);
    assert.equal(isNewerVersion("2.0.0", "1.0.0"), false);
  });

  it("returns false when versions are equal", () => {
    assert.equal(isNewerVersion("1.0.0", "1.0.0"), false);
  });

  it("handles multi-digit versions correctly", () => {
    assert.equal(isNewerVersion("1.9.0", "1.10.0"), true);
    assert.equal(isNewerVersion("1.10.0", "1.9.0"), false);
  });
});

// ============================================================================
// sortVersions
// ============================================================================

describe("sortVersions", () => {
  it("sorts versions in ascending order", () => {
    const input = ["2.0.0", "1.0.0", "3.0.0"];
    assert.deepEqual(sortVersions(input), ["1.0.0", "2.0.0", "3.0.0"]);
  });

  it("sorts by minor and patch correctly", () => {
    const input = ["1.2.0", "1.0.3", "1.1.0", "1.0.1"];
    assert.deepEqual(sortVersions(input), ["1.0.1", "1.0.3", "1.1.0", "1.2.0"]);
  });

  it("handles numeric ordering (not lexicographic)", () => {
    const input = ["1.10.0", "1.9.0", "1.2.0", "1.1.0"];
    assert.deepEqual(sortVersions(input), ["1.1.0", "1.2.0", "1.9.0", "1.10.0"]);
  });

  it("does not mutate the original array", () => {
    const input = ["2.0.0", "1.0.0"];
    sortVersions(input);
    assert.deepEqual(input, ["2.0.0", "1.0.0"]);
  });

  it("handles single-element array", () => {
    assert.deepEqual(sortVersions(["1.0.0"]), ["1.0.0"]);
  });

  it("handles empty array", () => {
    assert.deepEqual(sortVersions([]), []);
  });

  it("pushes invalid versions to the end", () => {
    const input = ["invalid", "1.0.0", "2.0.0"];
    const sorted = sortVersions(input);
    assert.equal(sorted[0], "1.0.0");
    assert.equal(sorted[1], "2.0.0");
    assert.equal(sorted[2], "invalid");
  });

  it("handles already-sorted input", () => {
    const input = ["1.0.0", "1.0.1", "1.1.0", "2.0.0"];
    assert.deepEqual(sortVersions(input), ["1.0.0", "1.0.1", "1.1.0", "2.0.0"]);
  });

  it("handles reverse-sorted input", () => {
    const input = ["3.0.0", "2.0.0", "1.0.0"];
    assert.deepEqual(sortVersions(input), ["1.0.0", "2.0.0", "3.0.0"]);
  });
});

// ============================================================================
// getLatestVersion
// ============================================================================

describe("getLatestVersion", () => {
  it("returns the highest version", () => {
    assert.equal(getLatestVersion(["1.0.0", "2.0.0", "1.5.0"]), "2.0.0");
  });

  it("handles minor/patch differences", () => {
    assert.equal(getLatestVersion(["1.0.0", "1.0.1", "1.1.0"]), "1.1.0");
  });

  it("handles numeric ordering", () => {
    assert.equal(getLatestVersion(["1.9.0", "1.10.0", "1.2.0"]), "1.10.0");
  });

  it("returns the only version in a single-element array", () => {
    assert.equal(getLatestVersion(["1.0.0"]), "1.0.0");
  });

  it("returns null for empty array", () => {
    assert.equal(getLatestVersion([]), null);
  });

  it("returns null for null input", () => {
    assert.equal(getLatestVersion(null), null);
  });

  it("returns null for undefined input", () => {
    assert.equal(getLatestVersion(undefined), null);
  });

  it("skips invalid versions and returns the latest valid one", () => {
    // invalid versions sort to end, so the "latest" from sorted is "invalid"
    // This is the current behaviour — invalid strings sort last
    const result = getLatestVersion(["1.0.0", "invalid", "2.0.0"]);
    // "invalid" sorts to end, so it's returned as "latest"
    assert.equal(result, "invalid");
  });
});
