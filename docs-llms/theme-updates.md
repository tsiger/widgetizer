# Theme Update System

This document describes the theme update system that allows theme authors to distribute improvements to projects using their themes.

## Overview

The theme update system enables:

- **Theme authors** to publish new versions of their themes
- **Users** to receive and apply theme updates to their projects
- **Safe updates** that preserve user content and customizations

## Core Concepts

### Two-Directory Architecture

Themes exist in two locations with distinct roles:

1. **Seed directory** (`themes/{name}/`) — The authored source that ships with the app. Checked into git. Read-only at runtime; never modified by the system.
2. **User data directory** (`data/themes/{name}/`) — The working copy where all runtime operations happen. Gitignored. Provisioned by copying the seed on first launch.

The `latest/` snapshot is only built in the **user data directory** — the seed stays clean (no generated files in source).

When `buildLatestSnapshot` runs, it first syncs any `updates/` folders from the seed into the user data directory, then builds `latest/` there.

> **Note.** Theme-update reads and writes go through direct `fs-extra` / `path` calls (the controller and service both `import fs from "fs-extra"`), **not** the scope-first storage adapter — this subsystem operates on the global `themes/` and `data/themes/` trees rather than per-project, scoped content. Source-directory and metadata resolution (`getThemeSourceDir`, `readThemeSourceMetadata`) is gated by a 5-second cache (`THEME_SOURCE_CACHE_TTL_MS = 5000` in `themeController.js`), so a freshly built `latest/` may take up to ~5s to become visible to readers; `buildLatestSnapshot` calls `invalidateThemeSourceCache(themeId)` to clear it eagerly.

### Version Structure

Theme authors create update folders in the **seed** directory:

```
themes/                          # Seed directory (source, git-tracked)
  arch/
    theme.json                   # Base version (e.g., 1.0.0)
    layout.liquid
    screenshot.png
    widgets/
    assets/
    locales/
    templates/
    menus/
    snippets/
    collection-types/
    updates/                     # Version update folders (partial updates)
      1.1.0/
        theme.json               # Required, version must match folder name
        widgets/
          new-widget/
      1.2.0/
        theme.json
        assets/
          updated-file.css
```

At runtime, the system builds a composed snapshot in the **user data** directory:

```
data/themes/                     # User data directory (runtime, gitignored)
  arch/
    theme.json                   # Copied from seed
    layout.liquid
    widgets/
    assets/
    locales/
    updates/                     # Synced from seed + any uploaded updates
      1.1.0/
      1.2.0/
    latest/                      # Materialized snapshot (auto-built here)
```

### Partial Updates (Delta Updates)

Each version folder in `updates/` contains **only the files that changed** in that version, not a complete theme copy. This makes authoring updates simple:

1. Create a new version folder (e.g., `1.1.0/`)
2. Add a `theme.json` with the matching version number
3. Add only the files that changed (new widgets, updated assets, etc.)
4. The system layers these on top of previous versions

### File Deletions

To **remove** files from previous versions, add a `deleted/` folder to your version update (in the seed). The structure inside `deleted/` mirrors the paths you want to remove:

```
themes/arch/updates/             # In the seed directory
  1.2.0/
    theme.json
    deleted/                     # Files/folders to remove
      widgets/
        deprecated-widget/       # This widget will be deleted from latest/
      assets/
        old-style.css            # This file will be deleted from latest/
```

**How it works:**

