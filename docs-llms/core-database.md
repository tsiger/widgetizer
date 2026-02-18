# Database and Storage Architecture

This document explains Widgetizer's current hybrid persistence model:

- **SQLite** for metadata and relationships
- **Filesystem JSON/files** for page/menu/global content and uploaded binaries

---

## 1. Why Hybrid Storage

The project migrated from JSON-only metadata storage to SQLite to improve:

- atomic updates and concurrency safety
- relational queries and cascade behavior
- export/version bookkeeping
- startup migration reliability from legacy installs

Content files that benefit from direct file ownership and portability remain on disk.

---

## 2. SQLite Database

**Location**: `data/widgetizer.db`  
**Initialization**: `server/db/index.js`  
**Migrations**: `server/db/migrations.js`

Runtime DB settings:

- `journal_mode = WAL`
- `foreign_keys = ON`
- `busy_timeout = 5000`

### Tables (v1)

- `projects`
  - project metadata (`id`, `folder_name`, `name`, theme fields, timestamps)
- `app_settings`
  - key/value settings store (`activeProjectId`, app config)
- `media_files`
  - media file metadata for a project
- `media_sizes`
  - generated image variants per file (`thumb`, `small`, etc.)
- `media_usage`
  - where a media file is referenced (`used_in`)
- `exports`
  - export history rows per project/version

### Repository Layer

Controllers use repository modules instead of direct SQL:

- `server/db/repositories/projectRepository.js`
- `server/db/repositories/mediaRepository.js`
- `server/db/repositories/settingsRepository.js`
- `server/db/repositories/exportRepository.js`

---

## 3. Filesystem Storage (Still Active)

SQLite does **not** replace project content files. These remain file-based:

- `data/projects/<folderName>/pages/*.json`
- `data/projects/<folderName>/pages/global/header.json`
- `data/projects/<folderName>/pages/global/footer.json`
- `data/projects/<folderName>/menus/*.json`
- `data/projects/<folderName>/theme.json` (and theme assets/templates/widgets)
- `data/projects/<folderName>/uploads/images/*`
- `data/projects/<folderName>/uploads/videos/*`
- `data/projects/<folderName>/uploads/audios/*`

---

## 4. Controller Wrappers

Controller-level convenience functions that delegate to SQLite repositories:

- `readProjectsFile()` / `writeProjectsFile(data)` — project metadata
- `readMediaFile(projectId)` / `writeMediaFile(projectId, data)` — media metadata
- `readAppSettingsFile()` — application settings

---

## 5. Export/Import

Runtime metadata source is SQLite, but project ZIP workflows include serialized metadata:

- project export includes `uploads/media.json` in ZIP
- project import restores that media metadata into SQLite
- imported `uploads/media.json` file is removed from project disk after restoration

---

## 7. Data Ownership Summary

Use this as the quick rule:

- **SQLite owns metadata**: projects, media metadata/usage, app settings, export history
- **Filesystem owns content assets**: pages, menus, globals, themes, uploaded binaries

When updating docs or code paths, keep this boundary explicit to avoid stale JSON-era assumptions.

