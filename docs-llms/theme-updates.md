# Theme Update System

This document describes the theme update system that allows theme authors to distribute improvements to projects using their themes.

## Overview

The theme update system enables:

- **Theme authors** to publish new versions of their themes
- **Users** to receive and apply theme updates to their projects
- **Safe updates** that preserve user content and customizations

## Core Concepts

### Version Structure

Themes use a versioned folder structure:

```
themes/
  arch/
    theme.json          # Base version (e.g., 1.0.0)
    layout.liquid
    screenshot.png
    widgets/
    assets/
    templates/
    menus/
    snippets/
    updates/            # Version update folders (partial updates)
      1.1.0/
        theme.json      # Required, version must match folder name
        widgets/
          new-widget/
      1.2.0/
        theme.json
        assets/
          updated-file.css
    latest/             # Materialized snapshot (auto-built)
```

### Partial Updates (Delta Updates)

Each version folder in `updates/` contains **only the files that changed** in that version, not a complete theme copy. This makes authoring updates simple:

1. Create a new version folder (e.g., `1.1.0/`)
2. Add a `theme.json` with the matching version number
3. Add only the files that changed (new widgets, updated assets, etc.)
4. The system layers these on top of previous versions

### Materialized Snapshot (`latest/`)

The `latest/` folder is a **composed, ready-to-use snapshot** built by the system:

1. Start from the base version (root theme files)
2. Apply each version folder in `updates/` in semver order
3. For each version, copy its files over the previous state
4. Result: `latest/` contains the complete, up-to-date theme

**Key behaviors:**
- If a file exists in multiple versions, the **latest version wins**
- `latest/` is rebuilt when a theme author clicks "Update" on the Themes page
- Projects read theme files from `latest/` (or base if `latest/` doesn't exist)

## Update Eligibility

### Updatable Paths

These theme files can be updated in projects:

| Path | Behavior |
|------|----------|
| `layout.liquid` | Replaced with new version |
| `assets/` | Entire folder replaced |
| `widgets/` | Entire folder replaced |
| `snippets/` | Entire folder replaced |
| `theme.json` | **Merged** (see Settings Merge below) |
| `screenshot.png` | Replaced with new version |

### Protected Paths (Never Updated)

User content is never modified:

| Path | Reason |
|------|--------|
| `pages/` | User's page content |
| `uploads/` | User's media files |
| `collections/` | User's collection data (if present) |

### Add-New-Only Paths

These paths receive additions but preserve existing files:

| Path | Behavior |
|------|----------|
| `menus/` | New menus added, existing menus preserved |
| `templates/` | New templates added, existing templates preserved |

This allows theme authors to add new menus or page templates without overwriting user customizations.

## Theme Settings Merge

When updating `theme.json`, the system uses intelligent merging:

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
        { "id": "accent", "default": "#00ff00" }  // NEW setting
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
        { "id": "primary", "default": "#123456" },  // User changed this
        { "id": "secondary", "default": "#ff0000" },
        { "id": "old_color", "default": "#999999" }  // Removed by theme author
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
        { "id": "primary", "default": "#123456" },  // User value preserved
        { "id": "secondary", "default": "#ff0000" },
        { "id": "accent", "default": "#00ff00" }    // New setting added
        // old_color removed (not in new theme)
      ]
    }
  }
}
```

## User Workflow

### 1. Theme Author Publishes Update

1. Create version folder in `themes/{name}/updates/` (e.g., `1.2.0/`)
2. Add `theme.json` with matching version
3. Add changed files only
4. Go to Themes page in Widgetizer
5. Click "Update" button on the theme card
6. System builds `latest/` snapshot
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
  // ... other fields
}
```

- `theme`: Theme folder ID (unchanged)
- `themeVersion`: Currently installed theme version

**Note:** The `receiveThemeUpdates` toggle was removed. All projects can receive theme updates.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/themes` | Get all themes with `hasPendingUpdate` flag |
| `GET` | `/api/themes/:id/versions` | Get all versions for a theme |
| `POST` | `/api/themes/:id/update` | Build `latest/` for a single theme |
| `GET` | `/api/themes/update-count` | Get count of themes with pending updates |
| `GET` | `/api/projects/:id/theme-updates` | Check if project has theme update available |
| `POST` | `/api/projects/:id/theme-updates/apply` | Apply theme update to project |

## Implementation Files

### Frontend

- `src/pages/Themes.jsx` - Theme management UI with update buttons
- `src/stores/themeUpdateStore.js` - Zustand store for sidebar badge
- `src/queries/themeManager.js` - API client functions

### Backend

- `server/controllers/themeController.js` - Theme CRUD and snapshot building
- `server/services/themeUpdateService.js` - Project update logic and settings merge
- `server/utils/semver.js` - Version parsing and comparison

---

**See also:**

- [Theme Management](core-themes.md) - Themes page and upload functionality
- [Project Management](core-projects.md) - Project theme relationship
- [Theming Guide](theming.md) - Theme structure and development
