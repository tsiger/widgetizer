import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getUpdateStatus, hasAvailableUpdate } from "../utils/updateStatus.js";

// ============================================================================
// getUpdateStatus
// ============================================================================

describe("getUpdateStatus", () => {
  it("detects a newer available version", () => {
    const result = getUpdateStatus("1.0.0", "1.1.0");
    assert.strictEqual(result.hasUpdate, true);
    assert.strictEqual(result.currentVersion, "1.0.0");
    assert.strictEqual(result.latestVersion, "1.1.0");
    assert.strictEqual(result.currentVersionLabel, "1.0.0");
    assert.strictEqual(result.latestVersionLabel, "1.1.0");
  });

  it("returns false when versions are equal", () => {
    const result = getUpdateStatus("1.2.0", "1.2.0");
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, "1.2.0");
    assert.strictEqual(result.latestVersion, "1.2.0");
  });

  it("returns false when available is older", () => {
    const result = getUpdateStatus("2.0.0", "1.5.0");
    assert.strictEqual(result.hasUpdate, false);
  });

  it("returns false when current version is missing", () => {
    const result = getUpdateStatus(null, "1.0.0");
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, null);
    assert.strictEqual(result.latestVersion, "1.0.0");
    assert.strictEqual(result.currentVersionLabel, "unknown");
    assert.strictEqual(result.latestVersionLabel, "1.0.0");
  });

  it("returns false when available version is missing", () => {
    const result = getUpdateStatus("1.0.0", null);
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, "1.0.0");
    assert.strictEqual(result.latestVersion, null);
    assert.strictEqual(result.latestVersionLabel, "unknown");
  });

  it("returns false when both versions are missing", () => {
    const result = getUpdateStatus(null, null);
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, null);
    assert.strictEqual(result.latestVersion, null);
    assert.strictEqual(result.currentVersionLabel, "unknown");
    assert.strictEqual(result.latestVersionLabel, "unknown");
  });

  it("returns false for undefined versions", () => {
    const result = getUpdateStatus(undefined, undefined);
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, null);
    assert.strictEqual(result.latestVersion, null);
  });

  it("returns false for invalid version strings", () => {
    const result = getUpdateStatus("not-a-version", "also-not");
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, null);
    assert.strictEqual(result.latestVersion, null);
    assert.strictEqual(result.currentVersionLabel, "unknown");
    assert.strictEqual(result.latestVersionLabel, "unknown");
  });

  it("handles mixed valid/invalid: invalid current, valid available", () => {
    const result = getUpdateStatus("bad", "2.0.0");
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, null);
    assert.strictEqual(result.latestVersion, "2.0.0");
  });

  it("handles mixed valid/invalid: valid current, invalid available", () => {
    const result = getUpdateStatus("1.0.0", "bad");
    assert.strictEqual(result.hasUpdate, false);
    assert.strictEqual(result.currentVersion, "1.0.0");
    assert.strictEqual(result.latestVersion, null);
  });

  it("handles patch-level updates", () => {
    const result = getUpdateStatus("1.0.0", "1.0.1");
    assert.strictEqual(result.hasUpdate, true);
  });

  it("handles major version updates", () => {
    const result = getUpdateStatus("1.9.9", "2.0.0");
    assert.strictEqual(result.hasUpdate, true);
  });
});

// ============================================================================
// hasAvailableUpdate
// ============================================================================

describe("hasAvailableUpdate", () => {
  it("returns true when available is newer", () => {
    assert.strictEqual(hasAvailableUpdate("1.0.0", "1.1.0"), true);
  });

  it("returns false when versions are equal", () => {
    assert.strictEqual(hasAvailableUpdate("1.0.0", "1.0.0"), false);
  });

  it("returns false when available is older", () => {
    assert.strictEqual(hasAvailableUpdate("2.0.0", "1.0.0"), false);
  });

  it("returns false for null current", () => {
    assert.strictEqual(hasAvailableUpdate(null, "1.0.0"), false);
  });

  it("returns false for null available", () => {
    assert.strictEqual(hasAvailableUpdate("1.0.0", null), false);
  });

  it("returns false for invalid versions", () => {
    assert.strictEqual(hasAvailableUpdate("bad", "1.0.0"), false);
    assert.strictEqual(hasAvailableUpdate("1.0.0", "bad"), false);
  });
});
