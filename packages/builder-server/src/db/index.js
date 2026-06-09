import Database from "better-sqlite3";
import fs from "fs-extra";
import { getDbPath, DATA_DIR } from "../config.js";
import { runMigrations } from "./migrations.js";

let db = null;

/**
 * Inject the database connection the rest of builder-server should use.
 *
 * A shell (OSS web/electron, or hosted) calls this at startup with a factory
 * that returns an already-prepared connection (pragmas applied, migrations
 * run). Subsequent getDb() calls return it. When initDb is NOT called, getDb()
 * falls back to opening the default on-disk database — so existing callers and
 * tests are unaffected.
 *
 * @param {{ getConnection: () => import('better-sqlite3').Database }} options
 * @returns {import('better-sqlite3').Database}
 */
export function initDb({ getConnection } = {}) {
  if (typeof getConnection !== "function") {
    throw new Error("initDb requires a getConnection function");
  }
  if (db) return db;
  db = getConnection();
  return db;
}

/**
 * Get the singleton database connection.
 * Creates and initializes the database on first call (unless a connection was
 * already injected via initDb).
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {
  if (db) return db;

  fs.ensureDirSync(DATA_DIR);

  db = new Database(getDbPath());

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  runMigrations(db);

  return db;
}

/**
 * Close the database connection and reset the singleton.
 * Used in test teardown to avoid shared state between tests.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
