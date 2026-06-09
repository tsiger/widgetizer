import Database from "better-sqlite3";
import fs from "fs-extra";
import { getDbPath, DATA_DIR } from "../config.js";
import { runMigrations } from "./migrations.js";

let db = null;

/**
 * Get the singleton database connection.
 * Creates and initializes the database on first call.
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
