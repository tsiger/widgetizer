# Themes

This document explains the "Themes" management page, which is the user interface for viewing, uploading, and updating themes. In the application's architecture, a "Theme" is the core concept for styling and layout.

## 1. Overview

Themes are structured directories that define the layout, styles, and functionality of the application. Runtime theme operations are user-scoped under `data/users/{userId}/themes/`. In packaged Electron builds, default themes are seeded from `app.asar.unpacked/themes/` into each user's themes directory on first access. Each theme contains:

- `theme.json`: Theme metadata and configuration.
- `screenshot.png`: A 1280x720 preview image of the theme, displayed on the card in the Themes UI.

### Theme Version Structure

Themes support versioning for updates. A theme directory can have the following structure:

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
    updates/            # Version update folders
      1.1.0/            # Partial update (only changed files)
        theme.json      # Must match folder version
        widgets/
          new-widget/
      1.2.0/
        theme.json
        assets/
          updated-styles.css
    latest/             # Materialized snapshot (built by system)
      theme.json        # Version matches newest update
      layout.liquid
      widgets/
      ...
    presets/             # Optional preset variants
      presets.json       # Preset registry (names, descriptions, default)
      warm/
        preset.json      # Settings overrides (colors, fonts, etc.)
        screenshot.png   # Preset preview image
      hotel/
        preset.json      # Settings overrides
        screenshot.png
        templates/       # Optional custom page templates
          index.json
          global/
            header.json
            footer.json
        menus/           # Optional custom navigation
          main-menu.json
          footer-menu.json
