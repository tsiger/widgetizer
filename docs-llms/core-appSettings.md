# App Settings (`app/src/pages/AppSettings.jsx`)

## Overview

The **App Settings** page manages global configuration that applies across the entire application rather than to a single project. These are system-level settings that control application behavior — for example the maximum upload size for the media manager and the image-processing configuration. The system is **schema-driven** and completely isolated from the theme settings system.

App Settings lives in the admin shell at `/app-settings`, separate from the site workspace routes.

## Route Context

- `/app-settings` is rendered inside the admin shell (`ProjectPickerLayout`).
- The page is available even when there is no active project.
- When an active project exists, `AppSettings.jsx` also loads the current theme with `getTheme(activeProject.theme)` so the UI can react to theme-defined image sizes (see [Theme Override Behavior](#theme-override-behavior)).

## Current Settings

The setting catalog is defined declaratively in `packages/editor-ui/src/config/appSettings.schema.json`. Defaults below come from that schema and from the server-side `defaultSettings` in `packages/builder-server/src/db/repositories/settingsRepository.js` (the two are kept in sync).

### General Settings

- **Default Language** (`general.language`, default `en`): the UI language. The shipped UI exposes **English only**; the locale infrastructure remains in place for future re-expansion.
- **Date Format** (`general.dateFormat`, default `MMMM D, YYYY h:mm A`, e.g. `December 31, 2024 2:15 PM`): how dates are displayed throughout the platform.

### Media Settings

- **Maximum Image File Size** (`media.maxFileSizeMB`, default **50**, range 1–100): per-file upload size limit applied across all projects.
- **Image Quality** (`media.imageProcessing.quality`, default **85**, range 1–100): single quality setting applied to all generated image sizes during Sharp processing.
- **Image Sizes** (`media.imageProcessing.sizes.*`): each of `thumb` (150px), `small` (480px), `medium` (1024px), `large` (1920px) can be enabled/disabled and have its width customized.

Image-size generation, theme overrides, and the Sharp pipeline are documented in detail in [core-media.md](core-media.md).

#### Theme Override Behavior

When the active project's theme defines its own `imageSizes` in `theme.json`, the Image Sizes group is hidden in the App Settings UI and a notice is shown explaining that image sizes are managed by the theme. This logic is driven by a theme lookup in `AppSettings.jsx` (it passes `hiddenGroups`/`groupMessages` to `AppSettingsPanel`), not by the settings hook. If no active project exists, the global Image Sizes controls remain visible. See [core-media.md](core-media.md) for the full theme-override contract.

### Export Management Settings

- **Maximum Export Versions to Keep** (`export.maxVersionsToKeep`, default **10**, range 1–50): export versions retained per project; older exports are pruned when exceeded.
- **Maximum Project Import Size** (`export.maxImportSizeMB`, default **500**, range 10–2000): max size for project import ZIPs, enforced on both client and server.

Export versioning and import sizing are documented in [core-export.md](core-export.md).

### Developer Tools

- **Enable Developer Mode** (`developer.enabled`, default `false`): shows additional developer tools throughout the application and enables export-time HTML validation (generation of `__export__issues.html` during static site exports).

## Architecture Overview

The App Settings system uses a **schema-driven architecture** that is completely isolated from theme settings.

### Core Components

#### `AppSettings.jsx` (`app/src/pages/AppSettings.jsx`)

The main page component acts as an orchestrator:

- **Layout** — uses `PageLayout` for consistent page structure.
- **Loading / Error States** — renders a loading spinner and an error state from the hook.
- **Hook Integration** — uses the `useAppSettings` hook for all data management.
- **Theme Awareness** — optionally loads the active project's theme so it can hide app-level image-size controls when the theme owns that configuration.
- **Save / Cancel Actions** — provides save, reset, and cancel buttons with change tracking.
- **Navigation Guard** — calls `useGuardedFormPage(hasChanges)` to block accidental navigation away from unsaved changes and to render the pink dirty-dot in the page title via `getDirtyTitle`. App Settings is a stay-in-place page (no navigation after save), so it ignores the hook's `navigateSafely`. See [core-hooks.md](core-hooks.md).
- **Localization** — fully localized with `react-i18next`.

#### `AppSettingsPanel.jsx` (`app/src/components/settings/AppSettingsPanel.jsx`)

A dedicated component for rendering app settings:

- **Schema-Driven Rendering** — works directly with the JSON schema format (no conversion logic).
- **Tab Management** — automatic tab generation from schema configuration (`general`, `media`, `export`, `developer`).
- **Group Organization** — supports setting groups (e.g. `appSettings.groups.imageSizes`) with visual separators, and accepts `hiddenGroups` / `groupMessages` for the theme-override notice.
- **Localization** — tab labels, section titles, and all text are translated via translation keys.

#### `useAppSettings.js` Hook (`packages/editor-ui/src/hooks/useAppSettings.js`)

Centralized state management for app settings:

- **State Management** — settings data, loading states, and change tracking (compares against the originally loaded values).
- **Schema Integration** — loads settings, then merges with schema defaults via dot-notation paths (`mergeWithDefaults`).
- **Nested Object Support** — get/set nested values using dot notation (e.g. `media.imageProcessing.quality`).
- **Type Conversion** — `processSettingsForSave` coerces `number`-typed fields before persisting.
- **Save / Cancel Logic** — persists via the settings query manager, updates the in-module cache, and (if the language changed) calls `i18n.changeLanguage`.

### Schema-Driven Configuration

The schema (`packages/editor-ui/src/config/appSettings.schema.json`) defines:

- **`tabs`** — tab keys, labels, and descriptions (translation keys).
- **`settings`** — per-setting `tab`, `type` (`select`, `number`, `checkbox`, …), `label`, `description`, `default`, validation bounds (`min`/`max`), `options`, and optional `group`.

Adding a new setting is a schema edit plus, where it must be enforced, server-side validation in `appSettingsController.js`.

## How App Settings Are Used

Unlike theme settings (consumed primarily by the frontend via a global store), App Settings are mainly used by the **backend** to control system-level behavior. Settings are persisted in SQLite and merged with defaults on read.

### Persistence and Read Path

- **Routes** — `packages/builder-server/src/routes/appSettings.js` exposes `GET /api/settings` and `PUT /api/settings`, mounted under the actor-scoped router in `setupBuilderServer.js`.
- **Controller** — `packages/builder-server/src/controllers/appSettingsController.js` (`getAppSettings`, `updateAppSettings`, and the internal `getSetting(key)` used by other controllers). `updateAppSettings` validates media size limits and image-processing bounds before saving.
- **Repository** — `packages/builder-server/src/db/repositories/settingsRepository.js` reads/writes the SQLite-backed settings store and deep-merges with `defaultSettings`.

### File Upload Size Enforcement (two-stage)

Uploads go to the **active-project-scoped** route `POST /api/media/` (mounted via `/media` on the project-scoped router). The active project is resolved from the `X-Project-Id` header into `req.scope` by the `resolveActiveProject` middleware — the project id stays out of the path. Two independent checks enforce the size cap:

1. **Streaming multer cap (SA-02)** — the `uploadWithLimit` middleware (`mediaController.js`) reads the per-file byte cap from the injected limits adapter (`req.adapters.limits.getLimit(req.scope, LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES)`) and applies it as a multer `limits.fileSize`, so an oversize part is rejected (413) **before** the whole file is buffered into memory. A platform fallback (`DEFAULT_MAX_UPLOAD_BYTES`, 10 MB) is used when no limits adapter is wired.
2. **Controller comparison** — `uploadProjectMedia` then reads `media.maxFileSizeMB` via `getSetting(...)` and compares each file's size against it, returning a per-file failure reason for anything over the configured limit.

In OSS these two values agree: the `LocalLimitsAdapter` returns the same configured max that the controller check enforces. The scope-first call shape (`{ actor, projectId, folderName }`) and the limits-adapter / `LIMIT_KEYS` contract are documented in [core-packages.md](core-packages.md).

### Image Processing Configuration

When processing an upload, the media controller calls `getImageProcessingSettings(projectId)` to load the current quality and enabled sizes (with theme overrides applied), then generates only the enabled sizes at their configured widths. Changes take effect on the next upload with no restart. The Sharp pipeline, size-generation fallbacks, and theme-override resolution live in [core-media.md](core-media.md).

## Security Considerations

API endpoints are protected by input validation and CORS policies. File-size and image-dimension safety limits are enforced inline in the relevant upload handlers (`mediaController`, `themeController`, `projectController`) using values from app settings, plus the adapter-sourced streaming cap above. See [core-security.md](core-security.md) for the platform security model and [core-packages.md](core-packages.md) for the scope / limits-adapter contract.