- Files inside `deleted/` are **placeholders** that mark specific files for deletion
- **Empty directories** in `deleted/` mean "delete this entire folder"
- **Non-empty directories** are just path containers (e.g., `deleted/assets/` won't delete `assets/`, only the files inside)

**Deletion eligibility:**

| Path            | Can be deleted? | Notes                  |
| --------------- | --------------- | ---------------------- |
| `assets/`       | ✅ Yes          | Theme infrastructure   |
| `widgets/`      | ✅ Yes          | Theme infrastructure   |
| `snippets/`     | ✅ Yes          | Theme infrastructure   |
| `locales/`      | ✅ Yes          | Theme infrastructure   |
| `layout.liquid` | ✅ Yes          | Theme infrastructure   |
| `templates/`    | ❌ No           | User content, add-only |
| `menus/`        | ❌ No           | User content, add-only |
| `pages/`        | ❌ No           | Protected user content |
| `uploads/`      | ❌ No           | Protected user content |

### Materialized Snapshot (`latest/`)

The `latest/` folder is a **composed, ready-to-use snapshot** built in `data/themes/{name}/latest/` (never in the seed directory):

1. Sync any new `updates/` folders from the seed into `data/themes/{name}/updates/`
2. Start from the base version (root theme files)
3. Apply each version folder in `updates/` in semver order
4. For each version, copy its files over the previous state
5. For each version, process `deleted/` folder removals
6. Result: `latest/` contains the complete, up-to-date theme

**Key behaviors:**

- If a file exists in multiple versions, the **latest version wins**
- `latest/` is rebuilt when a theme author clicks "Update" on the Themes page
- Projects read theme files from `latest/` (or base if `latest/` doesn't exist). `getThemeSourceDir` returns `latest/` only when `latest/theme.json` exists; otherwise it falls back to the root theme — and this resolution is subject to the 5s source cache described above.
- The seed directory (`themes/{name}/`) is never modified — only the user data directory is

## Update Eligibility

### Updatable Paths

These theme files can be updated in projects (the `UPDATABLE_PATHS` list in `themeUpdateService.js`):

| Path                | Behavior                              |
| ------------------- | ------------------------------------- |
| `layout.liquid`     | Replaced with new version             |
| `assets/`           | Entire folder replaced                |
| `widgets/`          | Entire folder replaced                |
| `snippets/`         | Entire folder replaced                |
| `locales/`          | Entire folder replaced                |
| `collection-types/` | Entire folder replaced (theme-owned)  |
| `theme.json`        | **Merged** (see Settings Merge below) |
| `screenshot.png`    | Replaced with new version             |

`collection-types/` defines the schema/layout for collections and is **theme-owned**, so it is replaced wholesale on update. The collection **item data** under `data/projects/<folder>/collections/<type>/` is user content and stays protected — it is never touched by a theme update. See [Collections](core-collections.md).

### Protected Paths (Never Updated)

User content is never modified:

| Path            | Reason                          |
| --------------- | ------------------------------- |
| `pages/`        | User's page content             |
| `uploads/`      | User's media files              |
| `collections/`  | User's collection item data     |

### Add-New-Only Paths

These paths receive additions but preserve existing files:

| Path         | Behavior                                          |
| ------------ | ------------------------------------------------- |
| `menus/`     | New menus added, existing menus preserved         |
| `templates/` | New templates added, existing templates preserved |

This allows theme authors to add new menus or page templates without overwriting user customizations.

`locales/` belongs to the project-owned theme package. The editor locale API reads `data/projects/<folder>/locales/`, so locale changes only affect an existing project after that project applies a theme update (or is recreated).

## Theme Settings Merge

When updating `theme.json`, the system uses intelligent merging (`mergeThemeSettings` in `themeUpdateService.js`):

### Rules

1. **New settings** from the theme are **added** to the project
2. **Existing user values** are **preserved** (not overwritten)
3. **Removed settings** (deleted by theme author) are **removed** from the project

### Example

**Theme's new `theme.json`:**

```json
{
  "settings": {
    "global": {
      "colors": [
        { "id": "primary", "default": "#0000ff" },
        { "id": "secondary", "default": "#ff0000" },
        { "id": "accent", "default": "#00ff00" } // NEW setting
      ]
    }
  }
}
```

**User's current `theme.json`:**

```json
{
  "settings": {
    "global": {
      "colors": [
        { "id": "primary", "default": "#123456" }, // User changed this
        { "id": "secondary", "default": "#ff0000" },
        { "id": "old_color", "default": "#999999" } // Removed by theme author
      ]
    }
  }
}
```

**Result after merge:**

```json
{
  "settings": {
    "global": {
      "colors": [
        { "id": "primary", "default": "#123456" }, // User value preserved
        { "id": "secondary", "default": "#ff0000" },
        { "id": "accent", "default": "#00ff00" } // New setting added
        // old_color removed (not in new theme)
      ]
    }
  }
}
```

## User Workflow

### 1. Theme Author Publishes Update

1. Create version folder in the **seed** directory: `themes/{name}/updates/` (e.g., `1.2.0/`)
2. Add `theme.json` with matching version
3. Add changed files only
4. Go to Themes page in Widgetizer
5. Click "Update" button on the theme card
6. System syncs seed updates into `data/themes/{name}/updates/` and builds `latest/` there
7. Zip and distribute the entire theme folder (including `updates/`)

### Distributing Theme Updates

Theme authors can distribute updates by zipping the entire theme folder:

```
arch.zip
  arch/
    theme.json          # Base version (e.g., 1.0.0)
    layout.liquid
    ...
    updates/
      1.1.0/
      1.2.0/
```

When a user uploads this zip:

- **New installation**: Entire theme is installed, `latest/` is built automatically
- **Existing theme**: Only new update versions are imported (existing versions are skipped)
- **Up to date**: If all versions already exist, upload is rejected with a clear message

Upload validation details (zip structure checks, `theme.json` requirements, version handling) live in [Theme Management](core-themes.md).

**Note**: The `latest/` folder in the zip (if present) is ignored; it's always rebuilt from scratch.

### 2. User Receives Update Notification

1. Sidebar shows badge with count of themes having updates
2. User visits Themes page
3. Theme card shows "Update available: v1.2.0"
4. User clicks "Update" to build `latest/`

### 3. User Applies Update to Projects

After the theme is updated:

1. Projects page shows update indicator (arrow icon) next to affected projects
2. User edits the project
3. User clicks "Apply Theme Update" (or similar action)
4. System copies updated files, merges settings
5. Project's `themeVersion` is updated
6. Frontend invalidates the cached projects list so refreshed project reads immediately show the new version and cleared update badge

## Version Validation

The system enforces strict validation when building `latest/`:

### Requirements

1. **`theme.json` required**: Every version folder must contain a `theme.json`
2. **Version match**: The version in `theme.json` must match the folder name
3. **Valid semver**: Version must be valid semver format (x.y.z)

### Error Handling

If validation fails:

- The build is aborted
- An error message is shown to the user
- Example: "Theme 'arch' has version mismatch: folder '1.1.0' has theme.json version '1.0.0'"

## Project Metadata

Projects track theme update information:

```json
{
  "id": "project-uuid",
  "name": "My Project",
  "theme": "arch",
  "themeVersion": "1.0.0",
  "receiveThemeUpdates": true
  // ... other fields
}
```

- `theme`: Theme folder ID (unchanged)
- `themeVersion`: Currently installed theme version
- `receiveThemeUpdates`: Per-project preference controlled by `PUT /api/projects/:id/theme-updates` (`enabled: boolean`)

## API Endpoints

| Method | Endpoint                                 | Description                                 |
| ------ | ---------------------------------------- | ------------------------------------------- |
| `GET`  | `/api/themes`                            | Get all themes with `hasPendingUpdate` flag |
| `GET`  | `/api/themes/:id/versions`               | Get all versions for a theme                |
| `POST` | `/api/themes/:id/update`                 | Build `latest/` for a single theme          |
| `GET`  | `/api/themes/update-count`               | Get count of themes with pending updates    |
| `GET`  | `/api/projects/:id/theme-updates/status` | Check if project has theme update available |
| `PUT`  | `/api/projects/:id/theme-updates`        | Toggle project `receiveThemeUpdates` preference |
| `POST` | `/api/projects/:id/theme-updates/apply`  | Apply theme update to project               |

## Implementation Files

### Backend (`@widgetizer/builder-server`)

- `packages/builder-server/src/controllers/themeController.js` — Theme CRUD, `latest/` snapshot building (`buildLatestSnapshot`), source resolution, and the 5s source cache
- `packages/builder-server/src/services/themeUpdateService.js` — Project update logic, `UPDATABLE_PATHS`, and `mergeThemeSettings`
- `packages/builder-server/src/utils/semver.js` — Version parsing and comparison
- `packages/builder-server/src/utils/updateStatus.js` — Shared update-status shaping on top of semver comparison
- `packages/builder-server/src/routes/themes.js`, `packages/builder-server/src/routes/projects.js` — REST routes listed above

### Frontend

- `app/src/pages/Themes.jsx` — Theme management UI with update buttons (admin shell)
- `packages/editor-ui/src/stores/themeUpdateStore.js` — Zustand store for sidebar badge
- `packages/editor-ui/src/queries/themeManager.js` — API client functions

---

**See also:**

- [Theme Management](core-themes.md) — Themes page, upload, and upload-validation details
- [Project Management](core-projects.md) — Project theme relationship
- [Collections](core-collections.md) — `collection-types/` vs. protected `collections/` item data
- [Theming Guide](theming.md) — Theme structure and development
- [Packages & Adapters](core-packages.md) — Package boundaries, adapters, scope-first contract
