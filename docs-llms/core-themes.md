# Themes

This document explains the "Themes" management page — the user interface and CRUD routes for viewing, uploading, updating, and deleting themes — plus the sidebar update badge and theme locale / site-icon plumbing. The deep mechanics of theme **versioning/updates** and **presets** are summarized here and covered in full by [Theme Updates](theme-updates.md) and [Theme Presets](theme-presets.md).

In the application's architecture, a "Theme" is the core concept for styling and layout. After the workspace refactor, the Themes page lives in the OSS admin shell (`app/src/`) rather than inside the editor workspace.

## 1. Overview

Themes are structured directories that define the layout, styles, and functionality of the application. Runtime theme operations use `data/themes/`. In packaged Electron builds, default themes are seeded from `app.asar.unpacked/themes/` into the themes directory on first access. Each theme contains:

- `theme.json`: Theme metadata and configuration.
- `screenshot.png`: A 1280x720 preview image of the theme, displayed on the card in the Themes UI.

### Theme Directory Structure

A theme directory carries its authored content plus two system-managed areas — `updates/` (per-version partial update folders) and `latest/` (a materialized snapshot composed from the base version plus all updates in semver order). An optional `presets/` directory holds named theme variants used only at project creation:

```
themes/
  arch/
    theme.json          # Base version (e.g., 1.0.0)
    layout.liquid
    screenshot.png
    widgets/
    assets/
    locales/
    templates/
    menus/
    snippets/
    collection-types/
    updates/            # Per-version partial update folders — see theme-updates.md
    latest/             # Materialized snapshot (system-built) — see theme-updates.md
    presets/            # Optional named variants — see theme-presets.md
```

- **Versioning (`updates/` + `latest/`):** the `latest/` folder is built by composing the base version with all `updates/<version>/` folders in semver order. The full validation and composition rules live in [Theme Updates](theme-updates.md).
- **Presets (`presets/`):** optional; provides named variants that can override settings, templates, menus, collections, and preset media. Presets are applied only at project creation time. See [Theme Presets](theme-presets.md) for the registry format and resolution rules.

## 2. Frontend Implementation (`app/src/pages/Themes.jsx`)

The frontend component provides a clean interface for theme management.

### Route Context

- Themes lives at `/themes` inside the admin shell (`ProjectPickerLayout`).
- It can be opened without an active project.
- If an active project exists, the page uses it to mark that project's theme card as active.

### Key Features

- **Theme Grid**: Displays all available themes in a responsive grid layout.
- **Upload Functionality**: Drag-and-drop interface for uploading new theme ZIP files.
- **Active Theme Indicator**: Visual indication of which theme is currently active for the current active project.
- **Update Indicators**: Shows when themes have pending updates available.
- **Per-Theme Update Buttons**: Allows updating individual themes (builds the `latest/` snapshot).
- **Theme Deletion**: Three-dot menu on each card with "Delete"; when a theme is used by one or more projects, the delete action is disabled up front and the UI shows that the theme is in use.
- **Localization**: Fully integrated with `react-i18next` for all user-facing text.

### Displaying Themes

The component fetches themes on mount and displays them as cards. Each card shows:

- Theme screenshot
- Theme name (human-readable from `theme.json`)
- Current version
- Author information
- Widget count
- Active status (if applicable)
- **Update available indicator** (if newer versions exist in `updates/`)

### Theme Update Flow (page-level)

When a theme has pending updates (`hasPendingUpdate: true`):

1. The theme card displays "Update available: vX.Y.Z" message.
2. User clicks the "Update" button on the theme card.
3. System calls `buildLatestSnapshot()` to compose the `latest/` folder (mechanics in [Theme Updates](theme-updates.md)).
4. Theme card updates to show the new version.
5. Sidebar badge decrements (via `themeUpdateStore`).
6. Projects using this theme now show "Update available" indicator.

### State Management

The component manages local state for:

- `themes`: Array of available themes (including `hasPendingUpdate` and `themeName`)
- `loading`: Loading state for initial theme fetch
- `updatingThemeId`: Which theme is currently being updated
- Upload status and progress
- `openMenuId`: Which theme card's overflow menu is currently open

**Global State:**

- `useThemeUpdateStore`: Zustand store for sidebar badge count
  - `updateCount`: Number of themes with pending updates
  - `fetchUpdateCount()`: Refreshes the count from API
- `useProjectStore`: Supplies the current active project so the UI can highlight the active theme

### Upload Process

When a user uploads a ZIP file:

