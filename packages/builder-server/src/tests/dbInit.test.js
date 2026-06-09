/**
 * DB injection test suite.
 *
 * Covers initDb() — the hook a shell uses to inject its own connection so the
 * same database is shared by controllers and the db-backed adapters.
 *
 * Run with: node --test packages/builder-server/src/tests/dbInit.test.js
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { initDb, getDb, closeDb } from "../db/index.js";

describe("initDb", () => {
  afterEach(() => closeDb());

  it("makes getDb() return the injected connection", () => {
    const injected = new Database(":memory:");
    const returned = initDb({ getConnection: () => injected });
    assert.equal(returned, injected);
    assert.equal(getDb(), injected);
  });

  it("is idempotent — a second call keeps the first connection", () => {
    const first = new Database(":memory:");
    const second = new Database(":memory:");
    initDb({ getConnection: () => first });
    const result = initDb({ getConnection: () => second });
    assert.equal(result, first);
    second.close();
  });

  it("throws without a getConnection factory", () => {
    assert.throws(() => initDb({}), /requires a getConnection/);
  });
});
