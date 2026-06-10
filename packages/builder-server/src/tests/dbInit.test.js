/**
 * DB injection test suite.
 *
 * Covers initDb() — the hook a shell uses to inject its own connection so the
 * same database is shared by controllers and the db-backed adapters — including
 * the ordering guard (F7): injecting a different connection after one is already
 * open throws, instead of silently shadowing it.
 *
 * Run with: node --test packages/builder-server/src/tests/dbInit.test.js
 */

import { describe, it, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";
import fs from "fs-extra";
import Database from "better-sqlite3";

// Isolated DATA_ROOT so the getDb() fallback test never touches real data.
const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-dbinit-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { initDb, getDb, closeDb } = await import("../db/index.js");

describe("initDb", () => {
  afterEach(() => closeDb());
  after(async () => {
    await fs.remove(TEST_ROOT);
  });

  it("makes getDb() return the injected connection", () => {
    const injected = new Database(":memory:");
    const returned = initDb({ getConnection: () => injected });
    assert.equal(returned, injected);
    assert.equal(getDb(), injected);
  });

  it("is idempotent when re-passed the same connection", () => {
    const conn = new Database(":memory:");
    initDb({ getConnection: () => conn });
    const result = initDb({ getConnection: () => conn });
    assert.equal(result, conn);
  });

  it("throws if a different connection is injected after one is open", () => {
    const first = new Database(":memory:");
    const second = new Database(":memory:");
    initDb({ getConnection: () => first });
    assert.throws(() => initDb({ getConnection: () => second }), /already opened/);
    second.close();
  });

  it("throws if getDb() opened a fallback connection before initDb", () => {
    // The exact F7 scenario: a stray getDb() opens the on-disk fallback, then a
    // shell tries to inject the shared connection — must fail loud, not shadow.
    const fallback = getDb();
    assert.ok(fallback);
    const injected = new Database(":memory:");
    assert.throws(() => initDb({ getConnection: () => injected }), /already opened/);
    injected.close();
  });

  it("throws without a getConnection factory", () => {
    assert.throws(() => initDb({}), /requires a getConnection/);
  });
});
