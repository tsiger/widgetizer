const migrations = [
  {
    version: 1,
    description: "Initial schema - projects, app_settings, media, exports",
    up(db) {
      db.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          folder_name TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          theme TEXT,
          theme_version TEXT,
          preset TEXT,
          receive_theme_updates INTEGER DEFAULT 0,
          site_url TEXT DEFAULT '',
          last_theme_update_at TEXT,
          last_theme_update_version TEXT,
          created TEXT NOT NULL,
          updated TEXT NOT NULL,
          user_id TEXT NOT NULL DEFAULT 'local',
          published_site_id TEXT DEFAULT NULL,
          published_url TEXT DEFAULT NULL,
          published_at TEXT DEFAULT NULL
        );

        CREATE INDEX idx_projects_user ON projects(user_id);
        CREATE UNIQUE INDEX idx_projects_folder_user ON projects(folder_name, user_id);

        CREATE TABLE app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE media_files (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          type TEXT NOT NULL,
          size INTEGER NOT NULL,
          uploaded TEXT NOT NULL,
          path TEXT NOT NULL,
          alt TEXT DEFAULT '',
          title TEXT DEFAULT '',
          width INTEGER,
          height INTEGER,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_media_project ON media_files(project_id);
        CREATE INDEX idx_media_path ON media_files(project_id, path);

        CREATE TABLE media_sizes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          media_file_id TEXT NOT NULL,
          size_name TEXT NOT NULL,
          path TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE,
          UNIQUE(media_file_id, size_name)
        );

        CREATE TABLE media_usage (
          media_file_id TEXT NOT NULL,
          used_in TEXT NOT NULL,
          FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE,
          PRIMARY KEY (media_file_id, used_in)
        );

        CREATE INDEX idx_media_usage_used_in ON media_usage(used_in);

        CREATE TABLE exports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          output_dir TEXT,
          status TEXT NOT NULL DEFAULT 'success',
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_exports_project ON exports(project_id);
        CREATE UNIQUE INDEX idx_exports_project_version ON exports(project_id, version);
      `);
    },
  },
];

/**
 * Run all pending migrations in order.
 * Each migration is wrapped in a transaction.
 * @param {import('better-sqlite3').Database} db
 */
export function runMigrations(db) {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = new Set(
    db.prepare("SELECT version FROM _migrations").all().map((row) => row.version),
  );

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    const runMigration = db.transaction(() => {
      migration.up(db);
      db.prepare("INSERT INTO _migrations (version, description) VALUES (?, ?)").run(
        migration.version,
        migration.description,
      );
    });

    runMigration();

    if (process.env.NODE_ENV !== "test") {
      console.log(`[DB] Applied migration v${migration.version}: ${migration.description}`);
    }
  }
}
