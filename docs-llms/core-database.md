# Database and Storage Architecture

This document explains Widgetizer's current hybrid persistence model:

- **SQLite** for metadata and relationships
- **Filesystem JSON/files** for page/menu/global/collection content and uploaded binaries

The backend (`@widgetizer/builder-server`) is **adapter-agnostic and scope-first** for storage/asset/limits calls: those calls take a `scope` (`{ actor, projectId, folderName }`) and use injected adapters. SQLite access goes through the `initDb`/`getDb` singleton seam described below; if no shell injects a connection, `getDb()` opens the OSS default DB. Some export, theme, and project-lifecycle paths are still direct filesystem operations and are documented as path-based exceptions in the subsystem docs. For the adapter contracts, dependency injection, `Scope`, and `LIMIT_KEYS`, see `core-packages.md`.

---

## 1. Why Hybrid Storage

SQLite backs metadata storage to provide:

- atomic updates and concurrency safety
- relational queries and cascade behavior
- export/version bookkeeping
- reliable startup migrations

Content files that benefit from direct file ownership and portability remain on disk.

---

## 2. SQLite Database

**Location**: `data/widgetizer.db` (default on-disk path)
**Connection / init**: `packages/builder-server/src/db/index.js`
**Migrations**: `packages/builder-server/src/db/migrations.js`

### Connection & DI

builder-server holds a single DB connection behind two entry points in `db/index.js`:

- **`initDb({ getConnection })`** — a shell (OSS web/electron, or hosted) calls this at startup with a factory that returns an already-prepared connection (pragmas applied, migrations run). The connection is stored as the singleton that the rest of builder-server uses via `getDb()`. There is an ordering guard: if a different connection is already open when `initDb` runs, it throws (`call initDb before any getDb()`) so a stray pre-init `getDb()` can't silently shadow the shared connection. Re-passing the same connection is idempotent.
- **`getDb()`** — returns the injected singleton. When `initDb` was **not** called, it falls back to opening the default on-disk database (`getDbPath()`), applying the pragmas, and running migrations itself — so existing OSS callers and tests work without any explicit init step.
- **`closeDb()`** — closes the connection and resets the singleton (used in test teardown).

Pragmas applied to the fallback connection:

- `journal_mode = WAL`
- `foreign_keys = ON`
- `busy_timeout = 5000`

### Migration history

Migrations live in `db/migrations.js` as an ordered list, each wrapped in a transaction and recorded in a tracking table. Applied versions are read once and any unrecorded migration runs in order:

- **v1 — Initial schema.** Creates `projects`, `app_settings`, `media_files` (+ `idx_media_project`, `idx_media_path`), `media_sizes`, `media_usage` (+ `idx_media_usage_used_in`), and `exports` (+ `idx_exports_project`, unique `idx_exports_project_version`).
- **v2 — Add `owner_id` to `projects`.** `ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'default'` plus `idx_projects_owner_id`. The value is an opaque owner string (no FK to a users table): OSS sets `'default'`, hosted sets the Clerk user id.
- **v3 — Add `caption` to `media_files`.** Guarded `ALTER` (`columnExists` check), so it is a no-op on databases that already have the column.
- **v4 — Backfill `projects.owner_id`.** Forward-only, idempotent: ensures `owner_id` (and its index, via `CREATE INDEX IF NOT EXISTS`) is present on every database.

> The guarded `ALTER`s and the v4 backfill keep databases from different histories convergent on the same final schema.

**Migration tracking table** — `runMigrations(db, { trackingTable })` creates `CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, description TEXT, applied_at TEXT DEFAULT (datetime('now')))` and inserts a row per applied migration. The default name is `_migrations` (exported as `DEFAULT_TRACKING_TABLE`); hosted may pass a namespaced name (e.g. `_widgetizer_migrations`) when sharing a database with its own migration system. The name is validated as a plain SQL identifier before interpolation.

### Repository Layer

Controllers and services use repository modules instead of direct SQL:

- `packages/builder-server/src/db/repositories/projectRepository.js`
- `packages/builder-server/src/db/repositories/mediaRepository.js`
- `packages/builder-server/src/db/repositories/settingsRepository.js`
- `packages/builder-server/src/db/repositories/exportRepository.js`

Media usage tracking is coordinated by `packages/builder-server/src/services/mediaUsageService.js` on top of `mediaRepository`.

---

## 3. Filesystem Storage (Still Active)

SQLite does **not** replace project content files. Most small project-content files are accessed through the storage adapter with a `scope`; uploaded binaries go through the asset storage adapter; and a few export/theme/project-lifecycle flows still use explicit filesystem paths:

- `data/projects/<folderName>/pages/*.json`
- `data/projects/<folderName>/pages/global/header.json`
- `data/projects/<folderName>/pages/global/footer.json`
- `data/projects/<folderName>/menus/*.json`
- `data/projects/<folderName>/collections/<type>/<slug>.json` (one file per collection item — see `core-collections.md`)
- `data/projects/<folderName>/theme.json` (and theme assets/templates/widgets)
- `data/projects/<folderName>/uploads/images/*`

---

## 4. Repository Access

Controllers and services call repository/wrapper functions directly:

- `getProjectById()`, `createProject()`, `updateProject()`, `deleteProject()` — project metadata (`db/repositories/projectRepository.js`)
- `readProjectsData()` / `writeProjectsData()` — bulk read/write (`projectRepository.js`, tests only)
- `readMediaFile(projectId)` — media metadata (`services/mediaService.js`)
- `writeMediaFile(projectId, data)` — media metadata wrapper (`controllers/mediaController.js`)
- `readAppSettingsFile()` — application settings wrapper (`controllers/appSettingsController.js`)

---

## 5. Export/Import

Runtime metadata lives in SQLite, but project ZIP workflows serialize media metadata into the archive (`uploads/media.json`) and restore it into SQLite on import. For the full export/import pipeline, see `core-export.md`.

---

## 6. Data Ownership Summary

Use this as the quick rule:

- **SQLite owns metadata**: projects, media metadata/usage, app settings, export history
- **Filesystem owns content assets**: pages, menus, globals, collection items, themes, uploaded binaries

When updating docs or code paths, keep this boundary explicit to avoid stale JSON-era assumptions.
