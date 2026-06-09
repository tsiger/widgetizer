/**
 * Path Security Utilities Test Suite
 *
 * Tests the isWithinDirectory helper that replaced the naive
 * startsWith-based path boundary checks.
 *
 * Pure functions — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/pathSecurity.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "path";

import { isWithinDirectory } from "../utils/pathSecurity.js";

describe("isWithinDirectory", () => {
  const base = path.resolve("/data/publish");

  it("accepts a direct child file", () => {
    assert.equal(isWithinDirectory(path.resolve("/data/publish/file.html"), base), true);
  });

  it("accepts a nested file", () => {
    assert.equal(isWithinDirectory(path.resolve("/data/publish/sub/deep/file.html"), base), true);
  });

  it("rejects a parent traversal (../)", () => {
    assert.equal(isWithinDirectory(path.resolve("/data/publish/../etc/passwd"), base), false);
  });

  it("rejects a sibling directory with the same prefix", () => {
    // This is the key case that startsWith gets wrong:
    // "/data/publish-evil/malicious".startsWith("/data/publish") === true
    assert.equal(isWithinDirectory(path.resolve("/data/publish-evil/malicious"), base), false);
  });

  it("rejects the base directory itself (must be inside, not equal)", () => {
    assert.equal(isWithinDirectory(base, base), false);
  });

  it("rejects an unrelated absolute path", () => {
    assert.equal(isWithinDirectory(path.resolve("/etc/passwd"), base), false);
  });
});
