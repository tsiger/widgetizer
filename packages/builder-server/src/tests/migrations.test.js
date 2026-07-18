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

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

// Every version this branch's runner should converge a database to.
const ALL_VERSIONS = [1, 2, 3, 4, 5];

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
    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), ALL_VERSIONS);
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
    assert.deepEqual(appliedVersions(db, "_widgetizer_migrations"), ALL_VERSIONS);
    assert.equal(tableExists(db, DEFAULT_TRACKING_TABLE), false);
    db.close();
  });

  it("is idempotent — re-running applies nothing new and does not duplicate", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    // Second run must not throw (e.g. CREATE TABLE projects again) or re-insert.
    runMigrations(db);

    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), ALL_VERSIONS);
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

  it("a fresh database ends up with both owner_id and caption columns", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    assert.ok(columnExists(db, "projects", "owner_id"), "projects.owner_id should exist");
    assert.ok(columnExists(db, "media_files", "caption"), "media_files.caption should exist");
    db.close();
  });

  it("v2 adds owner_id to projects, defaulting to 'default'", () => {
    const db = new Database(":memory:");
    runMigrations(db);

    db.prepare(
      "INSERT INTO projects (id, folder_name, name, created, updated) VALUES ('p1','f1','P1','t','t')",
    ).run();
    const row = db.prepare("SELECT owner_id FROM projects WHERE id = 'p1'").get();
    assert.equal(row.owner_id, "default");
    db.close();
  });

  it("upgrade from v1 preserves existing rows, backfilling owner_id = 'default' and adding caption", () => {
    // Simulate a v1 database: full v1 schema with v1 recorded as applied and a
    // pre-existing row. (media_files must exist because v3 alters it — v1 always
    // creates it alongside projects.)
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, folder_name TEXT NOT NULL, name TEXT);
      CREATE TABLE media_files (id TEXT PRIMARY KEY, project_id TEXT, alt TEXT, title TEXT);
      CREATE TABLE _migrations (version INTEGER PRIMARY KEY, description TEXT, applied_at TEXT);
    `);
    db.prepare("INSERT INTO _migrations (version, description) VALUES (1, 'init')").run();
    db.prepare("INSERT INTO projects (id, folder_name, name) VALUES ('old','of','Old')").run();

    runMigrations(db); // applies v2 through v5

    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), ALL_VERSIONS);
    const row = db.prepare("SELECT owner_id FROM projects WHERE id = 'old'").get();
    assert.equal(row.owner_id, "default");
    assert.ok(columnExists(db, "media_files", "caption"), "caption should be added on upgrade");
    db.close();
  });

  it("database with caption recorded at v2 is backfilled with owner_id via v4", () => {
    // Such a database has {1,2} recorded with the caption column present but
    // owner_id missing, so v4 must backfill owner_id.
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, folder_name TEXT NOT NULL, name TEXT);
      CREATE TABLE media_files (id TEXT PRIMARY KEY, project_id TEXT, alt TEXT, title TEXT, caption TEXT DEFAULT '');
      CREATE TABLE _migrations (version INTEGER PRIMARY KEY, description TEXT, applied_at TEXT);
    `);
    db.prepare("INSERT INTO _migrations (version, description) VALUES (1, 'init'), (2, 'caption')").run();
    db.prepare("INSERT INTO projects (id, folder_name, name) VALUES ('m','mf','M')").run();

    assert.equal(columnExists(db, "projects", "owner_id"), false, "precondition: owner_id missing");

    runMigrations(db); // should apply v3 (caption guard skips), v4 (adds owner_id), and v5

    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), ALL_VERSIONS);
    assert.ok(columnExists(db, "projects", "owner_id"), "owner_id should be backfilled");
    const row = db.prepare("SELECT owner_id FROM projects WHERE id = 'm'").get();
    assert.equal(row.owner_id, "default");
    // caption already present — v3 must not have failed trying to re-add it.
    assert.ok(columnExists(db, "media_files", "caption"));
    db.close();
  });

  it("this-branch-history database (v2 = owner_id) gets caption via v3", () => {
    // A database that already went through this branch's v2 has owner_id but no
    // caption. v3 must add caption; v4 must be a no-op (owner_id already there).
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY, folder_name TEXT NOT NULL, name TEXT, owner_id TEXT NOT NULL DEFAULT 'default');
      CREATE TABLE media_files (id TEXT PRIMARY KEY, project_id TEXT, alt TEXT, title TEXT);
      CREATE TABLE _migrations (version INTEGER PRIMARY KEY, description TEXT, applied_at TEXT);
    `);
    db.prepare("INSERT INTO _migrations (version, description) VALUES (1, 'init'), (2, 'owner_id')").run();

    assert.equal(columnExists(db, "media_files", "caption"), false, "precondition: caption missing");

    runMigrations(db); // should apply v3 (adds caption), v4 (owner_id guard skips), and v5

    assert.deepEqual(appliedVersions(db, DEFAULT_TRACKING_TABLE), ALL_VERSIONS);
    assert.ok(columnExists(db, "media_files", "caption"), "caption should be added");
    db.close();
  });
});