```

The `latest/` folder is automatically built by composing the base version with all updates in version order.

The `presets/` directory is optional. When present, it provides named variants of the theme that can override settings, templates, and/or menus. Presets are only used at project creation time. See the [Theme Presets](theme-presets.md) spec for full details.

## 2. Frontend Implementation (`src/pages/Themes.jsx`)

The frontend component provides a clean interface for theme management.

### Key Features

- **Theme Grid**: Displays all available themes in a responsive grid layout.
- **Upload Functionality**: Drag-and-drop interface for uploading new theme ZIP files.
- **Active Theme Indicator**: Visual indication of which theme is currently active for the project.
- **Update Indicators**: Shows when themes have pending updates available.
- **Per-Theme Update Buttons**: Allows updating individual themes.
- **Theme Deletion**: Three-dot menu on each card with "Delete"; confirmation dialog; deletion blocked with 409 + error toast when theme is used by any project.
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

### Theme Update Flow

When a theme has pending updates (`hasPendingUpdate: true`):

1. The theme card displays "Update available: vX.Y.Z" message
2. User clicks the "Update" button on the theme card
3. System calls `buildLatestSnapshot()` to compose the `latest/` folder
4. Theme card updates to show the new version
5. Sidebar badge decrements (via `themeUpdateStore`)
6. Projects using this theme now show "Update available" indicator

### State Management

The component manages local state for:

- `themes`: Array of available themes (including `hasPendingUpdate` and `themeName`)
- `loading`: Loading state for initial theme fetch
- `updatingThemeId`: Which theme is currently being updated
- Upload status and progress

**Global State:**

- `useThemeUpdateStore`: Zustand store for sidebar badge count
  - `updateCount`: Number of themes with pending updates
  - `fetchUpdateCount()`: Refreshes the count from API

### Upload Process

When a user uploads a ZIP file:

1. The file is validated on the client side
2. Uploaded via `uploadThemeZip()` utility function
3. Server processes and extracts the theme
4. Local state updates to show the new theme immediately
5. Success/error feedback via toast notifications

## 3. Backend Implementation

The backend handles the logic for listing themes, processing uploads, and managing theme updates.

### API Routes (`server/routes/themes.js`)

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
| `GET` | `/api/themes/project/:projectId` |  | `getProjectThemeSettings` | Gets a project's `theme.json` settings. |
| `POST` | `/api/themes/project/:projectId` |  | `saveProjectThemeSettings` | Saves a project's `theme.json` settings. |
| `POST` | `/api/themes/upload` | `handleThemeUpload` | `uploadTheme` | Handles upload and extraction of a theme ZIP (new theme or updates). |
| `DELETE` | `/api/themes/:id` |  | `deleteTheme` | Deletes a theme. Returns 409 if theme is used by any project. |

### Controller Logic (`server/controllers/themeController.js`)

#### Theme Listing

- `getAllThemes`: Returns all themes with enriched metadata:
  - `id`: Theme folder name
  - `name`: Human-readable name from `theme.json`
  - `version`: Current source version (from `latest/` or base)
  - `author`, `description`, `widgets`: Standard metadata
  - `presets`: Number of presets available (from `presets/presets.json`, 0 if none)
  - `hasPendingUpdate`: Boolean indicating if newer versions exist in `updates/`
  - `latestAvailableVersion`: Newest version available in `updates/`

#### Theme Upload

- `uploadTheme`: Validates and installs new theme ZIPs with comprehensive checks:
  - Validates ZIP structure and required files
  - Ensures `theme.json`, `layout.liquid`, `screenshot.png` exist
  - Verifies `assets/`, `templates/`, `widgets/` directories
  - Supports importing new update versions for existing themes when base versions match

#### Theme Deletion

- `deleteTheme`: Removes the theme directory from the filesystem. Before deletion, checks if any project metadata row in SQLite references this theme; if so, returns 409 with message that the theme is in use. On success, returns 200 with success message.

#### Theme Presets

- `getThemePresets(req, res)`: Reads `presets/presets.json` for a theme and returns the list of presets, enriched with `isDefault` and `hasScreenshot` flags. Returns an empty array for themes without presets or a 404 for nonexistent themes.

- `resolvePresetPaths(themeId, presetId)`: Returns `{ templatesDir, menusDir, settingsOverrides }` with fallback logic:
  - **Templates**: Uses `presets/{id}/templates/` if it exists, otherwise falls back to root `templates/`
  - **Menus**: Uses `presets/{id}/menus/` if it exists, otherwise `null` (meaning keep the root menus already copied)
  - **Settings**: Reads `presets/{id}/preset.json` for a flat map of `{ setting_id: value }` overrides

  This helper is called by `projectController.createProject()` during project creation to resolve which templates, menus, and settings to use for the selected preset.

#### Theme Updates

- `buildLatestSnapshot(themeId)`: Composes the `latest/` folder by:
  1. Starting from base version (root `theme.json`)
  2. Sorting all version folders in `updates/` by semver
  3. **Validating each version folder**:
     - Must contain `theme.json`
     - `theme.json` version must match folder name
  4. Layering files from each version in order (last wins)
  5. Excluding `presets/` directory from the snapshot
  6. Writing composed result to `latest/`

- `getThemeSourceDir(themeId)`: Returns the path to use for reading theme files:
  - Returns `latest/` if it exists
  - Otherwise returns base theme directory

- `themeHasPendingUpdates(themeId)`: Checks if newest version in `updates/` is newer than current source version.

### Version Utilities (`server/utils/semver.js`)

- `parseVersion(str)`: Parses "x.y.z" into `{ major, minor, patch }`
- `isValidVersion(str)`: Validates semver format
- `compareVersions(a, b)`: Numeric comparison for sorting
- `sortVersions(versions)`: Sorts version strings ascending
- `getLatestVersion(versions)`: Returns highest version
- `isNewerVersion(current, candidate)`: Checks if candidate > current

### Theme Update Service (`server/services/themeUpdateService.js`)

Handles applying theme updates to projects:

#### Update Eligibility

**Updatable paths** (copied from theme to project):

- `layout.liquid`
- `assets/`
- `widgets/`
- `snippets/`
- `theme.json` (merged, not replaced)
- `screenshot.png`

**Protected paths** (never modified):

- `pages/`
- `uploads/`
- `collections/` (if present)

**Add-new-only paths**:

- `menus/`: New menus added, existing preserved
- `templates/`: New templates added, existing preserved

#### Theme Settings Merge

`mergeThemeSettings(userThemeJson, newThemeJson)`:

- **Adds** new settings that appear in newer version
- **Preserves** user-edited values for existing settings
- **Removes** settings deleted by theme author
- Handles nested settings objects and arrays

#### Project Update Flow

`applyThemeUpdate(projectId)`:

1. Checks for available updates
2. Copies updatable files from theme's source directory
3. Merges `theme.json` settings
4. Adds new menus (preserves existing)
5. Adds new templates (preserves existing)
6. Updates project's `themeVersion` metadata

## 4. Sidebar Badge

The sidebar displays a badge next to "Themes" showing the count of themes with pending updates.

### Implementation

- **Store**: `src/stores/themeUpdateStore.js` (Zustand)
- **Component**: `src/components/layout/Sidebar.jsx`
- **API**: `GET /api/themes/update-count`

### Behavior

- Badge shows count of themes where `hasPendingUpdate: true`
- Updates automatically when:
  - User updates a theme
  - Page loads/refreshes
- Hidden when count is 0

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Theme Updates](theme-updates.md) - Detailed theme update system documentation
- [Theme Presets](theme-presets.md) - Preset variants for themes (settings, templates, menus overrides)
- [Theming Guide](theming.md) - How to author themes (structure, settings, widgets)
- [Widget Authoring Guide](theming-widgets.md) - Creating widgets for themes
- [Project Management](core-projects.md) - How themes are copied to projects on creation
