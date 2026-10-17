const TRACKING_TABLE = "_assistant_migrations";

const migrations = [
  {
    version: 1,
    description: "Per-site change generations",
    up(db) {
      db.exec(`
        CREATE TABLE assistant_site_generations (
          project_id TEXT PRIMARY KEY,
          assets INTEGER NOT NULL DEFAULT 0,
          theme INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    version: 2,
    description: "Assistant jobs, change generation, request outcomes",
    up(db) {
      db.exec(`
        CREATE TABLE assistant_jobs (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          session_id TEXT,
          client TEXT,
          summary TEXT NOT NULL,
          languages TEXT NOT NULL DEFAULT '[]',
          request_id TEXT,
          state TEXT NOT NULL,
          gen INTEGER NOT NULL DEFAULT 0,
          slot TEXT UNIQUE,
          operation TEXT,
          snapshot_id TEXT,
          end_fingerprint TEXT,
          normalised INTEGER NOT NULL DEFAULT 0,
          dirty INTEGER NOT NULL DEFAULT 0,
          intent TEXT,
          reason TEXT,
          error TEXT,
          receipt TEXT,
          created TEXT NOT NULL,
          updated TEXT NOT NULL,
          ended TEXT
        );
        CREATE INDEX idx_assistant_jobs_project ON assistant_jobs(project_id, state);

        CREATE TABLE assistant_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE assistant_requests (
          request_id TEXT PRIMARY KEY,
          tool TEXT NOT NULL,
          job_id TEXT,
          outcome TEXT NOT NULL,
          created TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 3,
    description: "What a job has changed so far",
    up(db) {
      db.exec("ALTER TABLE assistant_jobs ADD COLUMN impact TEXT");
    },
  },
  {
    version: 4,
    description: "The Allow/Cancel request a job is waiting on",
    up(db) {
      db.exec("ALTER TABLE assistant_jobs ADD COLUMN approval TEXT");
    },
  },
];

/** The assistant's own tables, versioned apart from the editor's migrations. */
export function migrateAssistantTables(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (version INTEGER PRIMARY KEY, description TEXT, applied_at TEXT DEFAULT (datetime('now')))`);
  const applied = new Set(db.prepare(`SELECT version FROM ${TRACKING_TABLE}`).all().map((row) => row.version));
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.transaction(() => {
      migration.up(db);
      db.prepare(`INSERT INTO ${TRACKING_TABLE} (version, description) VALUES (?, ?)`).run(migration.version, migration.description);
    })();
  }
}