1. The file is validated on the client side.
2. Uploaded via `uploadThemeZip()` utility function.
3. Server processes and extracts the theme.
4. Local state updates to show the new theme immediately.
5. Success/error feedback via toast notifications.

## 3. Backend Implementation

The backend handles listing themes, processing uploads, deletion, and triggering the per-theme snapshot build.

> **Note.** `themeController` is intentionally **path-based**, not scope-first: themes are global installed assets under `data/themes/` (resolved via `getThemesDir()` + `path.join`), not per-project scoped storage. This is a deliberate exception to the scope-first storage rule documented in [Core Packages](core-packages.md).

### API Routes (`packages/builder-server/src/routes/themes.js`)

| Method | Endpoint | Middleware | Controller Function | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/themes` |  | `getAllThemes` | Gets metadata for all installed themes with update status. |
| `GET` | `/api/themes/update-count` |  | `getThemeUpdateCount` | Gets count of themes with pending updates. |
| `GET` | `/api/themes/:id` |  | `getTheme` | Gets full metadata for one theme. |
| `GET` | `/api/themes/:id/widgets` |  | `getThemeWidgets` | Gets widget schemas for a theme. |
| `GET` | `/api/themes/:id/templates` |  | `getThemeTemplates` | Gets templates for a theme. |
| `GET` | `/api/themes/:id/versions` |  | `getThemeVersionsHandler` | Gets all available versions for a theme. |
| `GET` | `/api/themes/:id/presets` |  | `getThemePresets` | Gets all presets for a theme (names, descriptions, screenshots). |
| `POST` | `/api/themes/:id/update` |  | `updateTheme` | Builds `latest/` snapshot for a single theme. |
| `GET` | `/api/themes/project/:projectId` | `resolveActiveProject` | `getProjectThemeSettings` | Gets a project's `theme.json` settings. |
| `POST` | `/api/themes/project/:projectId` | `resolveActiveProject` | `saveProjectThemeSettings` | Saves a project's `theme.json` settings. |
| `GET` | `/api/themes/project/:projectId/locales/:lang` | `resolveActiveProject` | `getProjectThemeLocale` | Gets a project's theme locale strings for a language. |
| `POST` | `/api/themes/upload` | `handleThemeUpload` | `uploadTheme` | Handles upload and extraction of a theme ZIP (new theme or updates). |
| `DELETE` | `/api/themes/:id` |  | `deleteTheme` | Deletes a theme. Returns 409 if theme is used by any project. |

The router also applies `standardJsonParser` to all theme routes.

### Controller Logic (`packages/builder-server/src/controllers/themeController.js`)

#### Theme Listing

- `getAllThemes`: Returns all themes with enriched metadata:
  - `id`: Theme folder name
  - `name`: Human-readable name from `theme.json`
  - `version`: Current source version (from `latest/` or base)
  - `author`, `description`, `widgets`: Standard metadata
  - `presets`: Number of presets available (from `presets/presets.json`, 0 if none)
  - `hasPendingUpdate`: Boolean indicating if newer versions exist in `updates/`
  - `latestAvailableVersion`: Newest version available in `updates/`
  - `projectsUsingTheme` / `projectsUsingThemeCount`: Which projects reference the theme, so the UI can disable Delete before the user clicks.

#### Theme Upload

- `uploadTheme`: Validates and installs new theme ZIPs with comprehensive checks:
  - Validates ZIP structure and required files
  - Ensures `theme.json`, `layout.liquid`, `screenshot.png` exist
  - Verifies `assets/`, `templates/`, `widgets/` directories
  - Supports importing new update versions for existing themes when base versions match

#### Theme Deletion

- `deleteTheme`: Removes the theme directory from the filesystem. Before deletion, checks if any project metadata row in SQLite references this theme; if so, returns 409 with a message that the theme is in use. (`getAllThemes` surfaces the same usage data so the frontend can disable the action up front.)

#### Theme Presets (summary)

- `getThemePresets(req, res)`: Reads `presets/presets.json` for a theme and returns the list of presets, enriched with `isDefault` and `hasScreenshot` flags. Returns an empty array for themes without presets, or a 404 for nonexistent themes.
- `resolvePresetPaths(themeId, presetId)`: Returns `{ templatesDir, menusDir, settingsOverrides, collectionsDir, mediaDir }` with per-key fallback to the theme root, and is called by `projectController.createProject()` during project creation. Full fallback rules and the preset file format are documented in [Theme Presets](theme-presets.md).

#### Theme Updates (summary)

The per-theme snapshot build (`buildLatestSnapshot`), source-dir resolution (`getThemeSourceDir`), pending-update detection (`themeHasPendingUpdates`), and the project-level apply flow all live in [Theme Updates](theme-updates.md). The Themes page only triggers the per-theme `latest/` build via `POST /api/themes/:id/update`; applying an update to a project is a separate flow surfaced elsewhere.

### Version Utilities (`packages/builder-server/src/utils/semver.js`)

- `parseVersion(str)`: Parses "x.y.z" into `{ major, minor, patch }`
- `isValidVersion(str)`: Validates semver format
- `compareVersions(a, b)`: Numeric comparison for sorting
- `sortVersions(versions)`: Sorts version strings ascending
- `getLatestVersion(versions)`: Returns highest version
- `isNewerVersion(current, candidate)`: Checks if candidate > current

### Update Status Helpers (`packages/builder-server/src/utils/updateStatus.js`)

- `getUpdateStatus(currentVersion, availableVersion)`: Builds a richer update-status object on top of semver utilities.
- `hasAvailableUpdate(currentVersion, availableVersion)`: Lightweight boolean check used by project/theme update listing paths.

### Theme Update Service (`packages/builder-server/src/services/themeUpdateService.js`)

This service applies theme updates **to projects**. It is summarized here; see [Theme Updates](theme-updates.md) for the authoritative walkthrough.

**Updatable paths** (`UPDATABLE_PATHS` — replaced wholesale from the theme source on update):

- `layout.liquid`
- `assets/`
- `widgets/`
- `snippets/`
- `locales/`
- `screenshot.png`
- `collection-types/` (theme-owned; replaced wholesale)

**Add-new-only paths** (new entries added, existing user content preserved):

- `menus/`
- `templates/` (added into the project as pages)

**Protected** — user content that is never touched by an update, e.g. `pages/`, `uploads/`, and `collections/` (user item data). Note `collection-types/` (theme-owned schemas) is updatable, while `collections/` (user data) is protected.

- `mergeThemeSettings(userThemeJson, newThemeJson)`: merges `theme.json` settings using the new schema as the structural source of truth while preserving user-edited values, adding new settings, and dropping settings the theme author removed.
- `applyThemeUpdate(projectId)`: copies updatable paths, adds new menus/templates, merges `theme.json`, updates project metadata (`themeVersion`, `lastThemeUpdateAt`, `lastThemeUpdateVersion`), and refreshes media-usage tracking for the project after the structural change.

## 4. Sidebar Badge

The sidebar displays a badge next to "Themes" showing the count of themes with pending updates.

### Implementation

- **Store**: `packages/editor-ui/src/stores/themeUpdateStore.js` (Zustand)
- **Component**: `packages/editor-ui/src/components/layout/Sidebar.jsx`
- **API**: `GET /api/themes/update-count`

### Behavior

- Badge shows count of themes where `hasPendingUpdate: true`.
- Updates automatically when the user updates a theme, or when the page loads/refreshes.
- Hidden when count is 0.

## 5. Theme Locales and Site Icon Markup

- Theme locale infrastructure remains supported (`locales/`, `tTheme:` keys, snippet/widget resolution), but the current shipped app + Arch theme are trimmed to English-only locale files for now.
- Existing projects read theme locale strings from their copied `data/projects/<folder>/locales/` files (served via `GET /api/themes/project/:projectId/locales/:lang`). The installed theme copy in `data/themes/` is the source for new project creation and Apply Theme Update, not the live locale source for already-created projects.
- Arch's site-icon head markup lives in `themes/arch/snippets/site-icons.liquid`, rendered from `layout.liquid`.
- The visible setting label is **Site Icon**, but the underlying theme setting key remains `favicon` for compatibility with stored theme settings and existing Liquid access patterns.

## Security Considerations

All API endpoints described in this document are protected by input validation and CORS policies. For details, see [Platform Security](core-security.md).

---

**See also:**

- [Theme Updates](theme-updates.md) — Detailed theme update/versioning system (snapshot build, apply-to-project flow).
- [Theme Presets](theme-presets.md) — Preset variants for themes (settings, templates, menus, collections, media overrides).
- [Theming Guide](theming.md) — How to author themes (structure, settings, widgets).
- [Widget Authoring Guide](theming-widgets.md) — Creating widgets for themes.
- [Project Management](core-projects.md) — How themes are copied to projects on creation.
- [Core Packages](core-packages.md) — Adapter contracts, DI, `Scope`, and the scope-first storage rule.
