import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Minimal in-memory schema covering only the columns the local adapters read
// or write. Mirrors @widgetizer/builder-server's migration v1 but is kept inline
// so adapters-local tests don't depend on builder-server.
export function makeDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      folder_name TEXT NOT NULL UNIQUE,
      name TEXT
    );
    CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      output_dir TEXT,
      status TEXT NOT NULL DEFAULT 'success'
    );
  `);
  return db;
}

export function seedProject(db, { id, folderName }) {
  db.prepare("INSERT INTO projects (id, folder_name, name) VALUES (?, ?, ?)").run(
    id,
    folderName,
    id,
  );
}

export function setActiveProject(db, id) {
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES ('activeProjectId', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(JSON.stringify(id));
}

export function tmpDataRoot() {
  return mkdtempSync(path.join(tmpdir(), "wz-adapters-"));
}
