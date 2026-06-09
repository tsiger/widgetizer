/**
 * Migration runner test suite.
 *
 * Covers the `trackingTable` parameterization added for the shared-database
 * (hosted) topology: the runner must default to `_migrations` for existing
 * OSS installs, support a custom tracking table name, and stay idempotent.
 *
 * Run with: node --test server/tests/migrations.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations, DEFAULT_TRACKING_TABLE } from "../db/migrations.js";

// Tables the initial schema (v1) is expected to create.
const EXPECTED_TABLES = [
  "projects",
  "app_settings",
  "media_files",
  "media_sizes",
  "media_usage",
  "exports",
];

function tableExists(db, name) {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(name),
  );
}

function appliedVersions(db, trackingTable) {
  return db
    .prepare(`SELECT version FROM ${trackingTable} ORDER BY version`)
    .all()
    .map((row) => row.version);
}

describe("runMigrations", () => {
  it("creates the full initial schema on a fresh database", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    for (const table of EXPECTED_TABLES) {
      assert.ok(tableExists(db, table), `expected table "${table}" to exist`);
    }
    db.close();
  });

  it("tracks applied versions in `_migrations` by default", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    assert.ok(tableExists(db, DEFAULT_TRACKING_TABLE));
    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), [1]);
    db.close();
  });

  it("uses a custom tracking table when provided, leaving the default absent", () => {
    const db = new Database(":memory:");
    runMigrations(db, { trackingTable: "_widgetizer_migrations" });

    // Schema is applied...
    for (const table of EXPECTED_TABLES) {
      assert.ok(tableExists(db, table), `expected table "${table}" to exist`);
    }
    // ...tracked under the custom name only.
    assert.ok(tableExists(db, "_widgetizer_migrations"));
    assert.deepEqual(appliedVersions(db, "_widgetizer_migrations"), [1]);
    assert.equal(tableExists(db, DEFAULT_TRACKING_TABLE), false);
    db.close();
  });

  it("is idempotent — re-running applies nothing new and does not duplicate", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    // Second run must not throw (e.g. CREATE TABLE projects again) or re-insert.
    runMigrations(db);

    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), [1]);
    db.close();
  });

  it("rejects an unsafe tracking table name", () => {
    const db = new Database(":memory:");
    assert.throws(
      () => runMigrations(db, { trackingTable: "_migrations; DROP TABLE projects" }),
      /Invalid trackingTable name/,
    );
    db.close();
  });
});
